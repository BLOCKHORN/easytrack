import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { ensureTenantResolved } from '../../utils/ensureTenant';
import Toast from '../../components/Toast';

import Hero from './Hero';
import IdentityCard from './IdentityCard';
import Ubicaciones from './Ubicaciones';
import CarriersCard from './CarriersCard';
import FooterActions from './FooterActions';
import Skeleton from './Skeleton';
import AccountSettings from './AccountSettings';

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

// Normaliza filas para backend (siempre con codigo)
const sanitizeUbicaciones = (rows = []) =>
  rows.map((r, i) => {
    const label = (r?.label || `B${i + 1}`).toUpperCase();
    return {
      label,
      codigo: (r?.codigo || r?.label || `B${i + 1}`).toUpperCase(),
      orden: Number.isFinite(r?.orden) ? r.orden : i
    };
  });

export default function ConfigPage() {
  const [usuario, setUsuario] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Ubicaciones: filas + meta (cols/orden)
  const [ubiRows, setUbiRows] = useState([]);                         // [{label,codigo,orden}]
  const [ubiMeta, setUbiMeta] = useState({ cols: 5, orden: 'horizontal' });
  const [ubiLoading, setUbiLoading] = useState(false);

  // Carriers
  const [empresas, setEmpresas] = useState([]);
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  const carriersRef = useRef(null);

  // Paquetes → bloqueo
  const [packagesCount, setPackagesCount] = useState(0);

  const [toast, setToast] = useState(null);
  const mostrarToast = (mensaje, tipo = 'success') => setToast({ mensaje, tipo });

  // Snapshot + dirty
  const [snapshot, setSnapshot] = useState(null);
  const [dirty, setDirty] = useState(false);

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
    mostrarToast('Cambios revertidos.', 'success');
  };

  /* ---------- LOAD ---------- */
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
      // fallback
      setUbiRows(rowsFromCount(25));
      setUbiMeta({ cols: 5, orden: 'horizontal' });
    } finally {
      setUbiLoading(false);
    }
  };

  const loadPackagesCount = async (forTenantId) => {
    const { count, error } = await supabase
      .from('packages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', forTenantId);
    if (!error) setPackagesCount(count || 0);
  };

  const loadAll = async (forTenantId, cancelRef) => {
    // Tenant + nombre
    const { data: tenantData, error: tErr } = await supabase
      .from('tenants').select('*').eq('id', forTenantId).maybeSingle();
    if (tErr) throw tErr;
    if (!cancelRef.current) {
      setTenant(tenantData || null);
      setNombre(tenantData?.nombre_empresa || '');
    }

    // Carriers del tenant
    const { data: empresasData, error: eErr } = await supabase
      .from('empresas_transporte_tenant').select('*').eq('tenant_id', forTenantId);
    if (eErr) throw eErr;
    if (!cancelRef.current) {
      setEmpresas((empresasData || []).map(e => ({
        ...e,
        ingreso_por_entrega: e.ingreso_por_entrega != null ? e.ingreso_por_entrega.toFixed(2) : ''
      })));
    }

    // Catálogo empresas global
    const { data: listaEmpresas, error: catErr } = await supabase
      .from('empresas_transporte').select('*').order('nombre', { ascending: true });
    if (catErr) throw catErr;
    if (!cancelRef.current) setEmpresasDisponibles(listaEmpresas || []);

    // Ubicaciones y paquetes
    await Promise.all([
      loadUbicacionesForTenant(forTenantId),
      loadPackagesCount(forTenantId),
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
      if (key === 'escape' && dirty && snapshot) { e.preventDefault(); revertirCambios(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, snapshot]); // eslint-disable-line

  /* ---------- Carriers helpers ---------- */
  const sanitizeCarriers = () => {
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
    const sane = sanitizeCarriers();
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

  /* ---------- Guardar global ---------- */
  const handleGuardar = async () => {
    if (!nombre.trim()) { mostrarToast('El nombre no puede estar vacío.', 'error'); return; }
    const carriersPayload = buildCarriersPayload();
    if (carriersPayload === null) return;
    if (!dirty) { mostrarToast('Nada que guardar.', 'success'); return; }

    const countChanged = (ubiRows?.length ?? 0) !== (snapshot?.ubiRows?.length ?? 0);
    if (hasPackages && countChanged) {
      mostrarToast(`No puedes añadir ni eliminar ubicaciones mientras existan paquetes (${packagesCount}).`, 'error');
      return;
    }

    setGuardando(true);
    try {
      const tId = tenant?.id;
      if (!tId) throw new Error('Tenant no encontrado');

      // 1) Nombre negocio
      const { error: nameErr } = await supabase.rpc('update_tenant_name_secure', {
        p_tenant: tId, p_nombre: nombre.trim(),
      });
      if (nameErr) throw nameErr;
      setTenant(prev => prev ? { ...prev, nombre_empresa: nombre.trim() } : prev);

      // 2) Ubicaciones (con meta)  <<<<<< SIEMPRE con {label,codigo,orden} >>>>>>
      {
        const sanitized = sanitizeUbicaciones(ubiRows);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        await guardarUbicaciones(
          {
            tenantId: tId,
            ubicaciones: sanitized,
            meta: { cols: ubiMeta.cols, order: ubiMeta.orden },
          },
          token
        );
      }

      // 3) Carriers
      {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token && (carriersPayload?.length ?? 0) > 0) {
          await guardarCarriers(carriersPayload, token, { sync: true });
        }
      }

      const newSnap = deepPack();
      setSnapshot(newSnap);
      setDirty(false);
      mostrarToast('Configuración guardada correctamente.', 'success');
    } catch (err) {
      const e = err?.error ?? err;
      console.error('[ConfigPage] guardar error:', e);
      mostrarToast('Error al guardar la configuración.', 'error');
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
        <section className="config__grid">
          <IdentityCard nombre={nombre} setNombre={setNombre} usuario={usuario} />
          {ubiLoading ? (
            <Skeleton />
          ) : (
            <Ubicaciones
              initial={ubiRows}
              initialMeta={ubiMeta}
              tenantId={tenant?.id}
              locked={hasPackages}
              lockedCount={packagesCount}
              onSave={async ({ ubicaciones, meta }) => {
                try {
                  // Bloquear cambio de cantidad si hay paquetes
                  const newCount = ubicaciones.length;
                  const oldCount = (ubiRows?.length ?? 0);
                  if (hasPackages && newCount !== oldCount) {
                    mostrarToast(`No puedes añadir ni eliminar ubicaciones mientras existan paquetes (${packagesCount}).`, 'error');
                    return;
                  }

                  const { data: { session } } = await supabase.auth.getSession();
                  const token = session?.access_token;

                  // <<<<<< SIEMPRE con {label,codigo,orden} >>>>>>
                  await guardarUbicaciones(
                    {
                      tenantId: tenant?.id,
                      ubicaciones: sanitizeUbicaciones(ubicaciones),
                      meta, // { cols, order }
                    },
                    token
                  );

                  // Refresca estado local para snapshot/dirty
                  setUbiRows(sanitizeUbicaciones(ubicaciones));
                  setUbiMeta({ cols: meta.cols, orden: meta.order });

                  mostrarToast('Ubicaciones guardadas correctamente.', 'success');
                } catch (e) {
                  console.error('[ConfigPage] onSave ubicaciones:', e);
                  mostrarToast('No se pudieron guardar las Ubicaciones.', 'error');
                }
              }}
            />
          )}
        </section>
      )
    },
    {
      id: 'carriers',
      label: 'Empresas de transporte',
      icon: MdLocalShipping,
      content: (
        <div ref={carriersRef} style={{ display: 'contents' }}>
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
        </div>
      )
    },
    {
      id: 'account',
      label: 'Cuenta',
      icon: MdPerson,
      content: (<AccountSettings />)
    }
  ];

  return (
    <main className="configuracion">
      {toast && <Toast message={toast.mensaje} type={toast.tipo} onClose={() => setToast(null)} />}

      <div className="config__container">
        <Hero tenant={tenant} usuario={usuario} />

        <ConfigLayout title="Configuración" sections={sectionsSpec} active="warehouse" />

        {dirty && (
          <div className="config__status">
            <span className="chip">Cambios sin guardar · ⌘/Ctrl+S para guardar · Esc para deshacer</span>
          </div>
        )}

        <div className="config__footer">
          <FooterActions
            guardando={guardando}
            onGuardar={handleGuardar}
            onExport={() => {
              const payload = deepPack();
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'configuracion-easypack.json';
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            onImport={async (file) => {
              try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!data || typeof data !== 'object') throw new Error('Formato inválido');
                if (!window.confirm('Esto reemplazará la configuración actual en edición. ¿Continuar?')) return;

                if (typeof data.nombre === 'string' || typeof data.nombre_empresa === 'string') {
                  setNombre((data.nombre ?? data.nombre_empresa) || '');
                }
                if (Array.isArray(data.ubiRows)) setUbiRows(sanitizeUbicaciones(data.ubiRows));
                else if (typeof data.ubiCount === 'number') setUbiRows(rowsFromCount(data.ubiCount));

                if (data.ubiMeta && typeof data.ubiMeta === 'object') {
                  const cols = Math.max(1, Math.min(12, parseInt(data.ubiMeta.cols ?? 5, 10) || 5));
                  const orden = (data.ubiMeta.orden || data.ubiMeta.order) === 'vertical' ? 'vertical' : 'horizontal';
                  setUbiMeta({ cols, orden });
                }

                if (Array.isArray(data.empresas)) setEmpresas(data.empresas);

                setDirty(true);
                setSnapshot(null);
                mostrarToast('Configuración cargada (no guardada aún).', 'success');
              } catch {
                mostrarToast('Archivo inválido.', 'error');
              }
            }}
            onDeshacer={revertirCambios}
          />
        </div>
      </div>
    </main>
  );
}
