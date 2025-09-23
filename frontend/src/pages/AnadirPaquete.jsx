// src/pages/AnadirPaquete.jsx
import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getTenantIdOrThrow } from '../utils/tenant';
import {
  crearPaqueteBackend,
  obtenerPaquetesBackend,
  obtenerEstructuraEstantesYPaquetes,
} from '../services/paquetesService';
import { FaBoxOpen, FaLightbulb, FaCheckCircle, FaCube } from 'react-icons/fa';
import '../styles/AnadirPaquete.scss';

/* ================= Utils ================= */
const toUpperVis = (s='') => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const hexToRgba = (hex='#2563eb', a=0.08) => {
  const h = String(hex).replace('#','').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const num = (v, d=0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const pullPos = (o) => ({ row: num(o?.position?.row ?? o?.row ?? o?.r ?? o?.grid_row ?? o?.y, 1), col: num(o?.position?.col ?? o?.col ?? o?.c ?? o?.grid_col ?? o?.x, 1) });
const stripPrefix = (s='') => String(s).replace(/^\s*(carril|estante)\s+/i,'').trim();

/* ===== Fuzzy ===== */
const SIM_THRESHOLD = 0.42;
function bigrams(s=''){const t=toUpperVis(s);const out=[];for(let i=0;i<t.length-1;i++) out.push(t.slice(i,i+2));return out;}
function dice(a='',b=''){const A=bigrams(a),B=bigrams(b);if(!A.length||!B.length) return 0;const m=new Map();for(const g of A)m.set(g,(m.get(g)||0)+1);let inter=0;for(const g of B){const c=m.get(g)||0;if(c>0){inter++;m.set(g,c-1)}}return (2*inter)/(A.length+B.length);}
function fuzzyScore(candidate='',query=''){if(!query) return 0;const c=toUpperVis(candidate),q=toUpperVis(query);if(!c||!q) return 0;if(c===q) return 1;if(c.startsWith(q)) return 0.98;if(c.includes(q)) return 0.85;return clamp(0.55*dice(c,q),0,0.85);}

/* ===== Estructura (racks & shelves) ===== */
function extractBaldasFromEstructura(payload) {
  const out = [];
  const root = payload?.estructura;
  if (!Array.isArray(root)) return out;
  for (const est of root) {
    const estNum = num(est?.estante, NaN);
    const filas = Array.isArray(est?.filas) ? est.filas : [];
    for (const f of filas) {
      const idx = num(f?.idx ?? f?.index ?? f?.i ?? f?.balda, NaN);
      const id  = f?.id ?? `${estNum}:${idx}`;
      const label = (f?.name ?? f?.codigo ?? `${estNum}-${idx}`);
      if (Number.isFinite(estNum) && Number.isFinite(idx)) {
        out.push({ id, codigo: String(label), estante: estNum, balda: idx });
      }
    }
  }
  return out.sort((a,b)=> (a.estante-b.estante) || (a.balda-b.balda));
}

/* ===== Carga de paquetes ===== */
async function cargarPaquetesDesdeBackend() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || null;
    if (!token) throw new Error('NO_SESSION');
    const apiRows = await obtenerPaquetesBackend(token);
    return apiRows || [];
  } catch (err) {
    console.error('[AñadirPaquete] obtenerPaquetesBackend falló:', err?.message || err);
    return [];
  }
}

/* ===== Sonido agradable (pequeño “chime” de 2 tonos) ===== */
function playChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const now = ctx.currentTime;

    const mk = (freq, start, dur, gain=0.18) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + start);
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(gain, now + start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + start);
      o.stop(now + start + dur + 0.02);
    };

    mk(523.25, 0.00, 0.24, 0.20); // C5
    mk(659.25, 0.12, 0.30, 0.18); // E5
  } catch { /* noop */ }
}

