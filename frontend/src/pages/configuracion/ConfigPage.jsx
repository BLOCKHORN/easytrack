// src/pages/config/ConfigPage.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { ensureTenantResolved } from '../../utils/ensureTenant';
import Toast from '../../components/Toast';

import Hero from './Hero';
import IdentityCard from './IdentityCard';
import Ubicaciones from './Ubicaciones';
import CarriersCard from './CarriersCard';
import Skeleton from './Skeleton';
import AccountSettings, { applyEmailDraft, applyPasswordDraft } from './AccountSettings';
import PinCard from './PinCard'; // <<< PIN
import ImportWizard from './ImportWizard'; // <<< NUEVO

import ConfigLayout from './ConfigLayout';
import './ConfigBase.scss';

import { MdTune, MdLocalShipping, MdPerson } from 'react-icons/md';
import { guardarCarriers } from '../../services/configuracionService';
import { cargarUbicaciones, guardarUbicaciones } from '../../services/ubicacionesService';

/* ===== Helpers ===== */
const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rowsFromCount = (n) =>
  Array.from({ length: clamp(parseInt(n || 0, 10) || 0, 0, 5000) }, (_, i) => {
    const label = `B${i + 1}`;
    return { label, codigo: label, orden: i };
  });

const sanitizeUbicaciones = (rows = []) =>
  rows.map((r, i) => {
    const label = (r?.label || `B${i + 1}`).toUpperCase();
    return {
      label,
      codigo: (r?.codigo || r?.label || `B${i + 1}`).toUpperCase(),
      orden: Number.isFinite(r?.orden) ? r.orden : i
    };
  });

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

  // Mapa de uso por código (B1..Bn) => nº paquetes
  const [usageByCodigo, setUsageByCodigo] = useState({});

  // Carriers
  const [empresas, setEmpresas] = useState([]);
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  const carriersRef = useRef(null);

  // Borradores de Cuenta
  const [accountDraft, setAccountDraft] = useState(null);

  // Paquetes totales (solo informativo)
  const [packagesCount, setPackagesCount] = useState(0);

  const [toast, setToast] = useState(null);
  const mostrarToast = (mensaje, tipo = 'success') => setToast({ mensaje, tipo });

  // Snapshot + dirty
  const [snapshot, setSnapshot] = useState(null);
  const [dirty, setDirty] = useState(false);

  // Refs para borrados solicitados desde Ubicaciones
  const pendingDeletionsRef = useRef([]);
  const forceDeleteRef = useRef(false);

  const INGRESOS = useMemo(
    () => Array.from({ length: 20 }, (_, i) => ((i + 1) * 0.05).toFixed(2)),
    []
  );

  const deepPack = () => ({ nombre, ubiRows, ubiMeta, empresas });

  const revertirCambios = () => {
    if (!snapshot) return;
    setNombre(snapshot.nombre);
    setUbiRows(snapshot.ubiRows);
    setUbiMeta(snapshot.ubiMeta);
    setEmpresas(snapshot.empresas);
    setDirty(false);
    setAccountDraft(null);
    pendingDeletionsRef.current = [];
    forceDeleteRef.current = false;
    mostrarToast('Cambios revertidos.', 'success');
  };

  /* ---------- Estabilidad de scroll ---------- */
  useEffect(() => {
    // Evita que el navegador “recoloque” el scroll en cambios de hash o navegación
    const prev = window.history.scrollRestoration;
    try { window.history.scrollRestoration = 'manual'; } catch {}
    return () => { try { window.history.scrollRestoration = prev || 'auto'; } catch {} };
  }, []);

  const loadUbicacionesForTenant = async (tId) => {
    setUbiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await cargarUbicaciones(token, tId);

      const arr = Array.isArray(resp?.ubicaciones) ? resp.ubicaciones : [];
      const rows = arr.length ? sanitizeUbicaciones(arr) : rowsFromCount(25);
      setUbiRows(rows);

      const metaResp = resp?.meta || {};
      const cols = Math.max(1, Math.min(12, parseInt(metaResp.cols ?? 5, 10) || 5));
      const orden = (metaResp.orden || metaResp.order) === 'vertical' ? 'vertical' : 'horizontal';
      setUbiMeta({ cols, orden });
    } catch {
      setUbiRows(rowsFromCount(25));
      setUbiMeta({ cols: 5, orden: 'horizontal' });
    } finally {
      setUbiLoading(false);
    }
  };

  // ==== Contadores y usos ====
  const loadPackagesCount = async (forTenantId) => {
    const { count: a, error: errA } = await supabase
      .from('packages')
      .select('id', { count: 'exact' })
      .eq('tenant_id', forTenantId)
      .eq('entregado', false);

    const { count: b, error: errB } = await supabase
      .from('packages')
      .select('id', { count: 'exact' })
      .eq('tenant_id', forTenantId)
      .not('ubicacion_label', 'is', null);

    const { count: ab, error: errAB } = await supabase
      .from('packages')
      .select('id', { count: 'exact' })
      .eq('tenant_id', forTenantId)
      .eq('entregado', false)
      .not('ubicacion_label', 'is', null);

    if (errA || errB || errAB) {
      console.warn('[ConfigPage] loadPackagesCount errors:', errA || errB || errAB);
      return;
    }
    const unionCount = (a || 0) + (b || 0) - (ab || 0);
    setPackagesCount(unionCount);
  };

  const loadUsageByCodigo = async (forTenantId) => {
    const { data, error } = await supabase
      .from('packages')
      .select('ubicacion_label')
      .eq('tenant_id', forTenantId)
      .not('ubicacion_label', 'is', null);

    if (error) {
      console.warn('[ConfigPage] loadUsageByCodigo error:', error);
      setUsageByCodigo({});
      return;
    }

    const map = {};
    (data || []).forEach((row) => {
      const code = String(row?.ubicacion_label || '').toUpperCase();
      if (!code) return;
      map[code] = (map[code] || 0) + 1;
    });
    setUsageByCodigo(map);
  };

  const fetchPackagesByLabels = async (tenantIdArg, labels = []) => {
    const tId = tenantIdArg || tenant?.id;
    if (!tId || !labels.length) return [];
    const labelSet = labels.map((s) => String(s).toUpperCase());

    const { data, error } = await supabase
      .from('packages')
      .select('id, nombre_cliente, ubicacion_label')
      .eq('tenant_id', tId)
      .not('ubicacion_label', 'is', null)
      .in('ubicacion_label', labelSet);

    if (error) {
      console.warn('[ConfigPage] fetchPackagesByLabels error:', error);
      return [];
    }
    return data || [];
  };

  const loadAll = async (forTenantId, cancelRef) => {
    const { data: tenantData, error: tErr } = await supabase
      .from('tenants').select('*').eq('id', forTenantId).maybeSingle();
    if (tErr) throw tErr;
    if (!cancelRef.current) {
      setTenant(tenantData || null);
      setNombre(tenantData?.nombre_empresa || '');
    }

    const { data: empresasData, error: eErr } = await supabase
      .from('empresas_transporte_tenant').select('*').eq('tenant_id', forTenantId);
    if (eErr) throw eErr;
    if (!cancelRef.current) {
      setEmpresas((empresasData || []).map(e => ({
        ...e,
        ingreso_por_entrega: e.ingreso_por_entrega != null ? e.ingreso_por_entrega.toFixed(2) : ''
      })));
    }

    const { data: listaEmpresas, error: catErr } = await supabase
      .from('empresas_transporte').select('*').order('nombre', { ascending: true });
    if (catErr) throw catErr;
    if (!cancelRef.current) setEmpresasDisponibles(listaEmpresas || []);

    await Promise.all([
      loadUbicacionesForTenant(forTenantId),
      loadPackagesCount(forTenantId),
      loadUsageByCodigo(forTenantId),
    ]);
  };

  // Carga inicial
  useEffect(() => {
    const cancelRef = { current: false };
    (async () => {
      try {
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userResp?.user || null;
        if (!user) { if (!cancelRef.current) setCargando(false); return; }
        if (!cancelRef.current) setUsuario(user);

        const { tenant: ensuredTenant } = await ensureTenantResolved();
        if (!ensuredTenant?.id) throw new Error('TENANT_NOT_FOUND');

        try { localStorage.removeItem('onboarding_nombre_negocio'); } catch {}

        await loadAll(ensuredTenant.id, cancelRef);
      } catch (err) {
        console.error('[ConfigPage] cargarDatos error:', err);
        mostrarToast('No se pudieron cargar los datos.', 'error');
      } finally {
        if (!cancelRef.current) {
          const snap = deepPack();
          setSnapshot(snap);
          setDirty(false);
          setCargando(false);
        }
      }
    })();
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [dirty, snapshot]); // eslint-disable-line

  /* ---------- Carriers helpers ---------- */
  const sanitizeCarriersLocal = () => {
    const trimmed = empresas.map(e => ({
      ...e,
      nombre: (e.nombre || '').trim(),
      ingreso_por_entrega: e.ingreso_por_entrega === '' ? '' : ('' + e.ingreso_por_entrega).trim()
    }));
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
    return sane
      .filter(e => e.nombre && e.ingreso_por_entrega !== '')
      .map(e => ({
        nombre: e.nombre,
        ingreso_por_entrega: parseFloat(e.ingreso_por_entrega) || 0,
        color: e.color ?? null,
        activo: typeof e.activo === 'boolean' ? e.activo : true,
        notas: e.notas ?? null
      }));
  };

  const hasPackages = packagesCount > 0;

  // Cambios pendientes en Cuenta
  const hasAccountPending = useMemo(() => {
    if (!accountDraft || !usuario) return false;
    const emailPending =
      accountDraft?.provider === 'email' &&
      accountDraft?.emailDraft &&
      accountDraft.emailDraft !== (usuario?.email || '') &&
      isValidEmail(accountDraft.emailDraft);
    const passPending =
      accountDraft?.provider === 'email' &&
      accountDraft?.pwd1 &&
      accountDraft?.pwd2 &&
      accountDraft.pwd1.length >= 8 &&
      accountDraft.pwd1 === accountDraft.pwd2;
    return !!(emailPending || passPending);
  }, [accountDraft, usuario]);

  /* ---------- Guardar global ---------- */
  const handleGuardar = async () => {
    const carriersPayload = buildCarriersPayload();
    if (carriersPayload === null) return;

    const somethingToSave = dirty || hasAccountPending;

    if (!somethingToSave) {
      navigate('/dashboard');
      return;
    }

    if (dirty && !nombre.trim()) { mostrarToast('El nombre no puede estar vacío.', 'error'); return; }

    setGuardando(true);
    try {
      const tId = tenant?.id;
      if (!tId) throw new Error('Tenant no encontrado');

      // 1) Config
      let debugResp = null;
      if (dirty) {
        const { error: nameErr } = await supabase.rpc('update_tenant_name_secure', {
          p_tenant: tId, p_nombre: nombre.trim(),
        });
        if (nameErr) throw nameErr;
        setTenant(prev => prev ? { ...prev, nombre_empresa: nombre.trim() } : prev);

        const sanitized = sanitizeUbicaciones(ubiRows);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const resp = await guardarUbicaciones(
          {
            tenantId: tId,
            ubicaciones: sanitized,
            meta: { cols: ubiMeta.cols, order: ubiMeta.orden },
            deletions: pendingDeletionsRef.current,
            forceDeletePackages: forceDeleteRef.current,
          },
          token
        );
        debugResp = resp?.debug || null;

        if (token) await guardarCarriers(carriersPayload, token, { sync: true });

        // Reset flags tras guardar
        pendingDeletionsRef.current = [];
        forceDeleteRef.current = false;
      }

      // 2) Cuenta
      if (hasAccountPending && usuario) {
        if (
          accountDraft?.provider === 'email' &&
          accountDraft?.emailDraft &&
          accountDraft.emailDraft !== (usuario?.email || '') &&
          isValidEmail(accountDraft.emailDraft)
        ) {
          const r = await applyEmailDraft({
            currentEmail: usuario?.email || '',
            nextEmail: accountDraft.emailDraft.trim(),
          });
          if (r?.error) throw r.error;
          if (r?.notice) mostrarToast(r.notice, 'success');
          const { data } = await supabase.auth.getUser();
          setUsuario(data?.user || null);
        }

        if (
          accountDraft?.provider === 'email' &&
          accountDraft?.pwd1 &&
          accountDraft?.pwd2 &&
          accountDraft.pwd1 === accountDraft.pwd2 &&
          accountDraft.pwd1.length >= 8
        ) {
          const r = await applyPasswordDraft({
            currentEmail: (usuario?.email || '').trim(),
            pwd1: accountDraft.pwd1,
            pwd2: accountDraft.pwd2,
          });
          if (r?.error) throw r.error;
          if (r?.notice) mostrarToast(r.notice, 'success');
        }

        setAccountDraft(null);
      }

      const newSnap = deepPack();
      setSnapshot(newSnap);
      setDirty(false);

      if (debugResp && (debugResp.packagesDeleted > 0 || debugResp.archived > 0)) {
        const p = debugResp.packagesDeleted || 0;
        const u = debugResp.archived || 0;
        mostrarToast(`Guardado: ${u} ubicación${u===1?'':'es'} archivada${u===1?'':'s'} y ${p} paquete${p===1?'':'s'} eliminado${p===1?'':'s'}.`, 'success');
      } else {
        mostrarToast('Configuración guardada correctamente.', 'success');
      }

      if (tenant?.id) {
        await Promise.all([loadPackagesCount(tenant.id), loadUsageByCodigo(tenant.id), loadUbicacionesForTenant(tenant.id)]);
      }

      setTimeout(() => navigate('/dashboard'), 150);
    } catch (err) {
      const e = err?.error ?? err;
      console.error('[ConfigPage] guardar error:', e);
      mostrarToast(e?.message || 'Error al guardar la configuración.', 'error');
    } finally { setGuardando(false); }
  };

  /* ---------- Render ---------- */
  if (cargando) return <Skeleton />;

  const sectionsSpec = [
    {
      id: 'warehouse',
      label: 'Almacén',
      icon: MdTune,
      content: (
        <section id="warehouse" className="config__grid" data-section>
          <IdentityCard nombre={nombre} setNombre={setNombre} usuario={usuario} />
          {ubiLoading ? (
            <Skeleton />
          ) : (
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
                const nextCols = Math.max(1, Math.min(12, parseInt(meta?.cols ?? ubiMeta.cols, 10) || ubiMeta.cols));
                const nextOrden = (meta?.order || meta?.orden) === 'vertical' ? 'vertical' : 'horizontal';
                setUbiMeta({ cols: nextCols, orden: nextOrden });
                pendingDeletionsRef.current = Array.isArray(deletions) ? deletions : [];
                forceDeleteRef.current = !!forceDeletePackages;
              }}
            />
          )}
        </section>
      )
    },
    {
  id: 'import',
  label: 'Importar inventario',
  icon: MdTune, // o un icono mejor si lo tienes
  content: (
    <section id="import" data-section>
      <ImportWizard
        onToast={(m,t) => setToast({ mensaje: m, tipo: t || 'success' })}
        onDone={() => {
          // refrescar contadores tras importación
          if (tenant?.id) {
            Promise.all([
              loadPackagesCount(tenant.id),
              loadUsageByCodigo(tenant.id)
            ]).catch(()=>{});
          }
        }}
      />
    </section>
  )
},

    {
      id: 'carriers',
      label: 'Empresas de transporte',
      icon: MdLocalShipping,
      content: (
        <section id="carriers" data-section ref={carriersRef} style={{ display: 'contents' }}>
          <CarriersCard
            empresas={empresas}
            empresasDisponibles={empresasDisponibles}
            INGRESOS={INGRESOS}
            añadirEmpresa={() => setEmpresas([...empresas, { nombre: '', ingreso_por_entrega: '' }])}
            actualizarEmpresa={(i,c,v) => setEmpresas(empresas.map((e, idx) => idx===i ? { ...e, [c]: v } : e))}
            eliminarEmpresa={(i) => {
              if (window.confirm('¿Eliminar esta empresa de transporte?')) {
                setEmpresas(empresas.filter((_, idx) => idx !== i));
              }
            }}
          />
        </section>
      )
    },
    // ===== PIN =====
    {
      id: 'pin',
      label: 'PIN de acceso',
      icon: MdPerson,
      content: (
        <section id="pin" data-section>
          <PinCard
            tenantId={tenant?.id}
            onToast={(m,t) => setToast({ mensaje: m, tipo: t || 'success' })}
          />
        </section>
      )
    },
    {
      id: 'account',
      label: 'Cuenta',
      icon: MdPerson,
      content: (
        <section id="account" data-section>
          <AccountSettings
            usuario={usuario}
            onDraftChange={setAccountDraft}
          />
        </section>
      )
    }
  ];

  return (
    <main className="configuracion">
      {toast && <Toast message={toast.mensaje} type={toast.tipo} onClose={() => setToast(null)} />}

      <div className="config__container">
        <Hero tenant={tenant} usuario={usuario} />
        <ConfigLayout title="Configuración" sections={sectionsSpec} active="warehouse" />

        <div
          className="config__footer"
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '16px 0 24px',
            marginTop: 24,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || (!dirty && !hasAccountPending)}
            aria-busy={guardando ? 'true' : 'false'}
            className="config__savebtn"
            title={(dirty || hasAccountPending) ? 'Guardar cambios' : 'No hay cambios que guardar'}
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </main>
  );
}
