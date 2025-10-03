// src/pages/AnadirPaquete.jsx
import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getTenantIdOrThrow } from '../utils/tenant';
import { crearPaqueteBackend, obtenerPaquetesBackend } from '../services/paquetesService';
import { cargarUbicaciones } from '../services/ubicacionesService';
import { FaBoxOpen, FaLightbulb, FaCheckCircle, FaCube } from 'react-icons/fa';
import '../styles/AnadirPaquete.scss';
import { useSubscription } from '../hooks/useSubscription';

/* ===== utils ===== */
const toUpperVis = (s='') => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const hexToRgba = (hex='#2563eb', a=0.08) => {
  const h = String(hex).replace('#','').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
const clamp = (v,min,max) => Math.max(min, Math.min(max, v));

/* ========== mapeos para reproducir EXACTAMENTE la configuración ========== */
// pos -> idx (idx es B{idx+1}) según orientación y columnas
function buildPosToIdx(count, cols, orientation) {
  const n = Math.max(0, count | 0);
  const c = Math.max(1, cols | 0);
  if (orientation === 'horizontal') return Array.from({ length: n }, (_, p) => p);

  // vertical (columna por columna)
  const rows = Math.ceil(n / c);
  const orderPos = [];
  for (let col = 0; col < c; col++) {
    for (let row = 0; row < rows; row++) {
      const pos = row * c + col; // posición visual
      if (pos < n) orderPos.push(pos);
    }
  }
  const posToIdx = Array(n).fill(0);
  orderPos.forEach((pos, idx) => { posToIdx[pos] = idx; });
  return posToIdx;
}

// obtiene idx (0-based) a partir de label "B<n>"
const idxFromLabel = (label) => {
  const m = /^B\s*(\d+)$/i.exec(String(label||'').trim());
  return m ? (parseInt(m[1],10)-1) : null;
};

// a partir del array “crudo” del backend + meta ➜ array visual en el orden correcto
function makeVisualUbicaciones(rawUbis, meta) {
  const cols = clamp(parseInt(meta?.cols ?? 5,10) || 5, 1, 12);
  const order = (meta?.order || meta?.orden) === 'vertical' ? 'vertical' : 'horizontal';

  // 1) normalizar y construir índice por B#
  const sorted = (rawUbis || []).map((u,i) => ({
    id    : u.id ?? u.ubicacion_id ?? `temp-${i}`,
    label : String(u.label || u.codigo || `B${i+1}`).toUpperCase(),
    orden : Number.isFinite(Number(u.orden)) ? Number(u.orden) : i,
    activo: u.activo ?? true
  }));
  const count = sorted.length || 0;

  const byIdx = Array(count).fill(null);
  for (const u of sorted) {
    const k = idxFromLabel(u.label);
    if (k != null && k >= 0 && k < count) byIdx[k] = u;
  }
  // huecos (por si faltara alguno)
  for (let k = 0; k < count; k++) {
    if (!byIdx[k]) byIdx[k] = { id: `ghost-${k}`, label: `B${k+1}`, orden: k, activo: true };
  }

  // 2) aplicar orden visual con meta
  const posToIdx = buildPosToIdx(count, cols, order);
  const visual = Array.from({ length: count }, (_, pos) => byIdx[posToIdx[pos]]);
  return { visual, cols, order };
}

// sonido opcional
const playChime = () => {};

export default function AnadirPaquete({ modoRapido = false }) {
  const [tenant, setTenant] = useState(null);

  // Suscripción / límites
  const { entitlements, loading: subLoading } = useSubscription();
  const canCreate = !!(
    entitlements?.canCreatePackage ??
    (
      (entitlements?.status === 'active' ||
       (entitlements?.status === 'trialing' &&
        (!entitlements?.until_at || Date.parse(entitlements.until_at) > Date.now())
       )) &&
      (Number.isFinite(Number(entitlements?.limits?.packages_left))
        ? Number(entitlements.limits.packages_left) > 0
        : true)
    )
  );

  // Empresas
  const [companias, setCompanias] = useState([]);
  const [compania, setCompania]   = useState('');
  const [cliente, setCliente]     = useState('');

  // Ubicaciones del backend (crudo) + meta
  const [rawUbicaciones, setRawUbicaciones] = useState([]);
  const [metaUbi, setMetaUbi] = useState({ cols: 5, order: 'horizontal' });

  // Derivados visuales
  const { visual: ubicaciones, cols } = useMemo(
    () => makeVisualUbicaciones(rawUbicaciones, metaUbi),
    [rawUbicaciones, metaUbi]
  );

  // Paquetes actuales (para ocupación)
  const [paquetes, setPaquetes] = useState([]);

  // selección { id, label }
  const [slotSel, setSlotSel] = useState(null);
  const [seleccionManual, setSeleccionManual] = useState(false);

  // UI
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);

  // refs
  const inputClienteRef = useRef(null);
  const flyLayerRef = useRef(null);

  // ===== CARGA =====
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const tid = await getTenantIdOrThrow();
        if (cancel) return;
        setTenant({ id: tid });

        // Empresas
        try {
          const { data } = await supabase
            .from('empresas_transporte_tenant')
            .select('nombre')
            .eq('tenant_id', tid);
          const lista = (data || []).map(e => e?.nombre).filter(Boolean).sort((a,b)=>a.localeCompare(b));
          setCompanias(lista);
          const lastCompany = localStorage.getItem('ap_last_company');
          setCompania(lastCompany && lista.includes(lastCompany) ? lastCompany : (lista[0] || ''));
        } catch {}

        // Ubicaciones + meta
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const ub = await cargarUbicaciones(token, tid); // { ubicaciones, meta }
        if (cancel) return;
        setRawUbicaciones(Array.isArray(ub?.ubicaciones) ? ub.ubicaciones : []);
        setMetaUbi({ cols: ub?.meta?.cols ?? 5, order: ub?.meta?.order ?? ub?.meta?.orden ?? 'horizontal' });

        // Paquetes
        const pk = await obtenerPaquetesBackend(token).catch(() => []);
        if (cancel) return;
        setPaquetes(Array.isArray(pk) ? pk : []);

        startTransition(() => inputClienteRef.current?.focus());
      } catch (e) {
        console.error('[AñadirPaquete] load', e);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // ===== Ocupación (por id y por label) =====
  const occupancy = useMemo(() => {
    const map = new Map();
    for (const p of paquetes) {
      if (p.entregado) continue;
      const keyId = p.ubicacion_id ?? p.balda_id ?? null;
      const keyLabel = (p.ubicacion_label ?? p.compartimento ?? '').toString().toUpperCase() || null;
      if (keyId != null) map.set(keyId, (map.get(keyId) || 0) + 1);
      if (keyLabel)      map.set(keyLabel, (map.get(keyLabel) || 0) + 1);
    }
    return map;
  }, [paquetes]);

  // ===== selección ideal =====
  const getMostEmptySlot = useCallback(() => {
    if (!ubicaciones.length) return null;
    const sorted = [...ubicaciones].sort((a,b)=> {
      const ca = occupancy.get(a.id) || occupancy.get(a.label) || 0;
      const cb = occupancy.get(b.id) || occupancy.get(b.label) || 0;
      return ca - cb;
    });
    const best = sorted[0];
    return best ? { id: best.id, label: best.label } : null;
  }, [ubicaciones, occupancy]);

  const pickForClient = useCallback((clienteNombre) => {
    const up = toUpperVis(clienteNombre || '');
    if (!up) return getMostEmptySlot();

    const match = paquetes.find(p => !p.entregado && toUpperVis(p?.nombre_cliente || '') === up);
    if (match) {
      const id = match.ubicacion_id ?? match.balda_id ?? null;
      const label = String(match.ubicacion_label ?? match.compartimento ?? '').toUpperCase() || null;

      if (id != null) {
        const u = ubicaciones.find(x => String(x.id) === String(id));
        if (u) return { id: u.id, label: u.label };
      }
      if (label) {
        const u = ubicaciones.find(x => x.label === label);
        if (u) return { id: u.id, label: u.label };
        return { id: null, label };
      }
    }
    return getMostEmptySlot();
  }, [paquetes, ubicaciones, getMostEmptySlot]);

  // autoselección mientras se escribe
  useEffect(() => {
    if (seleccionManual) return;
    const slot = pickForClient(cliente) || getMostEmptySlot();
    if (slot) setSlotSel(slot);
  }, [cliente, paquetes, ubicaciones, seleccionManual, pickForClient, getMostEmptySlot]);

  const puedeGuardar = useMemo(
    () => canCreate && cliente.trim() && compania && slotSel && (slotSel.id || slotSel.label),
    [canCreate, cliente, compania, slotSel]
  );

  // ✈️ animación
  const flyFromInputToSlot = useCallback(() => {
    try {
      const layer = flyLayerRef.current;
      const inputEl = inputClienteRef.current;
      if (!layer || !inputEl || !slotSel) return;

      const start = inputEl.getBoundingClientRect();
      const end = document.querySelector(`[data-ubi-id="${slotSel.id}"]`)?.getBoundingClientRect()
        || document.querySelector(`[data-ubi-label="${slotSel.label}"]`)?.getBoundingClientRect();
      if (!end) return;

      const parcel = document.createElement('div');
      parcel.className = 'fly-parcel';
      parcel.innerHTML = '<span class="icon"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M21 16.5v-9a1 1 0 0 0-.553-.894l-8-4a1 1 0 0 0-.894 0l-8 4A1 1 0 0 0 3 7.5v9a1 1 0 0 0 .553.894l8 4a1 1 0 0 0 .894 0l8-4A1 1 0 0 0 21 16.5ZM12 4.118 18.764 7.5 12 10.882 5.236 7.5ZM5 9.236l6 3v7.528l-6-3Zm8 10.528v-7.528l6-3v7.528Z"/></svg></span>';
      layer.appendChild(parcel);

      const sx = start.left + start.width - 30;
      const sy = start.top + start.height / 2;
      const ex = end.left + end.width / 2;
      const ey = end.top + 12;
      parcel.style.setProperty('--sx', `${sx}px`);
      parcel.style.setProperty('--sy', `${sy}px`);
      parcel.style.setProperty('--ex', `${ex}px`);
      parcel.style.setProperty('--ey', `${ey}px`);
      parcel.classList.add('animate');
      setTimeout(() => { try { layer.removeChild(parcel); } catch {} }, 1200);
    } catch {}
  }, [slotSel]);

  // ===== Guardar =====
  const guardar = useCallback(async (e) => {
    e?.preventDefault();
    if (loading) return;

    if (!canCreate) {
      alert('Tu prueba está agotada. Elige un plan para seguir creando paquetes.');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !tenant?.id) throw new Error('Faltan datos para registrar el paquete.');

      const upperCliente = toUpperVis(cliente.trim());
      if (!upperCliente) throw new Error('Falta nombre del cliente.');
      if (!compania) throw new Error('Falta empresa de transporte.');

      // etiqueta visible para backend
      const slotLabel = String(
        (slotSel?.label || (Number.isFinite(Number(slotSel?.id)) ? `B${Number(slotSel.id)}` : ''))
      ).trim().toUpperCase();
      if (!slotLabel) throw new Error('No hay compartimento/ubicación seleccionada.');

      const slotAtSave = {
        type: slotSel?.type || 'shelf',
        id: Number.isFinite(Number(slotSel?.id)) ? Number(slotSel.id) : null,
        label: slotLabel,
      };

      // Optimista
      const ahora = new Date().toISOString();
      const tempId = `temp_${Date.now()}`;
      const temp = {
        id: tempId,
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        entregado: false,
        fecha_llegada: ahora,
        created_at: ahora,
        compartimento: slotAtSave.label,
        balda_id: slotAtSave.id ?? null,
      };
      setPaquetes(prev => [temp, ...prev]);

      flyFromInputToSlot();

      // Backend
      const payload = {
        tenant_id: tenant.id,
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        ubicacion_label: slotAtSave.label,
        ...(slotAtSave.id ? { ubicacion_id: slotAtSave.id } : {}),
      };
      const creado = await crearPaqueteBackend(payload, token);
      if (!creado?.id) throw new Error('No se pudo crear el paquete en backend.');

      // Sustituir temporal
      setPaquetes(prev => prev.map(p =>
        p.id === tempId ? { ...p, id: creado.id, balda_id: creado.balda_id ?? p.balda_id } : p
      ));

      // Recuerdos
      localStorage.setItem('ap_last_company', compania);

      // Feedback
      setUltimoGuardado(slotAtSave);
      playChime();
      setExito(true);
      setTimeout(() => setExito(false), 1800);

      // Limpieza
      setCliente('');
      setSeleccionManual(false);
      startTransition(() => inputClienteRef.current?.focus());
    } catch (err) {
      console.error('[AñadirPaquete] Error al guardar', err);
      alert(err?.message || 'No se pudo guardar el paquete. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  }, [loading, canCreate, tenant, cliente, compania, slotSel, flyFromInputToSlot]);

  const sugerenciaPrimaria = useMemo(() => slotSel?.label || '', [slotSel]);

  // ===== Render =====
  return (
    <div className="anadir-paquete">
      <div id="fly-layer" ref={flyLayerRef} aria-hidden="true" />
      <header className="cabecera">
        <div className="titulo">
          <FaBoxOpen aria-hidden="true" />
          <div>
            <h1>Añadir paquete</h1>
            <p>Registra el paquete y elige la ubicación.</p>
          </div>
        </div>
      </header>

      <form className="form" onSubmit={guardar}>
        {!subLoading && !canCreate && (
          <div className="alert warn" role="status" style={{ marginBottom: 12 }}>
            Tu prueba está agotada. No puedes añadir más paquetes. Elige un plan para continuar.
          </div>
        )}

        <section className="panel datos">
          <h2>Datos del paquete</h2>
          <p className="hint">Completa el cliente, la empresa y confirma la ubicación.</p>

          <div className="fila">
            <div className="campo">
              <label>Nombre del cliente</label>
              <input
                ref={inputClienteRef}
                type="text"
                placeholder="Añadir cliente…"
                value={cliente}
                onChange={e => { setCliente(toUpperVis(e.target.value)); setSeleccionManual(false); }}
                autoComplete="off"
                maxLength={80}
              />
            </div>

            <div className="campo">
              <label>Empresa de transporte</label>
              <select value={compania} onChange={(e) => setCompania(e.target.value)} aria-label="Empresa de transporte">
                {companias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="campo" aria-hidden="true" />
          </div>

          <div className="bloque-central">
            <div className="chips">
              <span className="chip chip--hint">
                <FaLightbulb aria-hidden="true" />
                <span className="lbl">Sugerencia</span>
                <code className="pill">{sugerenciaPrimaria || '—'}</code>
              </span>

              <span className="chip chip--selected">
                <FaCheckCircle aria-hidden="true" />
                <span className="lbl">Seleccionado</span>
                <code className="pill">{slotSel?.label || '—'}</code>
              </span>
            </div>

            <div className="acciones-centro">
              <button type="submit" className="btn-primary btn-xl" disabled={!puedeGuardar || loading || !canCreate}>
                {!canCreate ? 'Desbloquear plan' : (loading ? 'Guardando…' : 'Guardar paquete')}
              </button>
            </div>
          </div>
        </section>

        <section className="panel rejilla">
          <h2>Ubicaciones</h2>
          <p className="hint">Selecciona una ubicación. Verás la ocupación actual.</p>

          <div
            className="estantes-grid"
            style={{ gridTemplateColumns: `repeat(${cols || 5}, minmax(220px, 1fr))` }}
            role="group"
            aria-label="Selección de ubicación"
          >
            {ubicaciones.map(u => {
              const count = occupancy.get(u.id) || occupancy.get(u.label) || 0;
              const activa = slotSel?.id === u.id || slotSel?.label === u.label;
              return (
                <button
                  type="button"
                  key={u.id}
                  data-ubi-id={u.id}
                  data-ubi-label={u.label}
                  className={`balda ${count <= 4 ? 'verde' : count < 10 ? 'naranja' : 'rojo'} ${activa ? 'activa pulse' : ''}`}
                  onClick={() => { setSlotSel({ id: u.id, label: u.label }); setSeleccionManual(true); }}
                  aria-pressed={activa}
                >
                  <div className="balda-header">{u.label}</div>
                  <div className="balda-badge"><FaCube aria-hidden="true" />{count} paquete{count!==1?'s':''}</div>
                </button>
              );
            })}
          </div>

          <div className="leyenda">
            <span><i className="dot verde" /> Baja ocupación</span>
            <span><i className="dot naranja" /> Media</span>
            <span><i className="dot rojo" /> Alta</span>
          </div>
        </section>
      </form>

      {exito && (
        <div className="modal-exito modal-exito--giant" role="status" aria-live="polite">
          <div className="contenido">
            <FaCheckCircle aria-hidden="true" />
            <div>
              <h3>¡Paquete guardado!</h3>
              <p>Se registró en <strong>{ultimoGuardado?.label}</strong>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
