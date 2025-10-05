// src/pages/AnadirPaquete.jsx
import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getTenantIdOrThrow } from '../utils/tenant';
import { crearPaqueteBackend, obtenerPaquetesBackend } from '../services/paquetesService';
import { cargarUbicaciones } from '../services/ubicacionesService';
import { FaBoxOpen, FaLightbulb, FaCheckCircle, FaCube, FaLayerGroup, FaPlus, FaTimes } from 'react-icons/fa';
import '../styles/AnadirPaquete.scss';
import { useSubscription } from '../hooks/useSubscription';

/* ===== utils ===== */
const toUpperVis = (s='') => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const clamp = (v,min,max) => Math.max(min, Math.min(max, v));

/* ===== Sonidito dopamínico ===== */
let __AUDIO_CTX = null;
const playChime = (durationMs = 220) => {
  try {
    const ctx = __AUDIO_CTX || new (window.AudioContext || window.webkitAudioContext)();
    __AUDIO_CTX = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 880; // A5
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs/1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs/1000);
  } catch {}
};

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
  // huecos
  for (let k = 0; k < count; k++) {
    if (!byIdx[k]) byIdx[k] = { id: `ghost-${k}`, label: `B${k+1}`, orden: k, activo: true };
  }

  // 2) aplicar orden visual con meta
  const posToIdx = buildPosToIdx(count, cols, order);
  const visual = Array.from({ length: count }, (_, pos) => byIdx[posToIdx[pos]]);
  return { visual, cols, order };
}

