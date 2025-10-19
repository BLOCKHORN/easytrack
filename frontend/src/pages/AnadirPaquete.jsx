// src/pages/AnadirPaquete.jsx
import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getTenantIdOrThrow } from '../utils/tenant';
import { crearPaqueteBackend, obtenerPaquetesBackend } from '../services/paquetesService';
import { cargarUbicaciones } from '../services/ubicacionesService';
import { FaBoxOpen, FaLightbulb, FaCheckCircle, FaCube, FaLayerGroup, FaPlus, FaTimes } from 'react-icons/fa';
import '../styles/AnadirPaquete.scss';

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

const idxFromLabel = (label) => {
  const m = /^B\s*(\d+)$/i.exec(String(label||'').trim());
  return m ? (parseInt(m[1],10)-1) : null;
};

function makeVisualUbicaciones(rawUbis, meta) {
  const cols = clamp(parseInt(meta?.cols ?? 5,10) || 5, 1, 12);
  const order = (meta?.order || meta?.orden) === 'vertical' ? 'vertical' : 'horizontal';

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
  for (let k = 0; k < count; k++) {
    if (!byIdx[k]) byIdx[k] = { id: `ghost-${k}`, label: `B${k+1}`, orden: k, activo: true };
  }

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
      dp[j] = Math.min(dp[j] + 1, dp[j-1] + 1, prev + cost);
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

  const counts = new Map();
  for (const p of paquetesPendientes) {
    const name = toUpperVis(p?.nombre_cliente || '');
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  let best = null;
  for (const [name, cnt] of counts.entries()) {
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

  // Empresas
  const [companias, setCompanias] = useState([]);
  const [compania, setCompania]   = useState('');
  const [cliente, setCliente]     = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'multi'

  // Batch (pestaña múltiple)
  const [multiCount, setMultiCount] = useState(5);
  const [multiNames, setMultiNames] = useState(() => Array.from({length:5}, ()=>'')); // se adapta dinámicamente
  const [batchSameCompany, setBatchSameCompany] = useState(true);
  const [batchCompany, setBatchCompany] = useState('');
  const [multiCompanies, setMultiCompanies] = useState(() => Array.from({length:5}, ()=>'')); // por fila cuando no es “misma empresa”
  const [multiSaving, setMultiSaving] = useState(false);

  // Sugerencia fuzzy
  const [sugCliente, setSugCliente] = useState(null); // {name, count}
  const [matchInfo, setMatchInfo] = useState(null);   // {label, count}

  // Ubicaciones + meta
  const [rawUbicaciones, setRawUbicaciones] = useState([]);
  const [metaUbi, setMetaUbi] = useState({ cols: 5, order: 'horizontal' });

  // Derivados visuales
  const { visual: ubicaciones, cols } = useMemo(
    () => makeVisualUbicaciones(rawUbicaciones, metaUbi),
    [rawUbicaciones, metaUbi]
  );

  // Paquetes actuales
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

  // ===== CSS inline adicional (tabs, chips XL y resaltados) =====
  const extraStyles = `
  @keyframes pulseGlowX { 
    0%, 100% { box-shadow: 0 0 0.25rem rgba(99,91,255,0.25), 0 0 0 rgba(0,0,0,0); }
    50% { box-shadow: 0 0 1rem rgba(99,91,255,0.55), 0 0 0.25rem rgba(0,0,0,0.06); }
  }
  .pulse-constant { animation: pulseGlowX 1.4s ease-in-out infinite; }
  .glow-strong  { outline: 2px solid rgba(99,91,255,0.35); border-color: rgba(99,91,255,0.55) !important; }
  .top-tabs{ display:flex; gap:8px; align-items:center; padding:8px; background:#fff; border:1px solid var(--line); border-radius:12px; box-shadow:0 4px 16px rgba(13,34,79,.06); }
  .top-tabs .tab{
    appearance:none; border:none; background:#f3f6fb; color:var(--text); font-weight:900; letter-spacing:.01em;
    padding:10px 14px; border-radius:10px; cursor:pointer; transition:filter .18s ease, transform .06s ease, background .18s ease;
  }
  .top-tabs .tab:hover{ filter:brightness(1.02); transform:translateY(-1px); }
  .top-tabs .tab.active{ background:var(--brand); color:#fff; box-shadow:0 6px 18px rgba(37,99,235,.25); }
  .chips.xl { gap:16px; }
  .chip.square { min-width:280px; min-height:110px; border-radius:16px; display:grid; grid-auto-flow:row; align-content:center; justify-items:center; text-align:center; }
  .chip.square .lbl{ font-size:13px; }
  .chip.square .pill{ font-size:26px; padding:10px 16px; }
  .balda.is-suggested::after, .balda.is-related::after, .balda.is-activePulse::after{
    content:''; position:absolute; inset:-4px; border-radius:12px; box-shadow:0 0 .75rem rgba(99,91,255,.6);
    animation:pulseGlowX 1.4s ease-in-out infinite; pointer-events:none;
  }
  `;

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
          const defaultCompany = (lastCompany && lista.includes(lastCompany)) ? lastCompany : (lista[0] || '');
          setCompania(defaultCompany);
          setBatchCompany(defaultCompany);
          setMultiCompanies(prev => prev.map(v => v || defaultCompany));
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

  // 🔎 selección por cliente
  const pickForClient = useCallback((clienteNombre) => {
    const up = toUpperVis(clienteNombre || '');
    if (!up) return getMostEmptySlot();

    const pendientes = paquetes.filter(p => !p.entregado);
    const matches = pendientes.filter(p => toUpperVis(p?.nombre_cliente || '') === up);

    if (matches.length) {
      const counter = new Map(); // label -> {count, latestISO, idGuess}
      for (const p of matches) {
        const label = String(p.ubicacion_label ?? p.compartimento ?? '').toUpperCase() || null;
        if (!label) continue;
        const prev = counter.get(label) || { count:0, latestISO:'', idGuess: p.ubicacion_id ?? p.balda_id ?? null };
        prev.count += 1;
        const ts = String(p.fecha_llegada || p.created_at || '');
        if (!prev.latestISO || (ts && ts > prev.latestISO)) prev.latestISO = ts;
        if (p.ubicacion_id || p.balda_id) prev.idGuess = p.ubicacion_id ?? p.balda_id;
        counter.set(label, prev);
      }
      if (counter.size) {
        const bestLabel = [...counter.entries()].sort((a,b)=>{
          const ca=a[1].count, cb=b[1].count;
          if (cb!==ca) return cb-ca;
          return (b[1].latestISO || '').localeCompare(a[1].latestISO || '');
        })[0][0];

        const guessId = counter.get(bestLabel)?.idGuess ?? null;
        if (guessId != null) {
          const u = ubicaciones.find(x => String(x.id) === String(guessId));
          if (u) return { id: u.id, label: u.label };
        }
        const u = ubicaciones.find(x => x.label === bestLabel);
        if (u) return { id: u.id, label: u.label };
        return { id: null, label: bestLabel };
      }
    }
    return getMostEmptySlot();
  }, [paquetes, ubicaciones, getMostEmptySlot]);

  /* ========= Unificamos fuente de nombre para SINGLE y MULTI ========= */
  const leadingName = activeTab === 'single' ? cliente : (multiNames[0] || '');
  const setLeadingName = useCallback((val) => {
    const up = toUpperVis(val);
    if (activeTab === 'single') {
      setCliente(up);
    } else {
      setMultiNames(prev => {
        const next = [...prev];
        next[0] = up;
        return next;
      });
    }
  }, [activeTab]);

  // autoselección + sugerencias (usa leadingName)
  useEffect(() => {
    const pendientes = paquetes.filter(p => !p.entregado);
    const sug = bestClientSuggestion(leadingName, pendientes);
    setSugCliente(sug);

    if (!seleccionManual) {
      const slot = pickForClient(leadingName) || getMostEmptySlot();
      if (slot) setSlotSel(slot);
    }

    if (sug && toUpperVis(leadingName) !== toUpperVis(sug.name)) {
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
  }, [leadingName, paquetes, seleccionManual, pickForClient, getMostEmptySlot]);

  const suggestedLabel = useMemo(() => {
    const s = pickForClient(leadingName) || getMostEmptySlot();
    return s?.label || '';
  }, [leadingName, pickForClient, getMostEmptySlot]);

  const puedeGuardar = useMemo(
    () => cliente.trim() && compania && slotSel && (slotSel.id || slotSel.label),
    [cliente, compania, slotSel]
  );

  const suggestionPulse = !!(sugCliente || matchInfo?.label);
  const selectedPulse   = !!(seleccionManual || sugCliente || matchInfo?.label);

  // ===== util: redimensionar arrays cuando cambia el count =====
  const applyNewMultiCount = useCallback((v) => {
    const n = clamp(v|0, 1, 20);
    setMultiCount(n);

    setMultiNames(prev => {
      const next = [...prev];
      if (next.length < n) {
        while (next.length < n) next.push('');
      } else if (next.length > n) {
        next.length = n;
      }
      return next;
    });

    setMultiCompanies(prev => {
      const next = [...prev];
      if (next.length < n) {
        while (next.length < n) next.push(batchSameCompany ? (batchCompany || compania) : (companias[0] || ''));
      } else if (next.length > n) {
        next.length = n;
      }
      return next;
    });
  }, [batchSameCompany, batchCompany, compania, companias]);

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

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !tenant?.id) throw new Error('Faltan datos para registrar el paquete.');

      const upperCliente = toUpperVis(cliente.trim());
      if (!upperCliente) throw new Error('Falta nombre del cliente.');
      if (!compania) throw new Error('Falta empresa de transporte.');

      const slotLabel = String(
        (slotSel?.label || (Number.isFinite(Number(slotSel?.id)) ? `B${Number(slotSel.id)}` : ''))
      ).trim().toUpperCase();
      if (!slotLabel) throw new Error('No hay compartimento/ubicación seleccionada.');

      const slotAtSave = {
        type: slotSel?.type || 'shelf',
        id: Number.isFinite(Number(slotSel?.id)) ? Number(slotSel.id) : null,
        label: slotLabel,
      };

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

      const payload = {
        tenant_id: tenant.id,
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        ubicacion_label: slotAtSave.label,
        ...(slotAtSave.id ? { ubicacion_id: slotAtSave.id } : {}),
      };
      const creado = await crearPaqueteBackend(payload, token);
      if (!creado?.id) throw new Error('No se pudo crear el paquete en backend.');

      setPaquetes(prev => prev.map(p =>
        p.id === tempId ? { ...p, id: creado.id, balda_id: creado.balda_id ?? p.balda_id } : p
      ));

      localStorage.setItem('ap_last_company', compania);

      setUltimoGuardado(slotAtSave);
      setExito(true);
      setTimeout(() => setExito(false), 1800);

      setCliente('');
      setSeleccionManual(false);
      startTransition(() => inputClienteRef.current?.focus());
    } catch (err) {
      console.error('[AñadirPaquete] Error al guardar', err);
      alert(err?.message || 'No se pudo guardar el paquete. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  }, [loading, tenant, cliente, compania, slotSel, flyFromInputToSlot]);

  // ===== Guardar múltiple (pestaña) =====
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
    if (batchSameCompany && !batchCompany) {
      alert('Elige una empresa para todos.');
      return;
    }

    try {
      setMultiSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !tenant?.id) throw new Error('Faltan datos para registrar los paquetes.');

      // Determinar balda común (siempre misma balda)
      let commonSlot = null;
      if (slotSel?.label || slotSel?.id) {
        commonSlot = { ...slotSel };
      } else if (names[0]) {
        commonSlot = pickForClient(names[0]) || getMostEmptySlot();
      } else {
        commonSlot = getMostEmptySlot();
      }

      const ahora = new Date().toISOString();

      // Empresas por fila
      const companiesForRows = names.map((_, i) =>
        batchSameCompany ? (batchCompany || compania) : (multiCompanies[i] || compania)
      );

      // Optimista
      const temps = names.map((n, i) => ({
        id: `temp_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
        nombre_cliente: n,
        empresa_transporte: companiesForRows[i],
        entregado: false,
        fecha_llegada: ahora,
        created_at: ahora,
        compartimento: commonSlot?.label || null,
        balda_id: commonSlot?.id ?? null,
        ubicacion_label: commonSlot?.label || null,
        ubicacion_id: commonSlot?.id ?? null
      }));
      setPaquetes(prev => [...temps, ...prev]);

      // Backend
      for (let i = 0; i < temps.length; i++) {
        const temp = temps[i];
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

      localStorage.setItem('ap_last_company', batchSameCompany ? batchCompany : compania);
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
    multiSaving, multiNames, multiCount, batchSameCompany, batchCompany,
    multiCompanies, compania, tenant, pickForClient, getMostEmptySlot, slotSel
  ]);

  // ===== UI helpers =====
  const aceptarSugerenciaCliente = useCallback(() => {
    if (!sugCliente) return;
    const nombre = sugCliente.name;
    setLeadingName(nombre);
    setSeleccionManual(false);
    const slot = pickForClient(nombre);
    if (slot) setSlotSel(slot);
    playChime(220);
  }, [sugCliente, setLeadingName, pickForClient]);

  // ===== Render =====
  return (
    <div className="anadir-paquete">
      <style dangerouslySetInnerHTML={{ __html: extraStyles }} />
      <div id="fly-layer" ref={flyLayerRef} aria-hidden="true" />

      <header className="cabecera">
        <div className="titulo">
          <FaBoxOpen aria-hidden="true" />
          <div>
            <h1>Añadir paquete</h1>
            <p>Registra el paquete y elige la ubicación.</p>
          </div>
        </div>

        <div className="top-tabs" role="tablist" aria-label="Modo de alta">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab==='single'}
            className={`tab ${activeTab==='single' ? 'active' : ''}`}
            onClick={()=> setActiveTab('single')}
          >
            Datos del paquete
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab==='multi'}
            className={`tab ${activeTab==='multi' ? 'active' : ''}`}
            onClick={()=> setActiveTab('multi')}
          >
            Modo múltiple
          </button>
        </div>
      </header>

      <form className="form" onSubmit={activeTab==='single' ? guardar : (e)=>{ e.preventDefault(); guardarMultiple(); }}>
        {activeTab === 'single' ? (
          <section className="panel datos" aria-labelledby="panel-single">
            <h2 id="panel-single">Datos del paquete</h2>
            <p className="hint">Completa el cliente, la empresa y confirma la ubicación.</p>

            <div className="fila">
              <div className="campo">
                <label>Nombre del cliente</label>
                <input
                  ref={inputClienteRef}
                  type="text"
                  placeholder="Añadir cliente…"
                  value={cliente}
                  onChange={e => { setLeadingName(e.target.value); setSeleccionManual(false); }}
                  autoComplete="off"
                  maxLength={80}
                  aria-describedby="cliente-hint cliente-suggestion"
                />

                {sugCliente && toUpperVis(leadingName) !== toUpperVis(sugCliente.name) && (
                  <div id="cliente-suggestion" className="sugerencia-cliente">
                    <button
                      type="button"
                      className={`suggestion-pill ${suggestionPulse ? 'pulse-constant glow-strong' : ''}`}
                      onClick={aceptarSugerenciaCliente}
                      title="Usar este cliente y autoseleccionar su balda"
                    >
                      ¿Querías decir <strong>{sugCliente.name}</strong>? Pulsa para usarlo.
                    </button>
                  </div>
                )}

                {matchInfo?.label && (
                  <em id="cliente-hint" className="match-hint">
                    Hay otro paquete pendiente de este cliente en <strong className="pulse-constant glow-strong">{matchInfo.label}</strong>.
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
              <div className="chips xl">
                <span className={`chip chip--hint square ${suggestionPulse ? 'pulse-constant glow-strong' : ''}`}>
                  <FaLightbulb aria-hidden="true" />
                  <span className="lbl">Sugerencia</span>
                  <code className="pill">{suggestedLabel || '—'}</code>
                </span>

                <span className={`chip chip--selected square ${selectedPulse ? 'pulse-constant glow-strong' : ''}`}>
                  <FaCheckCircle aria-hidden="true" />
                  <span className="lbl">Seleccionado</span>
                  <code className="pill">{slotSel?.label || '—'}</code>
                </span>
              </div>

              <div className="acciones-centro">
                <button type="submit" className="btn-primary btn-xl" disabled={!puedeGuardar || loading}>
                  {loading ? 'Guardando…' : 'Guardar paquete'}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="panel multiple open" aria-labelledby="panel-multi">
            <div className="multiple-head">
              <h2 id="panel-multi"><FaLayerGroup style={{ marginRight: 8 }} /> Añadir varios paquetes</h2>
              <p className="hint">
                Introduce varios nombres. Usarán la <strong>misma ubicación</strong> seleccionada/sugerida.
                {slotSel?.label && <> Actual: <strong>{slotSel.label}</strong>.</>}
              </p>
            </div>

            <div className="multiple-config">
              <div className="row">
                <label className="multi-label">¿Cuántos paquetes vas a añadir?</label>
                <div className="multi-controls">
                  {/* === NUEVO: selector 1..20 en lugar del input numérico === */}
                  <select
                    className="multi-select"
                    value={multiCount}
                    onChange={(e)=> applyNewMultiCount(parseInt(e.target.value,10) || 1)}
                    aria-label="Cantidad de paquetes a añadir"
                  >
                    {Array.from({length:20},(_,i)=>(<option key={i+1} value={i+1}>{i+1}</option>))}
                  </select>
                </div>
              </div>

              <div className="row">
                <label className="multi-check">
                  <input
                    type="checkbox"
                    checked={batchSameCompany}
                    onChange={(e)=> setBatchSameCompany(e.target.checked)}
                  />
                  <span>Misma empresa para todos</span>
                </label>

                {batchSameCompany ? (
                  <div className="row" style={{ marginTop: 8 }}>
                    <label className="multi-label">Empresa para todos</label>
                    <select
                      value={batchCompany}
                      onChange={(e)=> setBatchCompany(e.target.value)}
                      className="multi-select"
                    >
                      {companias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ) : (
                  <small className="muted" style={{ marginTop: 6 }}>
                    Si no marcas “misma empresa”, podrás elegir la empresa <strong>por cada fila</strong>.
                  </small>
                )}
              </div>
            </div>

            {/* === Chips de Sugerencia / Seleccionado también en MULTI === */}
            <div className="bloque-central" style={{ marginTop: 10 }}>
              <div className="chips xl">
                <span className={`chip chip--hint square ${suggestionPulse ? 'pulse-constant glow-strong' : ''}`}>
                  <FaLightbulb aria-hidden="true" />
                  <span className="lbl">Sugerencia</span>
                  <code className="pill">{suggestedLabel || '—'}</code>
                </span>

                <span className={`chip chip--selected square ${selectedPulse ? 'pulse-constant glow-strong' : ''}`}>
                  <FaCheckCircle aria-hidden="true" />
                  <span className="lbl">Seleccionado</span>
                  <code className="pill">{slotSel?.label || '—'}</code>
                </span>
              </div>
            </div>

            {/* === Grid de nombres (con sugerencias para el PRIMERO) === */}
            <div className="multi-grid">
              {Array.from({length: multiCount}).map((_,i)=>(
                <div key={i} className="multi-item">
                  <label>Cliente #{i+1}</label>
                  <input
                    type="text"
                    placeholder="Nombre cliente…"
                    value={multiNames[i] || ''}
                    onChange={(e)=>{
                      const val = e.target.value;
                      setMultiNames(prev => {
                        const next = [...prev];
                        next[i] = toUpperVis(val);
                        return next;
                      });
                      if (i === 0) {
                        setSeleccionManual(false);
                        setLeadingName(val);
                      }
                    }}
                    maxLength={80}
                    aria-describedby={i===0 ? "multi-0-hint multi-0-suggestion" : undefined}
                  />

                  {/* Sugerencia fuzzy SOLO bajo el PRIMER input */}
                  {i===0 && sugCliente && toUpperVis(leadingName) !== toUpperVis(sugCliente.name) && (
                    <div id="multi-0-suggestion" className="sugerencia-cliente" style={{ marginTop: 6 }}>
                      <button
                        type="button"
                        className={`suggestion-pill ${suggestionPulse ? 'pulse-constant glow-strong' : ''}`}
                        onClick={aceptarSugerenciaCliente}
                        title="Usar este cliente y autoseleccionar su balda"
                      >
                        ¿Querías decir <strong>{sugCliente.name}</strong>? Pulsa para usarlo.
                      </button>
                    </div>
                  )}

                  {/* Hint → proponer misma balda */}
                  {i===0 && matchInfo?.label && (
                    <em id="multi-0-hint" className="match-hint" style={{ marginTop: 4 }}>
                      Hay otro paquete pendiente de este cliente en <strong className="pulse-constant glow-strong">{matchInfo.label}</strong>. 
                      Podemos ponerlos juntos.
                    </em>
                  )}

                  {!batchSameCompany && (
                    <select
                      className="multi-select"
                      value={multiCompanies[i] || (companias[0] || '')}
                      onChange={(e)=>{
                        const v = e.target.value;
                        setMultiCompanies(prev => {
                          const next = [...prev];
                          next[i] = v;
                          return next;
                        });
                      }}
                      title="Empresa de transporte para esta fila"
                      style={{ marginTop: 6 }}
                    >
                      {companias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>

            <div className="multiple-foot">
              <button
                type="button"
                className="btn-secondary"
                onClick={()=> setActiveTab('single')}
              >
                <FaTimes style={{ marginRight: 6 }} />
                Cerrar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={guardarMultiple}
                disabled={multiSaving || (batchSameCompany && !batchCompany)}
                title={(batchSameCompany && !batchCompany) ? 'Elige una empresa' : ''}
              >
                <FaPlus aria-hidden="true" style={{ marginRight: 8 }} />
                {multiSaving ? 'Guardando…' : `Guardar ${multiCount} paquete${multiCount!==1?'s':''}`}
              </button>
            </div>
          </section>
        )}

        {/* ========== REJILLA ========== */}
        <section className="panel rejilla">
          <h2>Ubicaciones</h2>
          <p className="hint">
            Selecciona una ubicación. Verás la ocupación actual.
            {activeTab==='multi' && slotSel?.label && <> Todos los nuevos se colocarán en <strong>{slotSel.label}</strong>.</>}
          </p>

          <div
            className="estantes-grid"
            style={{ gridTemplateColumns: `repeat(${cols || 5}, minmax(220px, 1fr))` }}
            role="group"
            aria-label="Selección de ubicación"
          >
            {ubicaciones.map(u => {
              const count = occupancy.get(u.id) || occupancy.get(u.label) || 0;
              const activa = slotSel?.id === u.id || slotSel?.label === u.label;
              const isSuggested = suggestedLabel && u.label === suggestedLabel;
              const isRelated = matchInfo?.label && u.label === matchInfo.label;
              const activePulse = activa && (seleccionManual || isSuggested || isRelated);
              return (
                <button
                  type="button"
                  key={u.id}
                  data-ubi-id={u.id}
                  data-ubi-label={u.label}
                  className={[
                    'balda',
                    count <= 4 ? 'verde' : count < 10 ? 'naranja' : 'rojo',
                    activa ? 'activa' : '',
                    isSuggested ? 'is-suggested' : '',
                    isRelated ? 'is-related' : '',
                    activePulse ? 'is-activePulse' : ''
                  ].join(' ').trim()}
                  onClick={() => { setSlotSel({ id: u.id, label: u.label }); setSeleccionManual(true); }}
                  aria-pressed={activa}
                  aria-label={`Ubicación ${u.label}, ${count} paquete${count!==1?'s':''}`}
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