export default function AnadirPaquete({ modoRapido = false }) {
  const [tenant, setTenant] = useState(null);

  // Layout & catálogo
  const [layoutMode, setLayoutMode] = useState('racks'); // 'lanes' | 'racks'
  const [grid, setGrid]   = useState({ rows: 1, cols: 1 });
  const [lanes, setLanes] = useState([]);
  const [baldas, setBaldas] = useState([]);
  const [rackOrder, setRackOrder] = useState([]);
  const [rackNameById, setRackNameById] = useState(() => new Map());

  // Refs destino (vuelo)
  const laneRefs = useRef(new Map());
  const baldaRefs = useRef(new Map());

  // Empresas
  const [companias, setCompanias] = useState([]);
  const [coloresCompania, setColoresCompania] = useState(new Map());
  const [compania, setCompania]   = useState('');
  const [cliente, setCliente]     = useState('');

  // Autocompletado (datalist)
  const [sugs, setSugs] = useState([]);

  // Selección
  const [compartimento, setCompartimento] = useState('');
  const [slotSel, setSlotSel] = useState(null);
  const [seleccionManual, setSeleccionManual] = useState(false);

  // Estado
  const [paquetes, setPaquetes] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [exito, setExito]       = useState(false);

  // READY flags
  const [readyEmpresas, setReadyEmpresas] = useState(false);
  const [readyLayout,   setReadyLayout]   = useState(false);
  const [readyBaldas,   setReadyBaldas]   = useState(false);

  const inputClienteRef = useRef(null);
  const flyLayerRef = useRef(null);

  // LS keys
  const LAST_COMPANY_KEY             = 'ultimaCompania';
  const LAST_SLOT_BY_COMPANY_KEY     = 'ultimaBaldaPorCompania';
  const LAST_COMPANY_BY_CLIENT_KEY   = 'ultimaCompaniaPorCliente';
  const LAST_SLOT_BY_CLIENT_KEY      = 'ultimaBaldaPorCliente';

  /* ===== Derivados ===== */
  const baldaMapByCodigo = useMemo(
    () => new Map(baldas.map(b => [String(b.codigo).toUpperCase(), b])),
    [baldas]
  );
  const lanesByName = useMemo(
    () => new Map(lanes.map(l => [String(l.name).toUpperCase(), l])),
    [lanes]
  );

  // Marca por compañía
  const colorCarrier = useMemo(() => {
    const hex = coloresCompania.get(compania) || '#2563eb';
    return /^#[0-9a-fA-F]{6}$/.test(String(hex)) ? hex : '#2563eb';
  }, [coloresCompania, compania]);
  const brandVars = useMemo(() => ({
    '--brand': colorCarrier,
    '--brand-rgba': hexToRgba(colorCarrier, 0.10),
    '--brand-ring': hexToRgba(colorCarrier, 0.36),
  }), [colorCarrier]);

  /* ================= CARGA ================= */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setReadyEmpresas(false); setReadyLayout(false); setReadyBaldas(false);
      try {
        // 1) Tenant
        const tid = await getTenantIdOrThrow();
        if (cancelado) return;
        setTenant({ id: tid });

        // 2) Empresas
        let empresasRows = [];
        try {
          const { data: empresasRes } = await supabase
            .from('empresas_transporte_tenant')
            .select('nombre,color')
            .eq('tenant_id', tid);
          empresasRows = empresasRes || [];
        } catch {}
        const nombres = empresasRows.map(e => e?.nombre).filter(Boolean).sort((a,b)=>a.localeCompare(b));
        setCompanias(nombres);
        const colorMap = new Map();
        empresasRows.forEach(e => colorMap.set(e?.nombre, e?.color || '#2563eb'));
        setColoresCompania(colorMap);
        const ultima = localStorage.getItem(LAST_COMPANY_KEY);
        setCompania(nombres.includes(ultima) ? ultima : (nombres[0] || ''));
        setReadyEmpresas(true);

        // 3) Paquetes
        const paquetesRaw = await cargarPaquetesDesdeBackend();
        if (cancelado) return;

        // 4) Layouts_meta
        let meta = null;
        try {
          const { data } = await supabase
            .from('layouts_meta')
            .select('mode, rows, cols, payload')
            .eq('org_id', tid)
            .maybeSingle();
          meta = data || null;
        } catch { meta = null; }

        const root = meta?.payload ? meta.payload : (meta || {});
        const mode = meta?.mode || root?.layout_mode || 'racks';
        const gridRowsHint = num(meta?.rows ?? root?.grid?.rows, 0);
        const gridColsHint = num(meta?.cols ?? root?.grid?.cols, 0);

        // Racks metadata
        const racksMeta = Array.isArray(root?.racks) ? root.racks : [];
        const rackNames = new Map();
        const shelfNamesByPair = new Map();
        const rackPositions = [];

        for (const r of (racksMeta || [])) {
          const rid = num(r?.id, NaN);
          if (!Number.isFinite(rid)) continue;
          if (r?.name) rackNames.set(rid, String(r.name));
          const pos = pullPos(r);
          if (Number.isFinite(pos.row) && Number.isFinite(pos.col)) {
            rackPositions.push({ est: rid, r: pos.row, c: pos.col });
          }
          const shelves = Array.isArray(r?.shelves) ? r.shelves : [];
          for (const s of shelves) {
            const idx = num(s?.index ?? s?.idx ?? s?.shelf_index ?? s?.i ?? s?.orden, NaN);
            if (!Number.isFinite(idx)) continue;
            if (s?.name) shelfNamesByPair.set(`${rid}-${idx}`, String(s.name));
          }
        }
        setRackNameById(rackNames);

        if (mode === 'lanes') {
          setLayoutMode('lanes');

          const lanesArr = Array.isArray(root?.lanes) ? root.lanes : [];
          const ls = (lanesArr || [])
            .map(l => ({
              id: num(l.id ?? l.lane_id, NaN),
              name: l.name || String(l.id ?? l.lane_id),
              color: l.color || '#f59e0b',
              position: pullPos(l),
            }))
            .filter(l => Number.isFinite(l.id))
            .sort((a,b)=> (a.position.row - b.position.row) || (a.position.col - b.position.col));
          setLanes(ls);

          const rows = gridRowsHint > 0 ? gridRowsHint : Math.max(1, ...(ls.map(x => x.position.row || 1)));
          const cols = gridColsHint > 0 ? gridColsHint : Math.max(1, ...(ls.map(x => x.position.col || 1)));
          setGrid({ rows, cols });

          const byId = new Map(ls.map(x => [x.id, x]));
          const mapped = paquetesRaw.map(p => {
            const laneId = Number.isFinite(Number(p.lane_id)) ? Number(p.lane_id) : null;
            const laneNameFromId = laneId != null ? (byId.get(laneId)?.name || null) : null;
            const rawComp = (typeof p.compartimento === 'string' && p.compartimento.trim()) ? p.compartimento.trim() : null;
            const compName = rawComp ? stripPrefix(rawComp) : null;
            return {
              ...p,
              created_at: p.fecha_llegada || null,
              lane_id: laneId,
              compartimento: compName || laneNameFromId || null,
            };
          });
          setPaquetes(mapped);
          setReadyLayout(true);
        } else {
          setLayoutMode('racks');

          // Estructura desde backend
          let baldasVirtuales = [];
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (token) {
              const estructura = await obtenerEstructuraEstantesYPaquetes(token).catch(()=>null);
              if (estructura) baldasVirtuales = extractBaldasFromEstructura(estructura);
            }
          } catch {}

          // Fallback tabla baldas
          if (!baldasVirtuales.length) {
            try {
              const { data: rows } = await supabase
                .from('baldas')
                .select('id, codigo, estante, balda')
                .eq('id_negocio', tid)
                .order('estante', { ascending: true })
                .order('balda', { ascending: true });
              baldasVirtuales = (rows || []).map(r => ({
                id: r.id,
                codigo: String(r.codigo || ''),
                estante: num(r.estante, 1),
                balda: num(r.balda, 1),
              }));
            } catch (e) {
              console.warn('[AñadirPaquete] Error leyendo baldas (RLS):', e?.message || e);
            }
          }

          // Aplicar nombres desde config si existen
          const baldasConNombres = baldasVirtuales.map(b => {
            const nm = shelfNamesByPair.get(`${b.estante}-${b.balda}`);
            return nm ? { ...b, codigo: String(nm) } : b;
          });

          setBaldas(baldasConNombres);
          setReadyBaldas(true);

          // Orden y grid exactos
          if (rackPositions.length) {
            rackPositions.sort((a,b)=> (a.r - b.r) || (a.c - b.c));
            setRackOrder(rackPositions.map(x => x.est));
            const maxR = Math.max(...rackPositions.map(x => x.r));
            const maxC = Math.max(...rackPositions.map(x => x.c));
            setGrid({
              rows: gridRowsHint > 0 ? gridRowsHint : (Number.isFinite(maxR) ? maxR : 1),
              cols: gridColsHint > 0 ? gridColsHint : (Number.isFinite(maxC) ? maxC : 1),
            });
          } else {
            const uniqueEst = Array.from(new Set(baldasConNombres.map(b => b.estante))).sort((a, b) => a - b);
            setRackOrder(uniqueEst);
            const n = uniqueEst.length || 1;
            const cols = Math.min(n, 6);
            const rows = Math.ceil(n / cols);
            setGrid({ rows, cols });
          }

          // Mapear paquetes respetando códigos
          const byCodigo = new Map(baldasConNombres.map(b => [String(b.codigo).toUpperCase(), b]));
          const mapped = paquetesRaw.map(p => {
            const code =
              (typeof p.compartimento === 'string' && p.compartimento.trim())
                ? p.compartimento.trim()
                : (p?.baldas?.codigo ? String(p.baldas.codigo) : null);

            const baldaIdFromCode = (() => {
              if (!code) return null;
              const found = byCodigo.get(code.toUpperCase());
              return found ? found.id : null;
            })();

            return {
              ...p,
              created_at: p.fecha_llegada || null,
              balda_id: p.balda_id ?? baldaIdFromCode ?? null,
              compartimento: code || null,
            };
          });

          setPaquetes(mapped);
          setReadyLayout(true);
        }

        startTransition(() => inputClienteRef.current?.focus());
      } catch (e) {
        console.error('[AñadirPaquete] Error de carga:', e);
      }
    })();

    return () => { cancelado = true; };
  }, []);

  /* ===== Ranking clientes ===== */
  const [clientesStats, setClientesStats] = useState(new Map());
  useEffect(() => {
    const map = new Map();
    const push = (name, company, slot) => {
      const key = toUpperVis(name || '');
      if (!key) return;
      const cur = map.get(key) || {
        norm: key, count: 0, lastCompany: null, lastSlot: null, lastDate: null,
        companyCounts: new Map(), slotCounts: new Map()
      };
      cur.count++;
      if (company) cur.lastCompany = company;
      if (slot)    cur.lastSlot = slot;
      cur.companyCounts.set(company, (cur.companyCounts.get(company)||0)+1);
      cur.slotCounts.set(slot, (cur.slotCounts.get(slot)||0)+1);
      cur.lastDate = new Date();
      map.set(key, cur);
    };
    paquetes.forEach(p => push(p.nombre_cliente, p.empresa_transporte ?? p.compania, p.compartimento || p.balda_id));
    setClientesStats(map);
  }, [paquetes]);

  const topClientes = useMemo(() => {
    const arr = [];
    clientesStats.forEach((v, k) => arr.push({
      nombre: k,
      norm: v.norm,
      count: v.count,
      topCompany: Array.from(v.companyCounts.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || v.lastCompany || null,
      topSlot: Array.from(v.slotCounts.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || v.lastSlot || null,
      lastDate: v.lastDate ? v.lastDate.getTime() : 0
    }));
    arr.sort((a,b)=> (b.count - a.count) || (b.lastDate - a.lastDate) || a.nombre.localeCompare(b.nombre));
    return arr;
  }, [clientesStats]);

  /* ===== Sugerencias (datalist) ===== */
  useEffect(() => {
    const q = toUpperVis(cliente.trim());
    const list = topClientes
      .map(c => {
        const s = q ? Math.max(fuzzyScore(c.nombre, q), c.nombre.startsWith(q) ? 1 : 0) : (0.4 + Math.min(c.count/50, 0.6));
        return { nombre: c.nombre, score: s };
      })
      .filter(x => q ? (x.score >= SIM_THRESHOLD || x.nombre.includes(q)) : true)
      .sort((a,b)=> (b.score - a.score) || a.nombre.localeCompare(b.nombre))
      .slice(0, 20)
      .map(x => x.nombre);
    setSugs(list);
  }, [cliente, topClientes]);

  /* ======= Selección inteligente de compartimento ======= */
  const conteo = useMemo(() => {
    const c = {};
    const inc = (k) => { if (!k) return; const s = String(k).toUpperCase(); c[s] = (c[s] || 0) + 1; };
    for (const p of paquetes) {
      const noEntregado = p.entregado === false || p.entregado == null;
      if (!noEntregado) continue;
      if (layoutMode === 'lanes') {
        const laneName = (p.compartimento || '').trim();
        const laneId   = Number.isFinite(Number(p.lane_id)) ? String(Number(p.lane_id)) : null;
        if (laneName) inc(laneName);
        if (laneId)   inc(laneId);
      } else {
        const code = (p.compartimento || p?.baldas?.codigo || '').toUpperCase().trim();
        const id   = Number.isFinite(Number(p?.balda_id)) ? String(Number(p.balda_id)) : null;
        if (code) inc(code);
        if (id)   inc(id);
      }
    }
    return c;
  }, [paquetes, layoutMode]);

  const listaCompartimentos = useMemo(() => {
    if (layoutMode === 'lanes') return lanes.map(l => l.name);
    return baldas.map(b => String(b.codigo).toUpperCase());
  }, [layoutMode, lanes, baldas]);

  const getUltimaBaldaPorCompania = (nombre) => { try { const map = JSON.parse(localStorage.getItem(LAST_SLOT_BY_COMPANY_KEY) || '{}'); return map?.[nombre] || ''; } catch { return '' } };
  const setUltimaBaldaPorCompania = (nombre, slot) => { try { const map = JSON.parse(localStorage.getItem(LAST_SLOT_BY_COMPANY_KEY) || '{}'); map[nombre] = slot; localStorage.setItem(LAST_SLOT_BY_COMPANY_KEY, JSON.stringify(map)); } catch {} };
  const getUltimaBaldaPorCliente = (cliente) => { try { const map = JSON.parse(localStorage.getItem(LAST_SLOT_BY_CLIENT_KEY) || '{}'); return map?.[cliente] || ''; } catch { return '' } };
  const setUltimaBaldaPorCliente = (cliente, slot) => { try { const map = JSON.parse(localStorage.getItem(LAST_SLOT_BY_CLIENT_KEY) || '{}'); map[cliente] = slot; localStorage.setItem(LAST_SLOT_BY_CLIENT_KEY, JSON.stringify(map)); } catch {} };

  const calcularBaldaSugerida = useCallback(() => {
    if (!listaCompartimentos.length) return '';
    const ranking = listaCompartimentos
      .map(nombre => ({ nombre, cantidad: conteo[nombre] || 0 }))
      .sort((a,b)=> (a.cantidad-b.cantidad) || a.nombre.localeCompare(b.nombre));
    return ranking[0]?.nombre || listaCompartimentos[0];
  }, [listaCompartimentos, conteo]);

  const smartSlotFor = useCallback((clienteNombre, company) => {
    const upper = toUpperVis(clienteNombre || '');
    if (!upper) return null;

    // 1) Pendiente exacto
    const matchExact = paquetes.find(p =>
      (p.entregado === false || p.entregado == null) &&
      toUpperVis(p.nombre_cliente || '') === upper
    );
    if (matchExact) {
      if (layoutMode === 'racks') {
        const byId = matchExact.balda_id ? baldas.find(b => String(b.id) === String(matchExact.balda_id)) : null;
        const byCode = matchExact.compartimento ? baldaMapByCodigo.get(String(matchExact.compartimento).toUpperCase()) : null;
        const b = byId || byCode;
        if (b) return { type:'shelf', id:b.id, label:String(b.codigo).toUpperCase() };
      } else {
        const byId = matchExact.lane_id ? lanes.find(l => Number(l.id) === Number(matchExact.lane_id)) : null;
        const byName = matchExact.compartimento ? lanesByName.get(String(matchExact.compartimento).toUpperCase()) : null;
        const l = byId || byName;
        if (l) return { type:'lane', id:l.id, label:l.name };
      }
    }

    // 2) Similar con historial
    const sim = topClientes.find(c => fuzzyScore(c.nombre, upper) >= 0.72);
    if (sim?.topSlot) {
      if (layoutMode === 'racks') {
        const byId = baldas.find(b => String(b.id) === String(sim.topSlot));
        const byCode = baldaMapByCodigo.get(String(sim.topSlot).toUpperCase());
        const b = byId || byCode;
        if (b) return { type:'shelf', id:b.id, label:String(b.codigo).toUpperCase() };
      } else {
        const byId = lanes.find(l => String(l.id) === String(sim.topSlot));
        const byName = lanesByName.get(String(sim.topSlot).toUpperCase());
        const l = byId || byName;
        if (l) return { type:'lane', id:l.id, label:l.name };
      }
    }

    // 3) Últimos usados
    const lastByClient = getUltimaBaldaPorCliente(upper);
    const lastByCompany = company ? getUltimaBaldaPorCompania(company) : '';
    const tryCode = (code) => {
      if (!code) return null;
      if (layoutMode === 'racks') {
        const b = baldaMapByCodigo.get(String(code).toUpperCase());
        return b ? { type:'shelf', id:b.id, label:String(b.codigo).toUpperCase() } : null;
      } else {
        const l = lanesByName.get(String(code).toUpperCase());
        return l ? { type:'lane', id:l.id, label:l.name } : null;
      }
    };
    const byClient = tryCode(lastByClient);
    if (byClient) return byClient;
    const byCompany = tryCode(lastByCompany);
    if (byCompany) return byCompany;

    // 4) Más vacío
    const sugerida = calcularBaldaSugerida();
    return tryCode(sugerida);
  }, [layoutMode, paquetes, baldas, lanes, lanesByName, baldaMapByCodigo, topClientes, calcularBaldaSugerida]);

  const selectSlot = useCallback((slot, manual=false) => {
    if (!slot) return;
    setCompartimento(slot.label);
    setSlotSel(slot);
    setSeleccionManual(!!manual);
  }, []);

  useEffect(() => {
    if (seleccionManual) return;
    const slot = smartSlotFor(cliente, compania);
    if (slot) selectSlot(slot, false);
  }, [cliente, compania, paquetes, layoutMode, seleccionManual, smartSlotFor, selectSlot]);

  const puedeGuardar = useMemo(() => {
    if (!cliente.trim() || !compania || !compartimento || !slotSel) return false;
    if (layoutMode === 'racks') return slotSel.type === 'shelf' && Number.isFinite(Number(slotSel.id));
    if (layoutMode === 'lanes') return slotSel.type === 'lane'  && Number.isFinite(Number(slotSel.id));
    return false;
  }, [cliente, compania, compartimento, slotSel, layoutMode]);

  /* ===== Vuelo paquete ===== */
  const flyFromInputToSlot = useCallback(() => {
    try {
      const layer = flyLayerRef.current;
      const inputEl = inputClienteRef.current;
      if (!layer || !inputEl || !slotSel) return;

      const start = inputEl.getBoundingClientRect();
      let endEl = null;
      if (slotSel.type === 'shelf') endEl = baldaRefs.current.get(String(slotSel.id));
      else endEl = laneRefs.current.get(String(slotSel.id));
      if (!endEl) return;
      const end = endEl.getBoundingClientRect();

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
      setTimeout(() => { try { layer.removeChild(parcel); } catch {} }, 1200); // coincide con animación (1.15s aprox)
    } catch { /* noop */ }
  }, [slotSel]);

  /* ===== Guardar ===== */
  const guardar = useCallback(async (e) => {
    e?.preventDefault();
    if (!puedeGuardar || loading) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !tenant?.id) throw new Error('Faltan datos para registrar el paquete.');

      const upperCliente = toUpperVis(cliente.trim());
      const ahora = new Date().toISOString();
      const tempId = `temp_${Date.now()}`;

      const temp = {
        id: tempId,
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        entregado: false,
        fecha_llegada: ahora,
        created_at: ahora,
        compartimento: String(slotSel.label),
        ...(layoutMode === 'lanes'
            ? { lane_id: Number(slotSel.id) }
            : { balda_id: Number(slotSel.id) })
      };
      setPaquetes(prev => [temp, ...prev]);

      const payload = {
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        tenant_id: tenant.id,
        compartimento: String(slotSel.label),
        ...(layoutMode === 'lanes'
            ? { lane_id: Number(slotSel.id) }
            : { balda_id: Number(slotSel.id) })
      };

      // ✈️ animación
      flyFromInputToSlot();

      const creado = await crearPaqueteBackend(payload, token);
      if (!creado?.id && !creado?.paquete?.id) throw new Error('No se pudo crear el paquete en backend.');
      const created = creado.paquete || creado;

      setPaquetes(prev => prev.map(p =>
        p.id === tempId ? { ...p, id: created.id, balda_id: created.balda_id ?? p.balda_id, lane_id: created.lane_id ?? p.lane_id } : p
      ));

      const slot = String(slotSel.label);
      localStorage.setItem(LAST_COMPANY_KEY, compania);
      try {
        const mapC = JSON.parse(localStorage.getItem(LAST_SLOT_BY_COMPANY_KEY) || '{}'); mapC[compania] = slot; localStorage.setItem(LAST_SLOT_BY_COMPANY_KEY, JSON.stringify(mapC));
        const mapU = JSON.parse(localStorage.getItem(LAST_SLOT_BY_CLIENT_KEY) || '{}'); mapU[upperCliente] = slot; localStorage.setItem(LAST_SLOT_BY_CLIENT_KEY, JSON.stringify(mapU));
      } catch {}

      // 🔔 sonido “chime” y modal
      playChime();
      setExito(true);
      setTimeout(()=>setExito(false), 1800);

      // 🧹 limpiar cliente (mantener empresa)
      setCliente('');
      setSeleccionManual(false);
      startTransition(() => inputClienteRef.current?.focus());
    } catch (err) {
      console.error('[Añadir paquete] Error al guardar', err);
      alert('No se pudo guardar el paquete. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  }, [puedeGuardar, loading, tenant, cliente, compania, slotSel, layoutMode, flyFromInputToSlot]);

  /* ======= UI ======= */
  const estanteriasAgrupadas = useMemo(() => {
    if (layoutMode === 'lanes') return {};
    const acc = {};
    for (const b of baldas) (acc[b.estante] ||= []).push(b);
    Object.values(acc).forEach(arr => arr.sort((a,b)=>a.balda-b.balda));
    return acc;
  }, [layoutMode, baldas]);

  const sugerenciaPrimaria = useMemo(() => {
    if (seleccionManual && compartimento) return compartimento;
    return calcularBaldaSugerida() || compartimento || '';
  }, [seleccionManual, compartimento, calcularBaldaSugerida]);

  return (
    <div className="anadir-paquete" style={brandVars}>
      {/* Capa para vuelo */}
      <div id="fly-layer" ref={flyLayerRef} aria-hidden="true" />

      <header className="cabecera">
        <div className="titulo">
          <FaBoxOpen aria-hidden="true" />
          <div>
            <h1>Añadir paquete</h1>
            <p>Registra el paquete y elige el compartimento óptimo.</p>
          </div>
        </div>
      </header>

      <form className="form" onSubmit={guardar}>
        {/* ===== Datos ===== */}
        <section className="panel datos">
          <h2>Datos del paquete</h2>
          <p className="hint">Completa el cliente, la empresa y confirma el compartimento.</p>

          <div className="fila">
            <div className="campo">
              <label>Nombre del cliente</label>
              <input
                ref={inputClienteRef}
                type="text"
                placeholder="Añadir cliente…"
                value={cliente}
                onChange={e => { const up = toUpperVis(e.target.value); setCliente(up); setSeleccionManual(false); }}
                autoComplete="off"
                maxLength={80}
                list="clientes-sugeridos"
              />
              {/* Sugerencias con datalist nativo (clicable + accesible) */}
              <datalist id="clientes-sugeridos">
                {sugs.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>

            <div className="campo">
              <label>Empresa de transporte</label>
              <select value={compania} onChange={(e) => setCompania(e.target.value)} aria-label="Empresa de transporte">
                {companias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* hueco para balance visual */}
            <div className="campo" aria-hidden="true" />
          </div>

          {/* ===== BLOQUE CENTRAL ===== */}
          <div className="bloque-central">
            <div className="chips">
              <span className="chip chip--hint">
                <FaLightbulb aria-hidden="true" />
                <span className="lbl">Sugerencia principal</span>
                <code className="pill">{sugerenciaPrimaria || '—'}</code>
              </span>

              <span className="chip chip--selected">
                <FaCheckCircle aria-hidden="true" />
                <span className="lbl">Seleccionado</span>
                <code className="pill pill--brand">{compartimento || '—'}</code>
              </span>
            </div>

            <div className="acciones-centro">
              <button type="submit" className="btn-primary btn-xl" disabled={!puedeGuardar || loading}>
                {loading ? 'Guardando…' : 'Guardar paquete'}
              </button>
            </div>
          </div>
        </section>

        {/* ===== Rejilla ===== */}
        <section className="panel rejilla">
          <h2>Rejilla del almacén</h2>
          <p className="hint">Selecciona un compartimento. Verás la ocupación en tiempo real.</p>

          {!readyLayout ? (
            <div className="grid-skeleton" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="skeleton-card" />))}
            </div>
          ) : layoutMode === 'lanes' ? (
            <>
              <div
                className="lanes-grid"
                style={{ gridTemplateColumns: `repeat(${grid.cols || 1}, minmax(240px, 1fr))` }}
                role="group"
                aria-label="Selección de carril"
              >
                {Array.from({ length: grid.rows || 1 }).flatMap((_, rIdx) =>
                  Array.from({ length: grid.cols || 1 }).map((_, cIdx) => {
                    const r = rIdx + 1, c = cIdx + 1;
                    const lane = lanes.find(l => l.position?.row===r && l.position?.col===c) || null;
                    if (!lane) return <div key={`cell-${r}-${c}`} className="lane-cell empty" />;

                    const activa = slotSel?.type==='lane' && slotSel?.id === lane.id;
                    const cantidad = (conteo[String(lane.id)] ?? conteo[lane.name] ?? 0);

                    const laneColor = lane.color || '#f59e0b';
                    const laneTint  = hexToRgba(laneColor, 0.08);
                    const laneRing  = hexToRgba(laneColor, 0.35);

                    return (
                      <button
                        key={`cell-${r}-${c}`}
                        type="button"
                        ref={(el) => { if (el) laneRefs.current.set(String(lane.id), el); }}
                        className={`lane ${cantidad <= 4 ? 'verde' : cantidad < 10 ? 'naranja' : 'rojo'} ${activa ? 'activa pulse' : ''}`}
                        style={{ '--lane': laneColor, '--lane-rgba': laneTint, '--sel-ring': laneRing }}
                        onClick={()=>{ selectSlot({ type:'lane', id:lane.id, label: lane.name }, true); }}
                        aria-pressed={activa}
                      >
                        <div className="lane-header">
                          <i className="lane-dot" aria-hidden="true" />
                          <div className="lane-name">{lane.name}</div>
                          <span className="flex-spacer" />
                          <div className="lane-badge"><FaCube aria-hidden="true" />{cantidad} paquete{cantidad!==1?'s':''}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="leyenda">
                <span><i className="dot verde" /> Baja ocupación</span>
                <span><i className="dot naranja" /> Media</span>
                <span><i className="dot rojo" /> Alta</span>
              </div>
            </>
          ) : (
            <>
              <div
                className="estantes-grid"
                style={{ gridTemplateColumns: `repeat(${grid.cols || 1}, minmax(260px, 1fr))` }}
                role="group"
                aria-label="Selección de balda"
              >
                {(() => {
                  const estantesOrdenados = (rackOrder.length
                    ? rackOrder
                    : Object.keys(estanteriasAgrupadas).map(Number).sort((a,b)=>a-b));

                  const totalCells = (grid.rows || 1) * (grid.cols || 1);
                  const cells = Array.from({ length: totalCells }, (_, i) => estantesOrdenados[i] ?? null);

                  return cells.map((est, idx) => {
                    if (est == null) {
                      return <div key={`placeholder-${idx}`} className="estante estante--placeholder" aria-hidden="true" />;
                    }
                    const list = estanteriasAgrupadas[est] || [];
                    return (
                      <div className="estante" key={`est-${est}`}>
                        <div className="estante-header">
                          Estante {rackNameById.get(est) ?? est} <span className="muted">{list.length} baldas</span>
                        </div>
                        {/* Balda en columna */}
                        <div className="baldas-grid">
                          {list.map(b => {
                            const activa = slotSel?.type==='shelf' && slotSel?.id === b.id;
                            const cantidad = (conteo[String(b.id)] ?? conteo[String(b.codigo).toUpperCase()] ?? 0);

                            return (
                              <button
                                type="button"
                                key={b.id}
                                ref={(el) => { if (el) baldaRefs.current.set(String(b.id), el); }}
                                className={`balda ${cantidad <= 4 ? 'verde' : cantidad < 10 ? 'naranja' : 'rojo'} ${activa ? 'activa pulse' : ''}`}
                                onClick={() => { selectSlot({type:'shelf', id:b.id, label:String(b.codigo).toUpperCase() }, true); }}
                                aria-pressed={activa}
                              >
                                <div className="balda-header">{b.codigo}</div>
                                <div className="balda-badge"><FaCube aria-hidden="true" />{cantidad} paquete{cantidad!==1?'s':''}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="leyenda">
                <span><i className="dot verde" /> Baja ocupación</span>
                <span><i className="dot naranja" /> Media</span>
                <span><i className="dot rojo" /> Alta</span>
              </div>
            </>
          )}
        </section>
      </form>

      {exito && (
        <div className="modal-exito modal-exito--giant" role="status" aria-live="polite">
          <div className="contenido">
            <FaCheckCircle aria-hidden="true" />
            <div>
              <h3>¡Paquete guardado!</h3>
              <p>Se registró correctamente en <strong>{compartimento}</strong>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
