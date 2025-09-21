import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getTenantIdOrThrow } from '../utils/tenant';
import {
  crearPaqueteBackend,
  obtenerPaquetesBackend,
  obtenerEstructuraEstantesYPaquetes,
} from '../services/paquetesService';
import { FaBoxOpen, FaLightbulb, FaCheckCircle, FaCube, FaInfoCircle, FaSearch, FaUserTie } from 'react-icons/fa';
import '../styles/AnadirPaquete.scss';

/* ================= Utils ================= */
const toUpperVis = (s='') => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const startsWithSafe = (a='', b='') => toUpperVis(a).startsWith(toUpperVis(b));
const includesSafe   = (a='', b='') => toUpperVis(a).includes(toUpperVis(b));

const hexToRgba = (hex='#2563eb', a=0.08) => {
  const h = String(hex).replace('#','').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const num = (v, d=0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const pullPos = (o) => ({
  row: num(o?.position?.row ?? o?.row ?? o?.r ?? o?.grid_row ?? o?.y, 1),
  col: num(o?.position?.col ?? o?.col ?? o?.c ?? o?.grid_col ?? o?.x, 1),
});
const stripPrefix = (s='') => String(s).replace(/^\s*(carril|estante)\s+/i,'').trim();
const isCodeLike = (s='') => /^[A-Z]{1,3}\s*\d{1,3}$/i.test(String(s).trim());

// Parser de códigos “A1”, “B2”, “12-3”, “A”, “3”, etc.
const canon = (s) => String(s||'').trim().toUpperCase().replace(/\s+/g,'');
const alphaToNum = (str) => {
  const s = String(str||'').toUpperCase();
  if (!/^[A-Z]+$/.test(s)) return NaN;
  let n = 0; for (const ch of s) n = n*26 + (ch.charCodeAt(0)-64);
  return n;
};
function parseCodigoGenerico(raw) {
  const code = canon(raw);
  if (/^\d+$/.test(code)) return { estante: parseInt(code, 10), balda: 1 };
  if (/^[A-Z]+$/.test(code)) return { estante: alphaToNum(code), balda: 1 };
  let m = code.match(/^([A-Z]+)(\d+)$/);           // A1, B12
  if (m) return { estante: alphaToNum(m[1]), balda: parseInt(m[2], 10) };
  m = String(raw).trim().match(/^(\d+)\s*-\s*(\d+)$/); // 2-3
  if (m) return { estante: parseInt(m[1], 10), balda: parseInt(m[2], 10) };
  return null;
}

/* ================= EXTRACCIÓN (estructura backend) ================= */
function extractBaldasFromEstructura(payload) {
  const out = [];
  const root = payload?.estructura;
  if (!Array.isArray(root)) return out;
  for (const est of root) {
    const estNum = num(est?.estante, NaN);
    const rname = est?.nombre || String(estNum);
    const filas = Array.isArray(est?.filas) ? est.filas : [];
    for (const f of filas) {
      const idx = num(f?.idx ?? f?.index ?? f?.i ?? f?.balda, NaN);
      const id  = f?.id ?? `${estNum}:${idx}`;
      // importante: aquí NO forzamos a mayúsculas el “name” si viene de configuración;
      // trabajaremos internamente en mayúsculas con un mapa aparte para búsquedas.
      const label = (f?.name ?? f?.codigo ?? `${rname}${idx}`);
      if (Number.isFinite(estNum) && Number.isFinite(idx)) {
        out.push({ id, codigo: String(label), estante: estNum, balda: idx });
      }
    }
  }
  if (out.length === 0 && Array.isArray(payload)) {
    return payload.map(r => ({
      id: r.id, codigo: String(r.codigo||''),
      estante: num(r.estante,1), balda: num(r.balda,1)
    }));
  }
  return out.sort((a,b)=> (a.estante-b.estante) || (a.balda-b.balda));
}

/* ================= FETCH ROBUSTO DE PAQUETES (siempre backend) ================= */
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

export default function AnadirPaquete({ modoRapido = false }) {
  const [tenant, setTenant] = useState(null);

  // Layout & catálogo
  const [layoutMode, setLayoutMode] = useState('racks'); // 'lanes' | 'racks'
  const [grid, setGrid]   = useState({ rows: 1, cols: 1 });
  const [lanes, setLanes] = useState([]);
  const [baldas, setBaldas] = useState([]);
  const [rackOrder, setRackOrder] = useState([]);
  const [rackNameById, setRackNameById] = useState(() => new Map()); // <— nombres de estantes desde config

  // Empresas
  const [companias, setCompanias] = useState([]);
  const [coloresCompania, setColoresCompania] = useState(new Map()); // nombre -> color
  const [compania, setCompania]   = useState('');
  const [cliente, setCliente]     = useState('');

  // Selección
  const [compartimento, setCompartimento] = useState('');
  const [slotSel, setSlotSel] = useState(null);
  const [seleccionManual, setSeleccionManual] = useState(false);
  const [compartimentoAnimado, setCompartimentoAnimado] = useState(false);

  // Estado
  const [paquetes, setPaquetes] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [exito, setExito]       = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);

  // READY flags
  const [readyEmpresas, setReadyEmpresas] = useState(false);
  const [readyLayout,   setReadyLayout]   = useState(false);
  const [readyBaldas,   setReadyBaldas]   = useState(false);

  // Autocomplete cliente
  const [sugs, setSugs]           = useState([]);
  const [sugsOpen, setSugsOpen]   = useState(false);
  const [sugsActive, setSugsActive] = useState(0);
  const [inlineRemainder, setInlineRemainder] = useState('');

  const inputClienteRef = useRef(null);
  const [buscarBalda, setBuscarBalda] = useState('');

  // LS keys
  const LAST_COMPANY_KEY             = 'ultimaCompania';
  const LAST_SLOT_BY_COMPANY_KEY     = 'ultimaBaldaPorCompania';
  const LAST_COMPANY_BY_CLIENT_KEY   = 'ultimaCompaniaPorCliente';
  const LAST_SLOT_BY_CLIENT_KEY      = 'ultimaBaldaPorCliente';

  /* ===== Derivados ===== */
  // Índice en MAYÚSCULAS para búsquedas robustas
  const baldaMapByCodigo = useMemo(
    () => new Map(baldas.map(b => [String(b.codigo).toUpperCase(), b])),
    [baldas]
  );
  const lanesByName      = useMemo(
    () => new Map(lanes.map(l => [String(l.name).toUpperCase(), l])),
    [lanes]
  );

  // Color de marca según compañía
  const colorCarrier = useMemo(() => {
    const hex = coloresCompania.get(compania) || '#2563eb';
    const norm = /^#[0-9a-fA-F]{6}$/.test(String(hex)) ? hex : '#2563eb';
    return norm;
  }, [coloresCompania, compania]);
  const brandVars = useMemo(() => ({
    '--brand': colorCarrier,
    '--brand-rgba': hexToRgba(colorCarrier, 0.10),
    '--brand-ring': hexToRgba(colorCarrier, 0.36),
  }), [colorCarrier]);

  const estanteriasAgrupadas = useMemo(() => {
    if (layoutMode === 'lanes') return {};
    const acc = {};
    for (const b of baldas) (acc[b.estante] ||= []).push(b);
    Object.values(acc).forEach(arr => arr.sort((a,b)=>a.balda-b.balda));
    return acc;
  }, [layoutMode, baldas]);

  const conteo = useMemo(() => {
    const c = {};
    const inc = (k) => { if (!k) return; const s = String(k).toUpperCase(); c[s] = (c[s] || 0) + 1; };

    for (const p of paquetes) {
      const noEntregado = p.entregado === false || p.entregado == null;
      if (!noEntregado) continue;

      if (layoutMode === 'lanes') {
        const raw = (typeof p.compartimento === 'string' && p.compartimento.trim()) ? p.compartimento.trim() : null;
        const laneName = raw ? stripPrefix(raw) : null;
        const laneId   = Number.isFinite(Number(p.lane_id)) ? String(Number(p.lane_id)) : null;
        if (laneName) inc(laneName);
        if (laneId)   inc(laneId);
      } else {
        const code = (typeof p.compartimento === 'string' && p.compartimento.trim())
          ? p.compartimento.trim().toUpperCase()
          : (p?.baldas?.codigo ? String(p.baldas.codigo).toUpperCase() : null);
        const id   = Number.isFinite(Number(p?.balda_id)) ? String(Number(p.balda_id)) : null;
        if (code) inc(code);
        if (id)   inc(id);
      }
    }
    return c;
  }, [paquetes, layoutMode]);

  const listaCompartimentos = useMemo(() => {
    if (layoutMode === 'lanes') return lanes.map(l => l.name);
    // trabajaremos con upper-case como clave principal
    return baldas.map(b => String(b.codigo).toUpperCase());
  }, [layoutMode, lanes, baldas]);

  // Helpers LS
  const getUltimaBaldaPorCompania = (nombre) => { try { const map = JSON.parse(localStorage.getItem(LAST_SLOT_BY_COMPANY_KEY) || '{}'); return map?.[nombre] || ''; } catch { return '' } };
  const setUltimaBaldaPorCompania = (nombre, slot) => { try { const map = JSON.parse(localStorage.getItem(LAST_SLOT_BY_COMPANY_KEY) || '{}'); map[nombre] = slot; localStorage.setItem(LAST_SLOT_BY_COMPANY_KEY, JSON.stringify(map)); } catch {} };
  const getUltimaCompaniaPorCliente = (cliente) => { try { const map = JSON.parse(localStorage.getItem(LAST_COMPANY_BY_CLIENT_KEY) || '{}'); return map?.[cliente] || ''; } catch { return '' } };
  const setUltimaCompaniaPorCliente = (cliente, company) => { try { const map = JSON.parse(localStorage.getItem(LAST_COMPANY_BY_CLIENT_KEY) || '{}'); map[cliente] = company; localStorage.setItem(LAST_COMPANY_BY_CLIENT_KEY, JSON.stringify(map)); } catch {} };
  const getUltimaBaldaPorCliente = (cliente) => { try { const map = JSON.parse(localStorage.getItem(LAST_SLOT_BY_CLIENT_KEY) || '{}'); return map?.[cliente] || ''; } catch { return '' } };
  const setUltimaBaldaPorCliente = (cliente, slot) => { try { const map = JSON.parse(localStorage.getItem(LAST_SLOT_BY_CLIENT_KEY) || '{}'); map[cliente] = slot; localStorage.setItem(LAST_SLOT_BY_CLIENT_KEY, JSON.stringify(map)); } catch {} };

  /* ================= CARGA ================= */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const mark = `[AñadirPaquete] carga ${Date.now()}`;
      console.time(mark);
      setCargandoInicial(true);
      setReadyEmpresas(false);
      setReadyLayout(false);
      setReadyBaldas(false);

      try {
        // 1) Tenant
        const tid = await getTenantIdOrThrow();
        if (cancelado) return;
        setTenant({ id: tid });

        // 2) Empresas (nombres + color)
        let empresasRows = [];
        try {
          const { data: empresasRes } = await supabase
            .from('empresas_transporte_tenant')
            .select('nombre,color')
            .eq('tenant_id', tid);
          empresasRows = empresasRes || [];
        } catch {}
        const nombres = empresasRows
          .map(e => e?.nombre)
          .filter(Boolean)
          .sort((a,b)=>a.localeCompare(b));
        setCompanias(nombres);
        const colorMap = new Map();
        empresasRows.forEach(e => colorMap.set(e?.nombre, e?.color || '#2563eb'));
        setColoresCompania(colorMap);
        const ultima = localStorage.getItem(LAST_COMPANY_KEY);
        setCompania(nombres.includes(ultima) ? ultima : (nombres[0] || ''));
        setReadyEmpresas(true);

        // 3) Paquetes (backend)
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

        /* ========= Mapas de nombres desde meta.racks/shelves ========= */
        const racksMeta = Array.isArray(root?.racks) ? root.racks : [];
        const rackNames = new Map();
        const shelfNamesByPair = new Map();
        for (const r of (racksMeta || [])) {
          const rid = num(r?.id, NaN);
          if (!Number.isFinite(rid)) continue;
          if (r?.name) rackNames.set(rid, String(r.name));
          const shelves = Array.isArray(r?.shelves) ? r.shelves : [];
          for (const s of shelves) {
            const idx = num(s?.index ?? s?.idx ?? s?.shelf_index ?? s?.i ?? s?.orden, NaN);
            if (!Number.isFinite(idx)) continue;
            if (s?.name) shelfNamesByPair.set(`${rid}-${idx}`, String(s.name));
          }
        }
        setRackNameById(rackNames);

        /* ===== MODO LANES ===== */
        if (mode === 'lanes') {
          setLayoutMode('lanes');

          let lanesArr = Array.isArray(root?.lanes) ? root.lanes : [];
          if (!lanesArr.length && paquetesRaw.length) {
            const set = new Map();
            let idx = 1;
            for (const p of paquetesRaw) {
              const laneId = Number.isFinite(Number(p.lane_id)) ? Number(p.lane_id) : null;
              const comp = (typeof p.compartimento === 'string' ? stripPrefix(p.compartimento) : '').trim();
              const name = comp && !isCodeLike(comp) ? comp : (laneId != null ? String(laneId) : null);
              if (!name) continue;
              if (!set.has(name)) set.set(name, { id: laneId ?? idx++, name, color: '#f59e0b', position: { row: 1, col: set.size + 1 } });
            }
            lanesArr = Array.from(set.values());
          }

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

          if (!cancelado) setPaquetes(mapped);
          setReadyLayout(true);
        }
        /* ===== MODO RACKS ===== */
        else {
          setLayoutMode('racks');

          // 5) Estructura desde backend (preferente)
          let baldasVirtuales = [];
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (token) {
              const estructura = await obtenerEstructuraEstantesYPaquetes(token).catch(()=>null);
              if (estructura) baldasVirtuales = extractBaldasFromEstructura(estructura);
            }
          } catch {}

          // 6) Fallback tabla baldas (RLS)
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

          // 7) Inferir desde paquetes si sigue vacío
          if (!baldasVirtuales.length && paquetesRaw.length) {
            const map = new Map();
            let seq = 1;
            for (const p of paquetesRaw) {
              const code = (typeof p.compartimento === 'string' && p.compartimento.trim())
                ? p.compartimento.trim()
                : (p?.baldas?.codigo ? String(p.baldas.codigo) : null);
              if (!code) continue;
              if (!map.has(code)) {
                const parsed = parseCodigoGenerico(code);
                if (parsed) map.set(code, { id: `virt:${seq++}`, codigo: code, estante: parsed.estante, balda: parsed.balda });
              }
            }
            baldasVirtuales = Array.from(map.values()).sort((a,b)=> (a.estante-b.estante) || (a.balda-b.balda));
          }

          // 7.5) **APLICAR NOMBRES DESDE CONFIG** (clave del problema)
          // Si existe un nombre para la balda en meta.racks[*].shelves[*].name,
          // sobrescribimos el "codigo" mostrado por ese nombre.
          const baldasConNombres = baldasVirtuales.map(b => {
            const nm = shelfNamesByPair.get(`${b.estante}-${b.balda}`);
            return nm ? { ...b, codigo: String(nm) } : b;
          });

          setBaldas(baldasConNombres);
          setReadyBaldas(true);

          // 8) Orden y grid
          let orderFromPos = [];
          for (const r of racksMeta) {
            const rid = num(r?.id, NaN);
            const pos = pullPos(r);
            if (Number.isFinite(rid) && Number.isFinite(pos.row) && Number.isFinite(pos.col)) {
              orderFromPos.push({ est: rid, r: pos.row, c: pos.col });
            }
          }

          if (orderFromPos.length) {
            orderFromPos.sort((a, b) => (a.r - b.r) || (a.c - b.c));
            setRackOrder(orderFromPos.map(x => x.est));
            const maxR = Math.max(...orderFromPos.map(x => x.r));
            const maxC = Math.max(...orderFromPos.map(x => x.c));
            setGrid({
              rows: gridRowsHint > 0 ? gridRowsHint : (Number.isFinite(maxR) ? maxR : 1),
              cols: gridColsHint > 0 ? gridColsHint : (Number.isFinite(maxC) ? maxC : 1),
            });
          } else {
            const uniqueEst = Array.from(new Set(baldasConNombres.map(b => b.estante))).sort((a, b) => a - b);
            setRackOrder(uniqueEst);
            if (gridRowsHint > 0 && gridColsHint > 0) {
              setGrid({ rows: gridRowsHint, cols: gridColsHint });
            } else {
              const n = uniqueEst.length || 1;
              const cols = Math.min(Math.ceil(Math.sqrt(n)), 4);
              const rows = Math.ceil(n / cols);
              setGrid({ rows, cols });
            }
          }

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

          if (!cancelado) setPaquetes(mapped);
          setReadyLayout(true);
        }

        startTransition(() => inputClienteRef.current?.focus());
      } catch (e) {
        console.error('[AñadirPaquete] Error de carga:', e);
      } finally {
        if (!cancelado) { setCargandoInicial(false); console.timeEnd(mark); }
      }
    })();

    return () => { cancelado = true; };
  }, []);

  /* ======= Ranking clientes -> sugerencias ======= */
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

  const calcularBaldaSugerida = useCallback(() => {
    if (!listaCompartimentos.length) return '';
    const preferida = compania ? getUltimaBaldaPorCompania(compania) : null;
    const ranking = listaCompartimentos.map(nombre => ({ nombre, cantidad: conteo[nombre] || 0 }))
      .sort((a,b)=> (a.cantidad-b.cantidad) || a.nombre.localeCompare(b.nombre));
    const empate = preferida && ranking.find(r=>r.nombre===preferida)?.cantidad === ranking[0].cantidad;
    return (empate ? preferida : ranking[0]?.nombre) || listaCompartimentos[0];
  }, [listaCompartimentos, conteo, compania]);

  const paquetePendienteCliente = useMemo(() => {
    const q = cliente.trim().toLowerCase();
    if (!q) return null;
    return paquetes.find(p =>
      (p.entregado === false || p.entregado == null) &&
      (p.nombre_cliente || '').trim().toLowerCase() === q
    ) || null;
  }, [paquetes, cliente]);

  // Sugerencia primaria (slot)
  useEffect(() => {
    if (seleccionManual) return;
    if (!listaCompartimentos.length) return;
    const sug = layoutMode === 'lanes'
      ? (lanes.length ? lanes.reduce((min, l) => (conteo[l.name]||0) < (conteo[min.name]||0) ? l : min).name : '')
      : calcularBaldaSugerida();
    setCompartimento(sug);
    if (layoutMode === 'lanes') {
      const l = lanesByName.get(sug.toUpperCase());
      if (l) setSlotSel({ type:'lane', id:l.id, label:l.name });
    } else {
      const b = baldaMapByCodigo.get(sug.toUpperCase());
      if (b) setSlotSel({ type:'shelf', id:b.id, label:b.codigo });
    }
    // eslint-disable-next-line
  }, [listaCompartimentos, layoutMode, lanes, baldas, conteo, seleccionManual]);

  // Animación “Seleccionado”
  useEffect(() => {
    if (!compartimento) return;
    setCompartimentoAnimado(true);
    const t = setTimeout(()=>setCompartimentoAnimado(false), 450);
    return () => clearTimeout(t);
  }, [compartimento]);

  /* Búsqueda rápida */
  useEffect(() => {
    if (!buscarBalda.trim()) return;
    if (layoutMode === 'lanes') {
      const byName = lanesByName.get(buscarBalda.trim().toUpperCase()) || null;
      if (byName) {
        setCompartimento(byName.name);
        setSlotSel({ type:'lane', id: byName.id, label: byName.name });
        setSeleccionManual(true);
      }
    } else {
      const val = buscarBalda.trim().toUpperCase();
      const b = baldaMapByCodigo.get(val);
      if (b) {
        setCompartimento(b.codigo);
        setSlotSel({ type:'shelf', id: b.id, label: b.codigo });
        setSeleccionManual(true);
      }
    }
  }, [buscarBalda, layoutMode, lanesByName, baldaMapByCodigo]);

  const getColor = (n) => (n <= 4 ? 'verde' : n < 10 ? 'naranja' : 'rojo');

  /* Sugerencias cliente */
  const [clientesOrden, setClientesOrden] = useState([]);
  useEffect(() => {
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
    setClientesOrden(arr);
  }, [clientesStats]);

  const recomputarSugerencias = useCallback((texto) => {
    const q = texto.trim();
    if (q.length < 2) { setSugs([]); setSugsOpen(false); setInlineRemainder(''); return; }
    let matches = clientesOrden.filter(c => startsWithSafe(c.nombre, q));
    if (matches.length < 5) {
      const rest = clientesOrden.filter(c => !startsWithSafe(c.nombre, q) && includesSafe(c.nombre, q));
      matches = [...matches, ...rest];
    }
    matches = matches.slice(0, 5);
    setSugs(matches); setSugsOpen(matches.length > 0);
    const firstPrefix = clientesOrden.find(c => startsWithSafe(c.nombre, q));
    setInlineRemainder(firstPrefix ? firstPrefix.nombre.slice(q.length) : '');
    setSugsActive(0);
  }, [clientesOrden]);

  const aplicarHeuristicasCliente = (nombreCliente) => {
    const nombreUpper = toUpperVis(nombreCliente);
    const exact = clientesOrden.find(c => c.nombre.toLowerCase() === nombreUpper.toLowerCase());
    if (exact) {
      const preferCompany = exact.topCompany || getUltimaCompaniaPorCliente(exact.nombre) || compania;
      if (preferCompany && companias.includes(preferCompany)) {
        setCompania(preferCompany);
        localStorage.setItem(LAST_COMPANY_KEY, preferCompany);
      }
      const preferSlot = exact.topSlot || getUltimaBaldaPorCliente(exact.nombre) || getUltimaBaldaPorCompania(preferCompany) || calcularBaldaSugerida();
      if (preferSlot) {
        setCompartimento(preferSlot);
        setSeleccionManual(true);
        const b = layoutMode === 'lanes'
          ? lanesByName.get(preferSlot.toUpperCase())
          : baldaMapByCodigo.get(preferSlot.toUpperCase());
        if (b) setSlotSel(layoutMode==='lanes' ? {type:'lane', id:b.id, label:b.name} : {type:'shelf', id:b.id, label:b.codigo});
      }
    }
  };

  const handleClienteKeyDown = (e) => {
    if (!sugsOpen || !sugs.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSugsActive((i)=>Math.min(i+1,sugs.length-1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSugsActive((i)=>Math.max(i-1,0)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const c = sugs[sugsActive];
      if (c) {
        setCliente(c.nombre);
        aplicarHeuristicasCliente(c.nombre);
        setSugsOpen(false);
      }
    }
  };

  /* Guardar */
  const puedeGuardar = useMemo(() =>
    !!cliente.trim() && !!compania && !!compartimento && !!slotSel, [cliente, compania, compartimento, slotSel]);

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
        compartimento: slotSel.label,
        ...(layoutMode === 'lanes' && Number.isInteger(slotSel.id) ? { lane_id:  slotSel.id } : {})
      };
      setPaquetes(prev => [temp, ...prev]);

      const payload = {
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        compartimento: slotSel.label,
        tenant_id: tenant.id,
        ...(layoutMode === 'lanes' && Number.isInteger(slotSel.id) ? { lane_id:  slotSel.id } : {})
      };

      const creado = await crearPaqueteBackend(payload, token);
      if (!creado?.id) throw new Error('No se pudo crear el paquete en backend.');
      setPaquetes(prev => prev.map(p => p.id === tempId ? { ...p, id: creado.id } : p));

      // heurísticas
      const slot = slotSel.label;
      setUltimaCompaniaPorCliente(upperCliente, compania);
      setUltimaBaldaPorCompania(compania, slot);
      setUltimaBaldaPorCliente(upperCliente, slot);
      localStorage.setItem(LAST_COMPANY_KEY, compania);

      setExito(true);
      setTimeout(()=>setExito(false), 1600);

      if (modoRapido) {
        setCliente('');
        setSeleccionManual(false);
        setBuscarBalda('');
        startTransition(() => inputClienteRef.current?.focus());
      }
    } catch (err) {
      console.error('[Añadir paquete] Error al guardar', err);
      alert('No se pudo guardar el paquete. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  }, [puedeGuardar, loading, tenant, cliente, compania, slotSel, layoutMode, modoRapido]);

  const sugerenciaPrimaria = useMemo(() => {
    if (seleccionManual) return compartimento;
    return layoutMode === 'lanes'
      ? (lanes.length ? lanes.reduce((min, l) => (conteo[l.name]||0) < (conteo[min.name]||0) ? l : min).name : '')
      : calcularBaldaSugerida();
  }, [seleccionManual, compartimento, layoutMode, lanes, conteo, calcularBaldaSugerida]);

  const clienteRepetido = !!paquetePendienteCliente;

  /* ================= UI ================= */
  return (
    <div className="anadir-paquete" style={brandVars}>
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
        <section className="panel datos">
          <h2>Datos del paquete</h2>
          <p className="hint">Completa el cliente, la empresa y confirma el compartimento.</p>

          <div className="fila">
            <div className="campo">
              <label>Nombre del cliente</label>

              {inlineRemainder && cliente && (
                <div className="inline-hint" aria-hidden="true">
                  <span className="typed">{cliente}</span>
                  <span className="rest">{inlineRemainder}</span>
                </div>
              )}

              <input
                ref={inputClienteRef}
                type="text"
                placeholder="Ej: JUAN PEREZ"
                value={cliente}
                onChange={e => { const v = e.target.value; const up = toUpperVis(v); setCliente(up); recomputarSugerencias(up); }}
                onKeyDown={handleClienteKeyDown}
                onFocus={() => recomputarSugerencias(cliente)}
                autoComplete="off"
                maxLength={80}
                aria-autocomplete="list"
                aria-expanded={sugsOpen}
                aria-controls="sugs-list"
              />
              <FaUserTie className="smart-icon" aria-hidden="true" />

              {sugsOpen && sugs.length > 0 && (
                <ul id="sugs-list" className="sugs sugs--compact" role="listbox">
                  {sugs.map((c, i) => (
                    <li
                      key={c.nombre || c}
                      role="option"
                      aria-selected={i===sugsActive}
                      className={i===sugsActive ? 'active' : ''}
                      onMouseDown={(e)=>{ e.preventDefault(); const nombre = c.nombre || c; setCliente(nombre); aplicarHeuristicasCliente(nombre); setSugsOpen(false); }}
                    >
                      <b>{c.nombre || c}</b>
                      {c.count != null && <small>{c.count} envíos</small>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="campo">
              <label>Empresa de transporte</label>
              <select value={compania} onChange={(e) => setCompania(e.target.value)} aria-label="Empresa de transporte">
                {companias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="campo ancho">
              <div className="sugerencias">
                <span className="sugerencia">
                  <FaLightbulb className="icono-sugerencia" aria-hidden="true" />
                  <strong>{clienteRepetido ? `Mismo ${layoutMode==='lanes'?'carril':'compartimento'}:` : 'Sugerido:'}</strong>
                  <code className="pill">{sugerenciaPrimaria || '—'}</code>
                </span>

                <span className={`seleccionado ${compartimentoAnimado ? 'animado' : ''}`}>
                  <FaCheckCircle className="icono-sugerencia" aria-hidden="true" />
                  <strong>Seleccionado:</strong>
                  <code className="pill pill--brand">{compartimento || '—'}</code>
                </span>

                <label className="buscador-balda" title={`Buscar y seleccionar por ${layoutMode==='lanes'?'carril':'código de balda'}`}>
                  <FaSearch aria-hidden="true" />
                  <input
                    type="text"
                    inputMode="text"
                    placeholder={layoutMode==='lanes' ? 'Buscar carril (nombre)' : 'Buscar balda (p. ej. A1)'}
                    value={buscarBalda}
                    onChange={(e)=>setBuscarBalda(e.target.value)}
                  />
                </label>
              </div>

              {/* Avisos controlados */}
              {readyEmpresas && !companias.length && (
                <div className="alerta info">
                  <FaInfoCircle aria-hidden="true" />
                  <div><b>No hay empresas configuradas.</b><p>Añade empresas en <i>Configuración</i> para habilitar el registro.</p></div>
                </div>
              )}

              {layoutMode==='racks' && readyLayout && readyBaldas && !baldas.length && (
                <div className="alerta warning">
                  <FaInfoCircle aria-hidden="true" />
                  <div><b>No hay baldas detectadas.</b><p>Se infieren desde paquetes si es posible. Revisa <i>Configuración</i> si persiste.</p></div>
                </div>
              )}

              {layoutMode==='lanes' && readyLayout && !lanes.length && (
                <div className="alerta warning">
                  <FaInfoCircle aria-hidden="true" />
                  <div><b>No hay carriles detectados.</b><p>Se infieren desde paquetes si es posible. Revisa <i>Configuración</i> si persiste.</p></div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel acciones">
          <div className="acciones-row">
            <button type="submit" className="btn-primary" disabled={!puedeGuardar || loading}>
              {loading ? 'Guardando…' : 'Guardar paquete'}
            </button>
          </div>
        </section>

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
                style={{ gridTemplateColumns: `repeat(${grid.cols || 1}, minmax(220px, 1fr))` }}
                role="group"
                aria-label="Selección de carril"
              >
                {Array.from({ length: grid.rows || 1 }).flatMap((_, rIdx) =>
                  Array.from({ length: grid.cols || 1 }).map((_, cIdx) => {
                    const r = rIdx + 1, c = cIdx + 1;
                    const lane = lanes.find(l => l.position?.row===r && l.position?.col===c) || null;
                    if (!lane) return <div key={`cell-${r}-${c}`} className="lane-cell empty" />;

                    const activa = slotSel?.type==='lane' && slotSel?.id === lane.id;
                    const cantidad = (conteo[lane.name] ?? conteo[String(lane.id)] ?? 0);

                    const visible = buscarBalda.trim()
                      ? (lane.name || '').toUpperCase().includes(buscarBalda.trim().toUpperCase())
                      : true;
                    if (!visible) return <div key={`cell-${r}-${c}`} className="lane-cell empty" />;

                    const laneColor = lane.color || '#f59e0b';
                    const laneTint  = hexToRgba(laneColor, 0.08);
                    const laneRing  = hexToRgba(laneColor, 0.35);

                    return (
                      <button
                        key={`cell-${r}-${c}`}
                        type="button"
                        className={`lane ${getColor(cantidad)} ${activa ? 'activa' : ''}`}
                        style={{ '--lane': laneColor, '--lane-rgba': laneTint, '--sel-ring': laneRing }}
                        onClick={()=>{ setCompartimento(lane.name); setSlotSel({ type:'lane', id:lane.id, label: lane.name }); setSeleccionManual(true); }}
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
                style={{ gridTemplateColumns: `repeat(${grid.cols || 1}, minmax(240px, 1fr))` }}
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
                        <div className="baldas-grid">
                          {list.map(b => {
                            const activa = slotSel?.type==='shelf' && slotSel?.id === b.id;
                            const cantidad = (conteo[String(b.codigo).toUpperCase()] ?? conteo[String(b.id)] ?? 0);

                            const visible = buscarBalda.trim()
                              ? String(b.codigo).toUpperCase().includes(buscarBalda.trim().toUpperCase())
                              : true;
                            if (!visible) return null;

                            return (
                              <button
                                type="button"
                                key={b.id}
                                className={`balda ${getColor(cantidad)} ${activa ? 'activa' : ''}`}
                                onClick={() => { setCompartimento(String(b.codigo).toUpperCase()); setSlotSel({type:'shelf', id:b.id, label:b.codigo }); setSeleccionManual(true); }}
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
        <div className="modal-exito" role="status" aria-live="polite">
          <div className="contenido"><FaCheckCircle aria-hidden="true" />¡Paquete guardado correctamente!</div>
        </div>
      )}
    </div>
  );
}
