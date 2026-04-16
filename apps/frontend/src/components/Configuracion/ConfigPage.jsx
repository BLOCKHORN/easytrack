'use strict';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
// ✅ Cambiado ensureTenantResolved por getTenantData
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

const IconSettings = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;

const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rowsFromCount = (n) => Array.from({ length: Math.min(parseInt(n || 0, 10) || 0, 5000) }, (_, i) => ({ label: `B${i + 1}`, codigo: `B${i + 1}`, orden: i }));

const sanitizeUbicaciones = (rows = []) => rows.map((r, i) => ({
  label: (r?.label || `B${i + 1}`).toUpperCase(),
  codigo: (r?.codigo || r?.label || `B${i + 1}`).toUpperCase(),
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
  const [ubiMeta, setUbiMeta] = useState({ cols: 5, orden: 'horizontal' });
  const [ubiLoading, setUbiLoading] = useState(false);
  const [usageByCodigo, setUsageByCodigo] = useState({});
  const [empresas, setEmpresas] = useState([]);
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  const [accountDraft, setAccountDraft] = useState(null);
  const [packagesCount, setPackagesCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [dirty, setDirty] = useState(false);
  const carriersRef = useRef(null);
  const pendingDeletionsRef = useRef([]);
  const forceDeleteRef = useRef(false);

  const mostrarToast = (mensaje, tipo = 'success') => setToast({ mensaje, tipo });
  const deepPack = () => ({ nombre, ubiRows, ubiMeta, empresas });

  const revertirCambios = () => {
    if (!snapshot) return;
    setNombre(snapshot.nombre); setUbiRows(snapshot.ubiRows); setUbiMeta(snapshot.ubiMeta); setEmpresas(snapshot.empresas);
    setDirty(false); setAccountDraft(null); pendingDeletionsRef.current = []; forceDeleteRef.current = false;
    mostrarToast('Cambios revertidos.');
  };

  const loadUbicacionesForTenant = async (tId) => {
    setUbiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await cargarUbicaciones(session?.access_token, tId);
      const arr = Array.isArray(resp?.ubicaciones) ? resp.ubicaciones : [];
      setUbiRows(arr.length ? sanitizeUbicaciones(arr) : rowsFromCount(25));
      setUbiMeta({ cols: parseInt(resp?.meta?.cols || 5, 10), orden: resp?.meta?.orden === 'vertical' ? 'vertical' : 'horizontal' });
    } catch {
      setUbiRows(rowsFromCount(25));
    } finally { setUbiLoading(false); }
  };

  const loadUsageData = async (tId) => {
    const { count: a } = await supabase.from('packages').select('id', { count: 'exact' }).eq('tenant_id', tId).eq('entregado', false);
    setPackagesCount(a || 0);
    const { data } = await supabase.from('packages').select('ubicacion_label').eq('tenant_id', tId).not('ubicacion_label', 'is', null);
    const map = {};
    (data || []).forEach(r => { const c = String(r.ubicacion_label).toUpperCase(); map[c] = (map[c] || 0) + 1; });
    setUsageByCodigo(map);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return setCargando(false);
        setUsuario(user);

        // ✅ Usando la nueva función unificada
        const { tenant: ensuredTenant } = await getTenantData();
        setTenant(ensuredTenant);
        setNombre(ensuredTenant.nombre_empresa || '');

        const { data: eData } = await supabase.from('empresas_transporte_tenant').select('*').eq('tenant_id', ensuredTenant.id);
        setEmpresas((eData || []).map(e => ({ ...e, ingreso_por_entrega: e.ingreso_por_entrega?.toFixed(2) || '' })));

        const { data: avail } = await supabase.from('empresas_transporte').select('*').order('nombre');
        setEmpresasDisponibles(avail || []);

        await Promise.all([loadUbicacionesForTenant(ensuredTenant.id), loadUsageData(ensuredTenant.id)]);
        setSnapshot({ nombre: ensuredTenant.nombre_empresa || '', ubiRows: ubiRows, ubiMeta: ubiMeta, empresas: eData || [] });
      } catch (err) {
        mostrarToast('Error cargando configuración.', 'error');
      } finally { setCargando(false); }
    })();
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    setDirty(!sameJSON(deepPack(), snapshot));
  }, [nombre, ubiRows, ubiMeta, empresas, snapshot]);

  const handleGuardar = async () => {
    if (!dirty && !accountDraft) return navigate('/dashboard');
    if (dirty && !nombre.trim()) return mostrarToast('Nombre obligatorio.', 'error');

    setGuardando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (dirty) {
        // Actualizar Nombre vía Backend
        await fetch(`${API_BASE}/api/tenants/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ nombre_empresa: nombre.trim() })
        });

        // Ubicaciones
        await guardarUbicaciones({
          tenantId: tenant.id,
          ubicaciones: sanitizeUbicaciones(ubiRows),
          meta: { cols: ubiMeta.cols, order: ubiMeta.orden },
          deletions: pendingDeletionsRef.current,
          forceDeletePackages: forceDeleteRef.current
        }, token);

        // Carriers
        const carriers = empresas.filter(e => e.nombre).map(e => ({
          nombre: e.nombre,
          ingreso_por_entrega: parseFloat(e.ingreso_por_entrega) || 0,
          color: e.color || null,
          activo: e.activo ?? true
        }));
        await guardarCarriers(carriers, token, { sync: true });
      }

      if (accountDraft) {
        if (accountDraft.emailDraft) await applyEmailDraft({ currentEmail: usuario.email, nextEmail: accountDraft.emailDraft });
        if (accountDraft.pwd1) await applyPasswordDraft({ currentEmail: usuario.email, pwd1: accountDraft.pwd1, pwd2: accountDraft.pwd2 });
      }

      mostrarToast('Cambios guardados.');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      mostrarToast(err.message || 'Error al guardar.', 'error');
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
        <button 
          onClick={handleGuardar}
          disabled={guardando || (!dirty && !accountDraft)}
          className="px-8 py-3 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-200 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </header>

      <div className="space-y-12">
        <IdentityCard nombre={nombre} setNombre={setNombre} usuario={usuario} />
        
        <CarriersCard 
          empresas={empresas} 
          empresasDisponibles={empresasDisponibles} 
          añadirEmpresa={() => setEmpresas([...empresas, { nombre: '', ingreso_por_entrega: '' }])}
          actualizarEmpresa={(i,k,v) => setEmpresas(empresas.map((e,idx) => idx===i ? {...e,[k]:v} : e))}
          eliminarEmpresa={(i) => setEmpresas(empresas.filter((_,idx) => idx!==i))}
        />

        <Ubicaciones 
          initial={ubiRows} 
          initialMeta={ubiMeta} 
          tenantId={tenant?.id}
          usageByCodigo={usageByCodigo}
          onChange={({ ubicaciones, meta, deletions, forceDeletePackages }) => {
            setUbiRows(ubicaciones);
            setUbiMeta(meta);
            pendingDeletionsRef.current = deletions;
            forceDeleteRef.current = forceDeletePackages;
          }}
        />

        <PinCard tenantId={tenant?.id} onToast={mostrarToast} />
        <AccountSettings usuario={usuario} onDraftChange={setAccountDraft} />
        <ImportWizard onToast={mostrarToast} onDone={() => loadUsageData(tenant.id)} />
      </div>
    </main>
  );
}