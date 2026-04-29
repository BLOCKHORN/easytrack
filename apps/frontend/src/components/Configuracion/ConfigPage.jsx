'use strict';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { getTenantData } from '../../utils/tenant';
import Toast from '../../components/UI/Toast';

import IdentityCard from './IdentityCard';
import Ubicaciones from './Ubicaciones';
import CarriersCard from './CarriersCard';
import Skeleton from './Skeleton';
import AccountSettings, { applyEmailDraft, applyPasswordDraft } from './AccountSettings';
import PinCard from './PinCard';
import ImportWizard from './ImportWizard';

import { guardarCarriers } from '../../services/configuracionService';
import { cargarUbicaciones, guardarUbicaciones } from '../../services/ubicacionesService';

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

const IconSettings = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;

const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rowsFromCount = (n) => Array.from({ length: Math.min(parseInt(n || 0, 10) || 0, 5000) }, (_, i) => ({ label: `B${i + 1}`, codigo: `B${i + 1}`, orden: i }));

const sanitizeUbicaciones = (rows = []) => rows.map((r, i) => ({
  label: String(r?.label || `B${i + 1}`).toUpperCase(),
  codigo: String(r?.codigo || r?.label || `B${i + 1}`).toUpperCase(),
  orden: Number.isFinite(r?.orden) ? r.orden : i
}));

export default function ConfigPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  
  const [ubiRows, setUbiRows] = useState([]);
  const [ubiMeta, setUbiMeta] = useState({ cols: 5, rows: 5 });
  const [usageByCodigo, setUsageByCodigo] = useState({});
  const [empresas, setEmpresas] = useState([]);
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  
  const [accountDraft, setAccountDraft] = useState(null);
  const [toast, setToast] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const pendingDeletionsRef = useRef([]);
  const forceDeleteRef = useRef(false);

  const mostrarToast = (mensaje, tipo = 'success') => setToast({ mensaje, tipo });
  const deepPack = () => ({ nombre, ubiRows, ubiMeta, empresas });

  const revertirCambios = () => {
    if (!snapshot) return;
    setNombre(snapshot.nombre); setUbiRows(snapshot.ubiRows); setUbiMeta(snapshot.ubiMeta); setEmpresas(snapshot.empresas);
    setDirty(false); setAccountDraft(null); pendingDeletionsRef.current = []; forceDeleteRef.current = false;
    setResetKey(k => k + 1); 
    mostrarToast('Cambios revertidos.');
  };

  const loadUbicacionesForTenant = async (tId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await cargarUbicaciones(session?.access_token, tId);
      const arr = Array.isArray(resp?.ubicaciones) ? resp.ubicaciones : [];
      setUbiRows(arr.length ? sanitizeUbicaciones(arr) : rowsFromCount(25));
      
      const numCols = parseInt(resp?.meta?.cols || 5, 10);
      let numRows = parseInt(resp?.meta?.rows, 10);
      if (Number.isNaN(numRows) || numRows < 1) {
        let maxIdx = -1;
        arr.forEach(u => { if (u.orden > maxIdx) maxIdx = u.orden; });
        numRows = Math.max(5, Math.ceil((maxIdx + 1) / numCols));
      }

      setUbiMeta({ cols: numCols, rows: numRows });
    } catch {
      setUbiRows(rowsFromCount(25));
    }
  };

  const loadUsageData = async (tId) => {
    const { data } = await supabase.from('packages').select('ubicacion_label').eq('tenant_id', tId).eq('entregado', false).not('ubicacion_label', 'is', null);
    const map = {};
    (data || []).forEach(r => { const c = String(r.ubicacion_label).toUpperCase(); map[c] = (map[c] || 0) + 1; });
    setUsageByCodigo(map);
  };

useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) return setCargando(false);
        setUsuario(user);

        const { tenant: ensuredTenant } = await getTenantData();
        setTenant(ensuredTenant);
        setNombre(ensuredTenant.nombre_empresa || '');

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const respCarriers = await fetch(`${API_BASE}/api/ubicaciones/carriers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // SOLO SE LEE UNA VEZ EL JSON
        if (respCarriers.ok) {
          const jsonCarriers = await respCarriers.json();
          setEmpresas((jsonCarriers.empresas || []).map(e => ({ 
            ...e, 
            ingreso_por_entrega: Number.isFinite(Number(e.ingreso_por_entrega)) ? Number(e.ingreso_por_entrega) : 0 
          })));
          setEmpresasDisponibles(jsonCarriers.disponibles || []);
        } else {
          setEmpresas([]);
          setEmpresasDisponibles([]);
        }

        // Ahora sí llegará hasta aquí y cargará el lienzo de cajas
        await Promise.all([
          loadUbicacionesForTenant(ensuredTenant.id), 
          loadUsageData(ensuredTenant.id)
        ]);
      } catch (err) {
        mostrarToast('Error cargando configuración.', 'error');
      } finally { 
        setCargando(false); 
      }
    })();
  }, []);

  useEffect(() => {
    if (cargando) return;
    setSnapshot({ nombre, ubiRows, ubiMeta, empresas });
  }, [cargando]);

  useEffect(() => {
    if (!snapshot) return;
    setDirty(!sameJSON(deepPack(), snapshot));
  }, [nombre, ubiRows, ubiMeta, empresas, snapshot]);

  const handleUbicacionesChange = useCallback(({ ubicaciones, meta, deletions, forceDeletePackages }) => {
    setUbiRows(ubicaciones);
    setUbiMeta(prev => ({ ...prev, cols: meta.cols, rows: meta.rows })); 
    pendingDeletionsRef.current = deletions;
    forceDeleteRef.current = forceDeletePackages;
  }, []);

  const handleGuardar = async () => {
    if (!dirty && !accountDraft) return navigate('/dashboard');
    if (dirty && !nombre.trim()) return mostrarToast('Nombre obligatorio.', 'error');

    setGuardando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (dirty) {
        await fetch(`${API_BASE}/api/tenants/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ nombre_empresa: nombre.trim() })
        });

        await guardarUbicaciones({
          tenantId: tenant.id,
          ubicaciones: sanitizeUbicaciones(ubiRows),
          meta: { cols: ubiMeta.cols, rows: ubiMeta.rows },
          deletions: pendingDeletionsRef.current,
          forceDeletePackages: forceDeleteRef.current
        }, token);

        const carriersToSave = empresas.filter(e => String(e.nombre).trim() !== '').map(e => ({
          nombre: String(e.nombre).trim(),
          ingreso_por_entrega: parseFloat(e.ingreso_por_entrega) || 0,
          color: e.color || null,
          activo: e.activo ?? true
        }));
        
        await guardarCarriers(carriersToSave, token, { sync: true });
      }

      if (accountDraft) {
        if (accountDraft.emailDraft) await applyEmailDraft({ currentEmail: usuario.email, nextEmail: accountDraft.emailDraft });
        if (accountDraft.pwd1) await applyPasswordDraft({ currentEmail: usuario.email, pwd1: accountDraft.pwd1, pwd2: accountDraft.pwd2 });
      }

      if (window.__AP_PAGE_CACHE) window.__AP_PAGE_CACHE.loaded = false;
      if (window.__SHELF_CACHE) window.__SHELF_CACHE.loaded = false;

      mostrarToast('Cambios guardados con éxito.');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      mostrarToast(err.message || 'Error al guardar configuración.', 'error');
    } finally { setGuardando(false); }
  };

  if (cargando) return <Skeleton />;

  return (
    <main className="max-w-4xl mx-auto pb-28 pt-8 px-4 font-sans">
      {toast && <Toast message={toast.mensaje} type={toast.tipo} onClose={() => setToast(null)} />}

      <header className="sticky top-0 z-40 bg-[#fafafa]/90 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 py-6 border-b border-zinc-200 mb-10">
        <div>
          <h1 className="text-3xl font-black text-zinc-950 tracking-tight flex items-center gap-3"><IconSettings /> Ajustes</h1>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <button onClick={revertirCambios} className="px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold text-sm uppercase tracking-widest rounded-xl transition-all">
              Deshacer
            </button>
          )}
          <button 
            onClick={handleGuardar}
            disabled={guardando || (!dirty && !accountDraft)}
            className="px-8 py-3 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-200 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-sm"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </header>

      <div className="space-y-12">
        <IdentityCard nombre={nombre} setNombre={setNombre} usuario={usuario} />
        
        <CarriersCard 
          empresas={empresas} 
          empresasDisponibles={empresasDisponibles} 
          setEmpresas={setEmpresas}
        />

        <Ubicaciones 
          key={`ubi-canvas-${resetKey}`}
          initial={ubiRows} 
          initialMeta={ubiMeta} 
          tenantId={tenant?.id}
          usageByCodigo={usageByCodigo}
          onToast={mostrarToast}
          onChange={handleUbicacionesChange}
        />

        <PinCard tenantId={tenant?.id} onToast={mostrarToast} />
        <AccountSettings usuario={usuario} onDraftChange={setAccountDraft} />
        <ImportWizard onToast={mostrarToast} onDone={() => loadUsageData(tenant.id)} />
      </div>
    </main>
  );
}