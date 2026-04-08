import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { ensureTenantResolved } from '../../utils/ensureTenant';
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

// ==========================================
// ICONOS CUSTOM
// ==========================================
const IconSettings = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;

/* ===== Helpers ===== */
const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rowsFromCount = (n) => Array.from({ length: clamp(parseInt(n || 0, 10) || 0, 0, 5000) }, (_, i) => ({ label: `B${i + 1}`, codigo: `B${i + 1}`, orden: i }));

const sanitizeUbicaciones = (rows = []) =>
  rows.map((r, i) => ({
    label: (r?.label || `B${i + 1}`).toUpperCase(),
    codigo: (r?.codigo || r?.label || `B${i + 1}`).toUpperCase(),
    orden: Number.isFinite(r?.orden) ? r.orden : i
  }));

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

export default function ConfigPage() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Ubicaciones
  const [ubiRows, setUbiRows] = useState([]);
  const [ubiMeta, setUbiMeta] = useState({ cols: 5, orden: 'horizontal' });
  const [ubiLoading, setUbiLoading] = useState(false);
  const [usageByCodigo, setUsageByCodigo] = useState({});

  // Carriers
  const [empresas, setEmpresas] = useState([]);
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  const carriersRef = useRef(null);

  // Borradores de Cuenta
  const [accountDraft, setAccountDraft] = useState(null);

  // Paquetes totales
  const [packagesCount, setPackagesCount] = useState(0);

  const [toast, setToast] = useState(null);
  const mostrarToast = (mensaje, tipo = 'success') => setToast({ mensaje, tipo });

  // Snapshot + dirty
  const [snapshot, setSnapshot] = useState(null);
  const [dirty, setDirty] = useState(false);

  const pendingDeletionsRef = useRef([]);
  const forceDeleteRef = useRef(false);

  const INGRESOS = useMemo(() => Array.from({ length: 20 }, (_, i) => ((i + 1) * 0.05).toFixed(2)), []);

  const deepPack = () => ({ nombre, ubiRows, ubiMeta, empresas });

  const revertirCambios = () => {
    if (!snapshot) return;
    setNombre(snapshot.nombre); setUbiRows(snapshot.ubiRows); setUbiMeta(snapshot.ubiMeta); setEmpresas(snapshot.empresas);
    setDirty(false); setAccountDraft(null); pendingDeletionsRef.current = []; forceDeleteRef.current = false;
    mostrarToast('Cambios revertidos.', 'success');
  };

  /* ---------- Estabilidad de scroll ---------- */
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    try { window.history.scrollRestoration = 'manual'; } catch {}
    return () => { try { window.history.scrollRestoration = prev || 'auto'; } catch {} };
  }, []);

  const loadUbicacionesForTenant = async (tId) => {
    setUbiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await cargarUbicaciones(session?.access_token, tId);
      const arr = Array.isArray(resp?.ubicaciones) ? resp.ubicaciones : [];
      setUbiRows(arr.length ? sanitizeUbicaciones(arr) : rowsFromCount(25));
      const metaResp = resp?.meta || {};
      setUbiMeta({ 
        cols: Math.max(1, Math.min(12, parseInt(metaResp.cols ?? 5, 10) || 5)), 
        orden: (metaResp.orden || metaResp.order) === 'vertical' ? 'vertical' : 'horizontal' 
      });
    } catch {
      setUbiRows(rowsFromCount(25)); setUbiMeta({ cols: 5, orden: 'horizontal' });
    } finally {
      setUbiLoading(false);
    }
  };

  const loadPackagesCount = async (forTenantId) => {
    const { count: a } = await supabase.from('packages').select('id', { count: 'exact' }).eq('tenant_id', forTenantId).eq('entregado', false);
    const { count: b } = await supabase.from('packages').select('id', { count: 'exact' }).eq('tenant_id', forTenantId).not('ubicacion_label', 'is', null);
    const { count: ab } = await supabase.from('packages').select('id', { count: 'exact' }).eq('tenant_id', forTenantId).eq('entregado', false).not('ubicacion_label', 'is', null);
    setPackagesCount((a || 0) + (b || 0) - (ab || 0));
  };

  const loadUsageByCodigo = async (forTenantId) => {
    const { data, error } = await supabase.from('packages').select('ubicacion_label').eq('tenant_id', forTenantId).not('ubicacion_label', 'is', null);
    if (error) return setUsageByCodigo({});
    const map = {};
    (data || []).forEach((row) => {
      const code = String(row?.ubicacion_label || '').toUpperCase();
      if (code) map[code] = (map[code] || 0) + 1;
    });
    setUsageByCodigo(map);
  };

  const fetchPackagesByLabels = async (tenantIdArg, labels = []) => {
    const tId = tenantIdArg || tenant?.id;
    if (!tId || !labels.length) return [];
    const { data, error } = await supabase.from('packages').select('id, nombre_cliente, ubicacion_label').eq('tenant_id', tId).not('ubicacion_label', 'is', null).in('ubicacion_label', labels.map(s => String(s).toUpperCase()));
    if (error) return [];
    return data || [];
  };

  const loadAll = async (forTenantId, cancelRef) => {
    const { data: tenantData } = await supabase.from('tenants').select('*').eq('id', forTenantId).maybeSingle();
    if (!cancelRef.current) {
      setTenant(tenantData || null); setNombre(tenantData?.nombre_empresa || '');
    }

    const { data: empresasData } = await supabase.from('empresas_transporte_tenant').select('*').eq('tenant_id', forTenantId);
    if (!cancelRef.current) {
      setEmpresas((empresasData || []).map(e => ({ ...e, ingreso_por_entrega: e.ingreso_por_entrega != null ? e.ingreso_por_entrega.toFixed(2) : '' })));
    }

    const { data: listaEmpresas } = await supabase.from('empresas_transporte').select('*').order('nombre', { ascending: true });
    if (!cancelRef.current) setEmpresasDisponibles(listaEmpresas || []);

    await Promise.all([loadUbicacionesForTenant(forTenantId), loadPackagesCount(forTenantId), loadUsageByCodigo(forTenantId)]);
  };

  // Carga inicial
  useEffect(() => {
    const cancelRef = { current: false };
    (async () => {
      try {
        const { data: userResp } = await supabase.auth.getUser();
        if (!userResp?.user) { if (!cancelRef.current) setCargando(false); return; }
        if (!cancelRef.current) setUsuario(userResp.user);

        const { tenant: ensuredTenant } = await ensureTenantResolved();
        if (!ensuredTenant?.id) throw new Error('TENANT_NOT_FOUND');

        await loadAll(ensuredTenant.id, cancelRef);
      } catch (err) {
        mostrarToast('No se pudieron cargar los datos.', 'error');
      } finally {
        if (!cancelRef.current) {
          setSnapshot(deepPack()); setDirty(false); setCargando(false);
        }
      }
    })();
    return () => { cancelRef.current = true; };
  }, []);

  // Dirty tracking
  useEffect(() => {
    if (!snapshot) return;
    setDirty(!sameJSON(deepPack(), snapshot));
  }, [nombre, ubiRows, ubiMeta, empresas, snapshot]);

  // Atajos guardar/revertir
  useEffect(() => {
    const onKey = (e) => {
      const key = e.key?.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 's') { e.preventDefault(); handleGuardar(); }
      if (key === 'escape' && (dirty || hasAccountPending) && snapshot) { e.preventDefault(); revertirCambios(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, snapshot]);

  /* ---------- Carriers helpers ---------- */
  const sanitizeCarriersLocal = () => {
    const trimmed = empresas.map(e => ({ ...e, nombre: (e.nombre || '').trim(), ingreso_por_entrega: e.ingreso_por_entrega === '' ? '' : ('' + e.ingreso_por_entrega).trim() }));
    const names = trimmed.map(e => e.nombre).filter(Boolean);
    const dupNames = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
    if (dupNames.length) {
      mostrarToast(`Empresas duplicadas: ${dupNames.join(', ')}`, 'error');
      carriersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    const invalidNumber = trimmed.find(e => e.ingreso_por_entrega !== '' && isNaN(parseFloat(e.ingreso_por_entrega)));
    if (invalidNumber) {
      mostrarToast(`Ingreso por entrega inválido en "${invalidNumber.nombre || '—'}".`, 'error');
      carriersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    return trimmed;
  };

  const buildCarriersPayload = () => {
    const sane = sanitizeCarriersLocal();
    if (!sane) return null;
    return sane.filter(e => e.nombre && e.ingreso_por_entrega !== '').map(e => ({
      nombre: e.nombre, ingreso_por_entrega: parseFloat(e.ingreso_por_entrega) || 0, color: e.color ?? null, activo: typeof e.activo === 'boolean' ? e.activo : true, notas: e.notas ?? null
    }));
  };

  const hasAccountPending = useMemo(() => {
    if (!accountDraft || !usuario) return false;
    const emailPending = accountDraft?.provider === 'email' && accountDraft?.emailDraft && accountDraft.emailDraft !== (usuario?.email || '') && isValidEmail(accountDraft.emailDraft);
    const passPending = accountDraft?.provider === 'email' && accountDraft?.pwd1 && accountDraft?.pwd2 && accountDraft.pwd1.length >= 8 && accountDraft.pwd1 === accountDraft.pwd2;
    return !!(emailPending || passPending);
  }, [accountDraft, usuario]);

  /* ---------- Guardar global ---------- */
  const handleGuardar = async () => {
    const carriersPayload = buildCarriersPayload();
    if (carriersPayload === null) return;
    if (!(dirty || hasAccountPending)) return navigate('/dashboard');
    if (dirty && !nombre.trim()) return mostrarToast('El nombre no puede estar vacío.', 'error');

    setGuardando(true);
    try {
      const tId = tenant?.id;
      if (!tId) throw new Error('Tenant no encontrado');

      let debugResp = null;
      if (dirty) {
        const { error: nameErr } = await supabase.rpc('update_tenant_name_secure', { p_tenant: tId, p_nombre: nombre.trim() });
        if (nameErr) throw nameErr;
        setTenant(prev => prev ? { ...prev, nombre_empresa: nombre.trim() } : prev);

        const { data: { session } } = await supabase.auth.getSession();
        const resp = await guardarUbicaciones(
          { tenantId: tId, ubicaciones: sanitizeUbicaciones(ubiRows), meta: { cols: ubiMeta.cols, order: ubiMeta.orden }, deletions: pendingDeletionsRef.current, forceDeletePackages: forceDeleteRef.current },
          session?.access_token
        );
        debugResp = resp?.debug || null;

        if (session?.access_token) await guardarCarriers(carriersPayload, session.access_token, { sync: true });

        pendingDeletionsRef.current = []; forceDeleteRef.current = false;
      }

      if (hasAccountPending && usuario) {
        if (accountDraft?.provider === 'email' && accountDraft?.emailDraft && accountDraft.emailDraft !== (usuario?.email || '') && isValidEmail(accountDraft.emailDraft)) {
          const r = await applyEmailDraft({ currentEmail: usuario?.email || '', nextEmail: accountDraft.emailDraft.trim() });
          if (r?.error) throw r.error;
          if (r?.notice) mostrarToast(r.notice, 'success');
          const { data } = await supabase.auth.getUser();
          setUsuario(data?.user || null);
        }
        if (accountDraft?.provider === 'email' && accountDraft?.pwd1 && accountDraft?.pwd2 && accountDraft.pwd1 === accountDraft.pwd2 && accountDraft.pwd1.length >= 8) {
          const r = await applyPasswordDraft({ currentEmail: (usuario?.email || '').trim(), pwd1: accountDraft.pwd1, pwd2: accountDraft.pwd2 });
          if (r?.error) throw r.error;
          if (r?.notice) mostrarToast(r.notice, 'success');
        }
        setAccountDraft(null);
      }

      setSnapshot(deepPack()); setDirty(false);
      
      if (debugResp && (debugResp.packagesDeleted > 0 || debugResp.archived > 0)) {
        const p = debugResp.packagesDeleted || 0; const u = debugResp.archived || 0;
        mostrarToast(`Guardado: ${u} ubicación archivada y ${p} paquete eliminado.`, 'success');
      } else {
        mostrarToast('Configuración guardada correctamente.', 'success');
      }

      if (tenant?.id) await Promise.all([loadPackagesCount(tenant.id), loadUsageByCodigo(tenant.id), loadUbicacionesForTenant(tenant.id)]);
      setTimeout(() => navigate('/dashboard'), 150);
    } catch (err) {
      mostrarToast(err?.error?.message || err?.message || 'Error al guardar la configuración.', 'error');
    } finally { setGuardando(false); }
  };

  if (cargando) return <Skeleton />;

  return (
    <main className="max-w-5xl mx-auto space-y-10 pb-28 pt-8 px-4 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.mensaje} type={toast.tipo} onClose={() => setToast(null)} />}

      <header className="sticky top-0 z-50 bg-zinc-50/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-b border-zinc-200/80 shadow-sm rounded-b-3xl -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-8">
        <div>
          <h1 className="text-3xl font-black text-zinc-950 tracking-tight flex items-center gap-3">
            <IconSettings /> Ajustes del Sistema
          </h1>
          <p className="text-zinc-500 font-medium mt-1">Configura la infraestructura, accesos e importaciones.</p>
        </div>
        <button 
          onClick={handleGuardar}
          disabled={guardando || (!dirty && !hasAccountPending)}
          className="px-8 py-3 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95"
        >
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <IdentityCard nombre={nombre} setNombre={setNombre} usuario={usuario} />
        
        {ubiLoading ? <Skeleton /> : (
          <Ubicaciones
            initial={ubiRows}
            initialMeta={ubiMeta}
            tenantId={tenant?.id}
            lockedCount={packagesCount}
            usageByCodigo={usageByCodigo}
            fetchPackagesByLabels={fetchPackagesByLabels}
            onChange={({ ubicaciones, meta, deletions, forceDeletePackages }) => {
              const sanitized = sanitizeUbicaciones(ubicaciones || []);
              setUbiRows(sanitized);
              setUbiMeta({ cols: Math.max(1, Math.min(12, parseInt(meta?.cols ?? ubiMeta.cols, 10) || ubiMeta.cols)), orden: (meta?.order || meta?.orden) === 'vertical' ? 'vertical' : 'horizontal' });
              pendingDeletionsRef.current = Array.isArray(deletions) ? deletions : [];
              forceDeleteRef.current = !!forceDeletePackages;
            }}
          />
        )}

        {/* CONTENEDOR IMPORT WIZARD */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 md:p-8">
          <ImportWizard
            onToast={(m,t) => setToast({ mensaje: m, tipo: t || 'success' })}
            onDone={() => { if (tenant?.id) { Promise.all([loadPackagesCount(tenant.id), loadUsageByCodigo(tenant.id)]).catch(()=>{}); } }}
          />
        </div>

        <div ref={carriersRef}>
          <CarriersCard
            empresas={empresas}
            empresasDisponibles={empresasDisponibles}
            INGRESOS={INGRESOS}
            añadirEmpresa={() => setEmpresas([...empresas, { nombre: '', ingreso_por_entrega: '' }])}
            actualizarEmpresa={(i,c,v) => setEmpresas(empresas.map((e, idx) => idx===i ? { ...e, [c]: v } : e))}
            eliminarEmpresa={(i) => { if (window.confirm('¿Eliminar esta empresa?')) setEmpresas(empresas.filter((_, idx) => idx !== i)); }}
          />
        </div>

        <PinCard tenantId={tenant?.id} onToast={(m,t) => setToast({ mensaje: m, tipo: t || 'success' })} />

        <AccountSettings usuario={usuario} onDraftChange={setAccountDraft} />
      </div>
    </main>
  );
}