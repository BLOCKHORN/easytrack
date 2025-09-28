import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { ensureTenantResolved } from '../../utils/ensureTenant';
import Toast from '../../components/Toast';

import Hero from './Hero';
import IdentityCard from './IdentityCard';
import WarehouseCard from './WarehouseCard';
import CarriersCard from './CarriersCard';
import FooterActions from './FooterActions';
import Skeleton from './Skeleton';
import AccountSettings from './AccountSettings';

import ConfigLayout from './ConfigLayout';
import './ConfigBase.scss';

import { MdTune, MdLocalShipping, MdPerson } from 'react-icons/md';
import { guardarCarriers, syncEstructuraSecure } from '../../services/configuracionService';

/* ===== Helpers ===== */
const numToAlpha = (num) => {
  let s = '', n = num;
  if (!Number.isFinite(n) || n < 1) return '';
  while (n > 0) { const c = (n - 1) % 26; s = String.fromCharCode(65 + c) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

const COLOR_NAME = {
  "#3b82f6":"Azul","#6366f1":"Índigo","#8b5cf6":"Violeta","#a855f7":"Morado",
  "#d946ef":"Fucsia","#ec4899":"Rosa","#f43f5e":"Rosa fuerte","#ef4444":"Rojo",
  "#f97316":"Naranja","#f59e0b":"Ámbar","#eab308":"Amarillo","#84cc16":"Lima",
  "#22c55e":"Verde","#10b981":"Esmeralda","#14b8a6":"Turquesa","#06b6d4":"Cian",
  "#0ea5e9":"Celeste","#64748b":"Gris azulado","#71717a":"Gris","#78716c":"Piedra"
};
const DEFAULT_LANE_COLOR = '#f59e0b';
const prettyColorName = (hex) => {
  const h = String(hex || DEFAULT_LANE_COLOR).toLowerCase();
  return COLOR_NAME[h] || h.replace('#','').toUpperCase();
};

const DEFAULT_NOMEN = Object.freeze({
  layout_mode: 'lanes',
  lanes_rows: 2,
  lanes_cols: 2,
  lane_name_scheme: 'numeric',
  lane_name_case: 'upper',
  rack_rows: 2,
  rack_cols: 3,
  col_scheme: 'alpha',
});

export default function ConfigPage() {
  const [usuario, setUsuario] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [estructura, setEstructura] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  const [toast, setToast] = useState(null);

  const [nomenclatura, setNomenclatura] = useState(DEFAULT_NOMEN);

  const [snapshot, setSnapshot] = useState(null);
  const [dirty, setDirty] = useState(false);

  const [modeLock, setModeLock] = useState({ locked: false, pending: 0, current_mode: null });

  const carriersRef = useRef(null);
  const prevModeRef = useRef(DEFAULT_NOMEN.layout_mode);

  const INGRESOS = useMemo(
    () => Array.from({ length: 20 }, (_, i) => ((i + 1) * 0.05).toFixed(2)),
    []
  );
  const mostrarToast = (mensaje, tipo = 'success') => setToast({ mensaje, tipo });

  const deepPack = () => ({ nombre, estructura, empresas, nomenclatura });
  const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const revertirCambios = () => {
    if (!snapshot) return;
    setNombre(snapshot.nombre);
    setEstructura(snapshot.estructura);
    setEmpresas(snapshot.empresas);
    setNomenclatura(snapshot.nomenclatura);
    setDirty(false);
    mostrarToast('Cambios revertidos.', 'success');
  };

  /* ---------- CARGA ---------- */
  const loadAll = async (forTenantId, cancelRef) => {
    const { data: tenantData, error: tErr } = await supabase
      .from('tenants').select('*').eq('id', forTenantId).maybeSingle();
    if (tErr) throw tErr;
    if (!cancelRef.current) {
      setTenant(tenantData || null);
      setNombre(tenantData?.nombre_empresa || '');
    }

    let layoutResp = null;
    try {
      const { data, error } = await supabase.rpc('get_warehouse_layout', { p_org: forTenantId });
      if (error) throw error;
      layoutResp = data || null;
    } catch (e) {
      console.warn('[ConfigPage] get_warehouse_layout no disponible; uso defaults.', e);
    }

    let baldasMap = new Map();
    try {
      const { data: baldasRows } = await supabase
        .from('baldas')
        .select('estante, balda')
        .eq('id_negocio', forTenantId)
        .order('estante', { ascending: true })
        .order('balda', { ascending: true });

      (baldasRows || []).forEach(r => {
        const est = Number(r.estante) || 1;
        baldasMap.set(est, (baldasMap.get(est) || 0) + 1);
      });
    } catch (e) {
      console.warn('[ConfigPage] fallback baldas no disponible.', e);
    }

    const shelfCountFromPayload = (rData) => {
      if (Array.isArray(rData?.shelves)) return rData.shelves.length;
      if (Array.isArray(rData?.shelves_list)) return rData.shelves_list.length;
      const n = Number(
        rData?.shelves ?? rData?.shelf_count ?? rData?.shelves_count ?? rData?.num_shelves ?? rData?.count
      );
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    if (!cancelRef.current) {
      if (layoutResp && layoutResp.layout_mode) {
        const mode = layoutResp.layout_mode;

        const grid = layoutResp.grid || { rows: 2, cols: 2 };
        const lanesArr = Array.isArray(layoutResp?.payload?.lanes)
          ? layoutResp.payload.lanes
          : Array.isArray(layoutResp?.lanes)
            ? layoutResp.lanes
            : [];
        const racksArr = Array.isArray(layoutResp?.payload?.racks)
          ? layoutResp.payload.racks
          : Array.isArray(layoutResp?.racks)
            ? layoutResp.racks
            : [];

        const nameScheme = layoutResp?.payload?.name_scheme ?? layoutResp?.name_scheme ?? 'numeric';
        const nameCase   = layoutResp?.payload?.name_case   ?? layoutResp?.name_case   ?? 'upper';

        if (mode === 'lanes') {
          setNomenclatura(prev => ({
            ...DEFAULT_NOMEN,
            ...prev,
            layout_mode: 'lanes',
            lanes_rows: Math.max(1, grid.rows || 2),
            lanes_cols: Math.max(1, grid.cols || 2),
            lane_name_scheme: nameScheme,
            lane_name_case: nameCase,
          }));

          const rows = Math.max(1, grid.rows || 2);
          const cols = Math.max(1, grid.cols || 2);
          const total = Math.max(1, lanesArr.length || rows * cols);
          setEstructura(Array.from({ length: total }, (_, idx) => {
            const l = lanesArr[idx] || {};
            const r = Math.floor(idx / cols) + 1;
            const c = (idx % cols) + 1;
            return { estante: idx + 1, color: l?.color || DEFAULT_LANE_COLOR, pos: { r, c } };
          }));
        } else {
          // === ESTANTES ===
          let rows = Math.max(1, grid.rows || 0);
          let cols = Math.max(1, grid.cols || 0);

          if (!rows || !cols) {
            const payloadCount = racksArr?.length || 0;
            const estantesSet = new Set([...baldasMap.keys()]);
            const n = Math.max(payloadCount, estantesSet.size, 1);
            cols = Math.min(Math.ceil(Math.sqrt(n)), 6);
            rows = Math.ceil(n / cols);
          }

          setNomenclatura(prev => ({
            ...DEFAULT_NOMEN,
            ...prev,
            layout_mode: 'racks',
            rack_rows: rows,
            rack_cols: cols
          }));

          const total = rows * cols;
          setEstructura(Array.from({ length: total }, (_, idx) => {
            const rData = racksArr[idx] || {};
            const r = Math.floor(idx / cols) + 1;
            const c = (idx % cols) + 1;
            const idx1 = idx + 1;

            const fromMeta = shelfCountFromPayload(rData) || 0;
            const fromDb   = baldasMap.get(idx1) || 0;
            const shelvesCount = Math.max(1, fromDb, fromMeta);

            const alias = (typeof rData?.name === 'string') ? rData.name : '';
            const listedNames = Array.isArray(rData?.shelves) ? rData.shelves.map(s => s?.name || '') : [];
            const shelf_names = listedNames.slice(0, shelvesCount);
            while (shelf_names.length < shelvesCount) shelf_names.push('');

            return { estante: idx1, baldas: shelvesCount, pos: { r, c }, alias, shelf_names };
          }));
        }
        prevModeRef.current = mode;
      } else {
        // Default 2x2 lanes
        setNomenclatura(prev => ({ ...DEFAULT_NOMEN, ...prev, layout_mode: 'lanes', lanes_rows: 2, lanes_cols: 2 }));
        setEstructura([
          { estante:1, color:DEFAULT_LANE_COLOR, pos:{ r:1, c:1 } },
          { estante:2, color:DEFAULT_LANE_COLOR, pos:{ r:1, c:2 } },
          { estante:3, color:DEFAULT_LANE_COLOR, pos:{ r:2, c:1 } },
          { estante:4, color:DEFAULT_LANE_COLOR, pos:{ r:2, c:2 } },
        ]);
        prevModeRef.current = 'lanes';
      }
    }

    // Empresas del tenant
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

    // Bloqueo por paquetes pendientes
    try {
      const { count } = await supabase
        .from('paquetes')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', forTenantId)
        .eq('entregado', false);
      const pending = count ?? 0;
      const current_mode = layoutResp?.layout_mode || 'lanes';
      if (!cancelRef.current) setModeLock({ locked: pending > 0, pending, current_mode });
    } catch (e) {
      console.warn('[ConfigPage] pending count no disponible.', e);
      if (!cancelRef.current) setModeLock({ locked:false, pending:0, current_mode: layoutResp?.layout_mode || 'lanes' });
    }
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
          const snap = { nombre, estructura, empresas, nomenclatura };
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
    const current = deepPack();
    setDirty(!sameJSON(current, snapshot));
  }, [nombre, estructura, empresas, nomenclatura, snapshot]);

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

  /* ======= Normalización previa y guardado ======= */
  const fitGrid = (count, rows, cols) => {
    let r = Math.max(1, parseInt(rows ?? 0) || 0);
    let c = Math.max(1, parseInt(cols ?? 0) || 0);
    if (r * c >= Math.max(1, count)) return { rows: r, cols: c };
    if (c > 0) { r = Math.ceil(Math.max(1, count) / c); return { rows: r, cols: c }; }
    const side = Math.ceil(Math.sqrt(Math.max(1, count)));
    return { rows: side, cols: side };
  };

  const laneNameFor = (idx1, hex) => {
    const scheme = nomenclatura.lane_name_scheme || 'numeric';
    if (scheme === 'alpha') {
      let a = numToAlpha(idx1) || String(idx1);
      if ((nomenclatura.lane_name_case || 'upper') === 'lower') a = a.toLowerCase();
      return a;
    }
    if (scheme === 'color') return prettyColorName(hex);
    return String(idx1);
  };

  const sanitizeAndBuildPayload = () => {
    if ((nomenclatura.layout_mode || 'lanes') === 'lanes') {
      const count = Math.max(1, estructura.length || (nomenclatura.lanes_rows * nomenclatura.lanes_cols));
      const { rows, cols } = fitGrid(count, nomenclatura.lanes_rows, nomenclatura.lanes_cols);

      const fixedEstructura = Array.from({ length: count }, (_, idx) => {
        const base = estructura[idx] || {};
        const r = Math.floor(idx / cols) + 1;
        const c = (idx % cols) + 1;
        return { estante: idx + 1, color: base?.color || DEFAULT_LANE_COLOR, pos: { r, c } };
      });

      const fixedNomen = {
        ...nomenclatura,
        layout_mode: 'lanes',
        lanes_rows: rows,
        lanes_cols: cols,
        lane_name_scheme: nomenclatura.lane_name_scheme || 'numeric',
        lane_name_case: nomenclatura.lane_name_case || 'upper'
      };

      const lanes = fixedEstructura.map((l, i) => ({
        id: i + 1,
        name: laneNameFor(i + 1, l.color),
        color: l.color,
        position: { row: l.pos.r, col: l.pos.c }
      }));

      return {
        payload: { layout_mode: 'lanes', grid: { rows, cols }, lanes, name_scheme: fixedNomen.lane_name_scheme, name_case: fixedNomen.lane_name_case },
        fixedEstructura, fixedNomen
      };
    }

    // ===== RACKS =====
    const count = Math.max(1, estructura.length || (nomenclatura.rack_rows * nomenclatura.rack_cols));
    const { rows, cols } = fitGrid(count, nomenclatura.rack_rows, nomenclatura.rack_cols);

    const fixedEstructura = Array.from({ length: count }, (_, idx) => {
      const base = estructura[idx] || {};
      const r = Math.floor(idx / cols) + 1;
      const c = (idx % cols) + 1;
      const baldas = Math.max(1, parseInt(base?.baldas) || 1);
      const arr = Array.isArray(base?.shelf_names) ? base.shelf_names.slice(0, baldas) : [];
      while (arr.length < baldas) arr.push('');
      return { estante: idx + 1, baldas, alias: base?.alias || '', shelf_names: arr, pos: { r, c } };
    });

    const fixedNomen = {
      ...nomenclatura, layout_mode: 'racks', rack_rows: rows, rack_cols: cols, col_scheme: nomenclatura.col_scheme || 'alpha'
    };

    const starts = (() => {
      let run = 1; const m = new Map();
      for (const r of fixedEstructura) { m.set(r.estante, run); run += Math.max(1, r.baldas || 1); }
      return m;
    })();

    const racks = fixedEstructura.map((r, i) => {
      const labelDefault = (fixedNomen.col_scheme === 'numeric') ? String(i + 1) : (numToAlpha(i + 1) || String(i + 1));
      const rackName = r.alias || labelDefault;
      const shelves = Array.from({ length: r.baldas }, (_, j) => {
        const auto = `B${(starts.get(r.estante) || 1) + j}`;
        const name = r.shelf_names?.[j] || auto;
        return { index: j + 1, name };
      });
      return { id: i + 1, name: rackName, position: { row: r.pos.r, col: r.pos.c }, shelves };
    });

    return { payload: { layout_mode: 'racks', grid: { rows, cols }, racks }, fixedEstructura, fixedNomen };
  };

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

  const saveLayoutToDb = async () => {
    const tId = tenant?.id;
    if (!tId) throw new Error('Tenant no encontrado');

    const { payload, fixedEstructura, fixedNomen } = sanitizeAndBuildPayload();

    setEstructura(fixedEstructura);
    setNomenclatura(fixedNomen);

    if (modeLock?.pending > 0 && modeLock?.current_mode && modeLock.current_mode !== payload.layout_mode) {
      throw new Error('LAYOUT_SWITCH_BLOCKED_PENDING: hay paquetes pendientes');
    }

    const { data, error } = await supabase.rpc('save_warehouse_layout_v2', {
      p_org: tId,
      p_layout: payload
    });
    if (error) throw error;
    return { meta: data, fixedEstructura, fixedNomen };
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) { mostrarToast('El nombre no puede estar vacío.', 'error'); return; }

    if ((nomenclatura.layout_mode || 'lanes') === 'racks') {
      if (estructura.some(e => !Number.isFinite(e.baldas) || e.baldas < 1)) {
        mostrarToast('Cada columna debe tener al menos una balda.', 'error'); return;
      }
    }

    const carriersPayload = buildCarriersPayload();
    if (carriersPayload === null) return;

    if (!dirty) { mostrarToast('Nada que guardar.', 'success'); return; }

    setGuardando(true);
    try {
      const tId = tenant?.id;
      if (!tId) throw new Error('Tenant no encontrado');

      const { error: nameErr } = await supabase.rpc('update_tenant_name_secure', {
        p_tenant: tId, p_nombre: nombre.trim(),
      });
      if (nameErr) throw nameErr;
      setTenant(prev => prev ? { ...prev, nombre_empresa: nombre.trim() } : prev);

      const { fixedEstructura: structForSync } = await saveLayoutToDb();

      if ((nomenclatura.layout_mode || 'lanes') === 'racks') {
        await syncEstructuraSecure(tId, structForSync);
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token && (carriersPayload?.length ?? 0) > 0) {
        await guardarCarriers(carriersPayload, token, { sync: true });
      }

      const newSnap = deepPack();
      setSnapshot(newSnap);
      setDirty(false);

      try {
        const { count } = await supabase
          .from('paquetes')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tId)
          .eq('entregado', false);
        setModeLock({ locked: (count ?? 0) > 0, pending: count ?? 0, current_mode: (nomenclatura.layout_mode || 'lanes') });
      } catch {}

      mostrarToast('Configuración guardada correctamente.', 'success');
    } catch (err) {
      const e = err?.error ?? err;
      console.error('[ConfigPage] guardar error:', e);
      const msg = String(e?.message || e);
      if (msg.includes('LAYOUT_SWITCH_BLOCKED_PENDING')) {
        mostrarToast('No puedes cambiar el modo de layout: hay paquetes pendientes sin entregar.', 'error');
      } else {
        mostrarToast('Error al guardar la configuración.', 'error');
      }
    } finally { setGuardando(false); }
  };

  if (cargando) return <Skeleton />;

  /* ---------- Secciones (content) para el layout tipo Render ---------- */
  const sectionsSpec = [
    {
      id: 'warehouse',
      label: 'Almacén',
      icon: MdTune,
      content: (
        <section className="config__grid">
          <IdentityCard nombre={nombre} setNombre={setNombre} usuario={usuario} />
          <WarehouseCard
            estructura={estructura}
            setEstructura={setEstructura}
            nomenclatura={nomenclatura}
            setNomenclatura={setNomenclatura}
            modeLocked={!!modeLock?.locked}
            lockInfo={modeLock}
          />
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

        {/* Modo Render: todas las secciones */}
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
                if (Array.isArray(data.estructura)) setEstructura(data.estructura);
                if (Array.isArray(data.empresas)) setEmpresas(data.empresas);
                if (data.nomenclatura && typeof data.nomenclatura === 'object') {
                  setNomenclatura({ ...DEFAULT_NOMEN, ...data.nomenclatura });
                }
                setDirty(true);
                setSnapshot(null);
                mostrarToast('Configuración cargada (no guardada aún).', 'success');
              } catch {
                mostrarToast('Archivo inválido.', 'error');
              }
            }}
          />
        </div>
      </div>
    </main>
  );
}