/* ====== Fuzzy match para nombres de cliente (tolerante a typos) ====== */
function levenshtein(a, b) {
  a = toUpperVis(a); b = toUpperVis(b);
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array(n+1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,       // deletion
        dp[j-1] + 1,     // insertion
        prev + cost      // substitution
      );
      prev = tmp;
    }
  }
  return dp[n];
}
function similarity(a, b) {
  const A = toUpperVis(a), B = toUpperVis(b);
  if (!A || !B) return 0;
  const dist = levenshtein(A, B);
  return 1 - dist / Math.max(A.length, B.length);
}
function bestClientSuggestion(input, paquetesPendientes, threshold = 0.55) {
  const q = toUpperVis(input);
  if (!q) return null;

  // nombres únicos y su “peso” = nº de paquetes pendientes
  const counts = new Map();
  for (const p of paquetesPendientes) {
    const name = toUpperVis(p?.nombre_cliente || '');
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  // evaluar similitud
  let best = null;
  for (const [name, cnt] of counts.entries()) {
    // si el nombre ya contiene claramente la query o viceversa, prioriza
    const containBoost = (name.includes(q) || q.includes(name)) ? 0.15 : 0;
    const score = similarity(q, name) + containBoost + Math.min(0.25, Math.log10(cnt + 1) * 0.1);
    if (score >= threshold && (!best || score > best.score)) {
      best = { name, score, count: cnt };
    }
  }
  return best;
}

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

  // Sugerencia fuzzy
  const [sugCliente, setSugCliente] = useState(null); // {name, count}
  const [matchInfo, setMatchInfo] = useState(null);   // {label, count}

  // Ubicaciones del backend (crudo) + meta
  const [rawUbicaciones, setRawUbicaciones] = useState([]);
  const [metaUbi, setMetaUbi] = useState({ cols: 5, order: 'horizontal' });

  // Derivados visuales
  const { visual: ubicaciones, cols } = useMemo(
    () => makeVisualUbicaciones(rawUbicaciones, metaUbi),
    [rawUbicaciones, metaUbi]
  );

  // Paquetes actuales (para ocupación y sugerencias)
  const [paquetes, setPaquetes] = useState([]);

  // selección { id, label }
  const [slotSel, setSlotSel] = useState(null);
  const [seleccionManual, setSeleccionManual] = useState(false);

  // UI
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);

  // UI múltiple
  const [multiOpen, setMultiOpen] = useState(false);
  const [multiCount, setMultiCount] = useState(5);
  const [multiSameShelf, setMultiSameShelf] = useState(true);
  const [multiSameCompany, setMultiSameCompany] = useState(true);
  const [multiNames, setMultiNames] = useState(() => Array.from({length:5}, ()=>'')); // se adapta dinámicamente
  const [multiSaving, setMultiSaving] = useState(false);

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
        const { data: { session} } = await supabase.auth.getSession();
        const token = session?.access_token;
        const ub = await cargarUbicaciones(token, tid); // { ubicaciones, meta }
        if (cancel) return;
        setRawUbicaciones(Array.isArray(ub?.ubicaciones) ? ub.ubicaciones : []);
        setMetaUbi({ cols: ub?.meta?.cols ?? 5, order: ub?.meta?.order ?? ub?.meta?.orden ?? 'horizontal' });

        // Paquetes (para ocupación y sugerencias)
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

  // helpers slots
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

  // autoselección mientras se escribe + sugerencia fuzzy
  useEffect(() => {
    // sugerencia fuzzy basada en paquetes pendientes
    const pendientes = paquetes.filter(p => !p.entregado);
    const sug = bestClientSuggestion(cliente, pendientes);
    setSugCliente(sug);

    if (seleccionManual) return;
    // si el texto coincide EXACTO con un cliente pendiente, autoselecciona su balda
    const slot = pickForClient(cliente) || getMostEmptySlot();
    if (slot) setSlotSel(slot);

    // info de coincidencia para mensajito en cursiva (solo si hay sugerencia y AÚN no es igual)
    if (sug && toUpperVis(cliente) !== toUpperVis(sug.name)) {
      // ¿en qué balda tiene paquetes pendientes?
      let bestLabel = null;
      let cnt = 0;
      for (const p of pendientes) {
        if (toUpperVis(p.nombre_cliente) === toUpperVis(sug.name)) {
          const label = String(p.ubicacion_label ?? p.compartimento ?? '').toUpperCase() || null;
          if (label) { bestLabel = bestLabel || label; cnt++; }
        }
      }
      setMatchInfo(bestLabel ? { label: bestLabel, count: cnt } : { label: null, count: 0 });
    } else {
      setMatchInfo(null);
    }
  }, [cliente, paquetes, seleccionManual, pickForClient, getMostEmptySlot]);

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

  // ===== Guardar (single) =====
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
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const temp = {
        id: tempId,
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        entregado: false,
        fecha_llegada: ahora,
        created_at: ahora,
        compartimento: slotAtSave.label,
        balda_id: slotAtSave.id ?? null,
        ubicacion_label: slotAtSave.label,
        ubicacion_id: slotAtSave.id ?? null
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

  // ===== Guardar múltiple =====
  const guardarMultiple = useCallback(async () => {
    if (multiSaving) return;

    const names = multiNames
      .slice(0, clamp(multiCount, 1, 100))
      .map(n => toUpperVis(n.trim()))
      .filter(Boolean);

    if (!names.length) {
      alert('Introduce al menos un nombre de cliente.');
      return;
    }
    if (!canCreate) {
      alert('Tu prueba está agotada. Elige un plan para seguir creando paquetes.');
      return;
    }
    if (!compania) {
      alert('Selecciona una empresa de transporte.');
      return;
    }

    // comprobar límite de plan si existe
    const left = Number(entitlements?.limits?.packages_left);
    if (Number.isFinite(left) && left < names.length) {
      alert(`Tu plan solo permite crear ${left} paquete(s) más ahora mismo.`);
      return;
    }

    try {
      setMultiSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !tenant?.id) throw new Error('Faltan datos para registrar los paquetes.');

      // Determinar balda de referencia si "misma balda"
      let commonSlot = null;
      if (multiSameShelf) {
        if (slotSel?.label || slotSel?.id) {
          commonSlot = { ...slotSel };
        } else if (names[0]) {
          commonSlot = pickForClient(names[0]) || getMostEmptySlot();
        } else {
          commonSlot = getMostEmptySlot();
        }
      }

      // Optimista: insertar todos
      const ahora = new Date().toISOString();
      const temps = names.map((n, i) => {
        const slot = multiSameShelf ? (commonSlot || getMostEmptySlot()) : (pickForClient(n) || getMostEmptySlot());
        return {
          id: `temp_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
          nombre_cliente: n,
          empresa_transporte: multiSameCompany ? (compania || '') : (compania || ''), // (si quisieras por-paquete: cámbialo aquí)
          entregado: false,
          fecha_llegada: ahora,
          created_at: ahora,
          compartimento: slot?.label || null,
          balda_id: slot?.id ?? null,
          ubicacion_label: slot?.label || null,
          ubicacion_id: slot?.id ?? null
        };
      });
      setPaquetes(prev => [...temps, ...prev]);

      // Backend: de uno en uno para poder mapear IDs
      for (const temp of temps) {
        const payload = {
          tenant_id: tenant.id,
          nombre_cliente: temp.nombre_cliente,
          empresa_transporte: temp.empresa_transporte,
          ubicacion_label: temp.ubicacion_label,
          ...(temp.ubicacion_id ? { ubicacion_id: temp.ubicacion_id } : {}),
        };
        try {
          const creado = await crearPaqueteBackend(payload, token);
          if (creado?.id) {
            setPaquetes(prev => prev.map(p =>
              p.id === temp.id ? { ...p, id: creado.id, balda_id: creado.balda_id ?? p.balda_id } : p
            ));
          }
        } catch (err) {
          console.error('[AñadirPaquete] Error al guardar uno de los múltiples', err);
        }
      }

      localStorage.setItem('ap_last_company', compania);
      playChime(260);
      setExito(true);
      setUltimoGuardado(commonSlot || null);
      setTimeout(() => setExito(false), 1800);

      // Reset nombres (mantiene configuración)
      setMultiNames(Array.from({length: multiCount}, ()=> ''));
    } catch (err) {
      console.error('[AñadirPaquete] Error múltiple', err);
      alert(err?.message || 'No se pudieron crear todos los paquetes.');
    } finally {
      setMultiSaving(false);
    }
  }, [
    multiSaving, multiNames, multiCount, multiSameShelf, multiSameCompany,
    canCreate, compania, entitlements?.limits?.packages_left, tenant,
    pickForClient, getMostEmptySlot
  ]);

  // ===== UI helpers =====
  const aceptarSugerenciaCliente = useCallback(() => {
    if (!sugCliente) return;
    const nombre = sugCliente.name;
    setCliente(nombre);
    setSeleccionManual(false); // permitimos que pickForClient actúe
    const slot = pickForClient(nombre);
    if (slot) setSlotSel(slot);
    playChime(220);
  }, [sugCliente, pickForClient]);

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

        {/* Botón modo múltiple */}
        <div className="acciones-cabecera">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMultiOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={multiOpen}
            title="Añadir varios paquetes de golpe"
          >
            <FaLayerGroup aria-hidden="true" style={{ marginRight: 8 }} />
            Añadir varios a la vez
          </button>
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
                aria-describedby="cliente-hint cliente-suggestion"
              />

              {/* Sugerencia fuzzy bajo el input */}
              {sugCliente && toUpperVis(cliente) !== toUpperVis(sugCliente.name) && (
                <div id="cliente-suggestion" className="sugerencia-cliente">
                  <button
                    type="button"
                    className="suggestion-pill"
                    onClick={aceptarSugerenciaCliente}
                    title="Usar este cliente y autoseleccionar su balda"
                  >
                    ¿Querías decir <strong>{sugCliente.name}</strong>? Pulsa para usarlo.
                  </button>
                </div>
              )}

              {/* Mensajito en cursiva si hay coincidencia con paquetes pendientes */}
              {matchInfo?.label && (
                <em id="cliente-hint" className="match-hint">
                  Hay otro paquete pendiente de este cliente en <strong>{matchInfo.label}</strong>.
                </em>
              )}
            </div>

            <div className="campo">
              <label>Empresa de transporte</label>
              <select
                value={compania}
                onChange={(e) => setCompania(e.target.value)}
                aria-label="Empresa de transporte"
              >
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

      {/* ===== Panel / Modal MODO MÚLTIPLE ===== */}
      {multiOpen && (
        <div className="multi-overlay" role="dialog" aria-modal="true" aria-label="Añadir varios paquetes">
          <div className="multi-panel">
            <div className="multi-head">
              <h3><FaLayerGroup aria-hidden="true" style={{ marginRight: 8 }} /> Añadir varios paquetes</h3>
              <button className="icon-btn" onClick={() => setMultiOpen(false)} aria-label="Cerrar">
                <FaTimes />
              </button>
            </div>

            <div className="multi-body">
              <div className="multi-row">
                <label className="multi-label">¿Cuántos paquetes vas a añadir de golpe?</label>
                <div className="multi-controls">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={multiCount}
                    onChange={(e) => {
                      const v = clamp(parseInt(e.target.value||'1',10) || 1, 1, 100);
                      setMultiCount(v);
                      setMultiNames(prev => {
                        const next = [...prev];
                        if (next.length < v) {
                          while (next.length < v) next.push('');
                        } else if (next.length > v) {
                          next.length = v;
                        }
                        return next;
                      });
                    }}
                    className="multi-number"
                  />
                </div>
              </div>

              <div className="multi-row">
                <label className="multi-check">
                  <input
                    type="checkbox"
                    checked={multiSameShelf}
                    onChange={(e)=>setMultiSameShelf(e.target.checked)}
                  />
                  <span>Usar la misma balda para todos</span>
                </label>
                <small className="muted">
                  Si está activo, se usará la balda seleccionada arriba o la sugerida del primer nombre.
                </small>
              </div>

              <div className="multi-row">
                <label className="multi-check">
                  <input
                    type="checkbox"
                    checked={multiSameCompany}
                    onChange={(e)=>setMultiSameCompany(e.target.checked)}
                  />
                  <span>Misma empresa de transporte para todos</span>
                </label>
                <small className="muted">
                  Se usará la empresa seleccionada en “Datos del paquete”.
                </small>
              </div>

              <div className="multi-grid">
                {Array.from({length: multiCount}).map((_,i)=>(
                  <div key={i} className="multi-item">
                    <label>Cliente #{i+1}</label>
                    <input
                      type="text"
                      placeholder="Nombre cliente…"
                      value={multiNames[i] || ''}
                      onChange={(e)=>{
                        const val = toUpperVis(e.target.value);
                        setMultiNames(prev => {
                          const next = [...prev];
                          next[i] = val;
                          return next;
                        });
                      }}
                      maxLength={80}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="multi-foot">
              <button
                type="button"
                className="btn-secondary"
                onClick={()=> setMultiOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={guardarMultiple}
                disabled={multiSaving || !canCreate || !compania}
                title={!canCreate ? 'Desbloquea tu plan' : ''}
              >
                <FaPlus aria-hidden="true" style={{ marginRight: 8 }} />
                {multiSaving ? 'Guardando…' : `Guardar ${multiCount} paquete${multiCount!==1?'s':''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {exito && (
        <div className="modal-exito modal-exito--giant" role="status" aria-live="polite">
          <div className="contenido">
            <FaCheckCircle aria-hidden="true" />
            <div>
              <h3>¡Paquete guardado!</h3>
              <p>
                {ultimoGuardado?.label
                  ? <>Se registró en <strong>{ultimoGuardado.label}</strong>.</>
                  : <>Se registró correctamente.</>
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
