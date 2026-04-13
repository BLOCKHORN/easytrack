import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { getTenantIdOrThrow } from '../../utils/tenant';
import { crearPaqueteBackend, obtenerPaquetesBackend } from '../../services/paquetesService';
import { cargarUbicaciones } from '../../services/ubicacionesService';

const IconBox = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconCheck = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const IconLayers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconSparkles = ({ className = "w-[18px] h-[18px]" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconInfo = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconLightbulb = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
const IconCheckCircle = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconLock = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconScan = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.5-1.5"/></svg>;
const IconPhone = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconSpinner = ({ className = "animate-spin h-5 w-5 text-current" }) => <svg className={className} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>;
const IconWhatsapp = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133-.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>;

const toUpperVis = (s='') => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const clamp = (v,min,max) => Math.max(min, Math.min(max, v));

let __AUDIO_CTX = null;
const playChime = (durationMs = 220) => {
  try {
    const ctx = __AUDIO_CTX || new (window.AudioContext || window.webkitAudioContext)();
    __AUDIO_CTX = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs/1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs/1000);
  } catch {}
};

const playMagicChime = () => {
  try {
    const ctx = __AUDIO_CTX || new (window.AudioContext || window.webkitAudioContext)();
    __AUDIO_CTX = ctx;
    const playNote = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playNote(523.25, now, 0.4); 
    playNote(659.25, now + 0.1, 0.4); 
    playNote(783.99, now + 0.2, 0.6); 
    playNote(1046.50, now + 0.3, 1.0); 
  } catch {}
};

function buildPosToIdx(count, cols, orientation) {
  const n = Math.max(0, count | 0);
  const c = Math.max(1, cols | 0);
  if (orientation === 'horizontal') return Array.from({ length: n }, (_, p) => p);
  const rows = Math.ceil(n / c);
  const orderPos = [];
  for (let col = 0; col < c; col++) {
    for (let row = 0; row < rows; row++) {
      const pos = row * c + col;
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

function levenshtein(a, b) {
  a = toUpperVis(a); b = toUpperVis(b);
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
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
  return 1 - levenshtein(A, B) / Math.max(A.length, B.length);
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

const CameraScanner = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let localStream = null;
    async function startCamera() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 720 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        } else {
          localStream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        alert("No se pudo acceder a la cámara. Revisa los permisos.");
        onClose();
      }
    }
    startCamera();
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [onClose]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // ESCALADO FORZADO PARA IPHONE: Garantizamos que la imagen NUNCA sea mayor a 800px
    const MAX_DIMENSION = 800;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > height) {
      if (width > MAX_DIMENSION) {
        height *= MAX_DIMENSION / width;
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width *= MAX_DIMENSION / height;
        height = MAX_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    
    const data = canvas.toDataURL('image/jpeg', 0.5); 
    onCapture(data);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* ATRIBUTO MUTED OBLIGATORIO EN IOS PARA EVITAR BLOQUEOS */}
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative w-64 h-64 border-2 border-brand-400 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-0.5 bg-brand-400/50" />
              <div className="h-10 w-0.5 bg-brand-400/50 absolute" />
           </div>
        </div>
        <p className="absolute bottom-10 text-white font-black text-sm uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">Encuadra la etiqueta</p>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="bg-zinc-950 p-8 flex items-center justify-between pb-12">
        <button onClick={onClose} className="text-white font-bold text-sm hover:text-brand-400 transition-colors">CANCELAR</button>
        <button onClick={capture} className="w-20 h-20 bg-white rounded-full border-8 border-zinc-800 active:scale-90 transition-transform flex items-center justify-center shadow-xl shadow-brand-500/20">
           <div className="w-14 h-14 rounded-full border-2 border-zinc-950" />
        </button>
        <div className="w-16" />
      </div>
    </div>
  );
};

export default function AnadirPaquete({ modoRapido = false, paquetes: propsPaquetes, actualizarPaquetes }) {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  const [tenant, setTenant] = useState(null);
  const [aiStatus, setAiStatus] = useState('locked');
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);
  
  const [companias, setCompanias] = useState([]);
  const [compania, setCompania]   = useState('');
  const [cliente, setCliente]     = useState('');
  const [telefono, setTelefono]   = useState('');
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(false);
  const [activeTab, setActiveTab] = useState('single'); 

  const [multiCount, setMultiCount] = useState(5);
  const [multiNames, setMultiNames] = useState(() => Array.from({length:5}, ()=>''));
  const [batchSameCompany, setBatchSameCompany] = useState(true);
  const [batchCompany, setBatchCompany] = useState('');
  const [multiCompanies, setMultiCompanies] = useState(() => Array.from({length:5}, ()=>''));
  const [multiSaving, setMultiSaving] = useState(false);

  const [sugCliente, setSugCliente] = useState(null); 
  const [matchInfo, setMatchInfo] = useState(null);  

  const [rawUbicaciones, setRawUbicaciones] = useState([]);
  const [metaUbi, setMetaUbi] = useState({ cols: 5, order: 'horizontal' });
  const [penalizedSlots, setPenalizedSlots] = useState({});

  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
  const [showUpgradePro, setShowUpgradePro] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [activatingTrial, setActivatingTrial] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const { visual: ubicaciones, cols } = useMemo(
    () => makeVisualUbicaciones(rawUbicaciones, metaUbi),
    [rawUbicaciones, metaUbi]
  );

  const [paquetesLocales, setPaquetesLocales] = useState([]);
  const paquetes = propsPaquetes || paquetesLocales;

  const [slotSel, setSlotSel] = useState(null);
  const [seleccionManual, setSeleccionManual] = useState(false);

  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);

  const inputClienteRef = useRef(null);
  const flyLayerRef = useRef(null);

  const extraStyles = `
  @keyframes flyCurve {
    0% { transform: translate(var(--sx), var(--sy)) scale(1); opacity: 1; }
    50% { transform: translate(calc(var(--sx) + (var(--ex) - var(--sx))/2), calc(var(--sy) - 150px)) scale(1.5) rotate(15deg); opacity: 1; }
    100% { transform: translate(var(--ex), var(--ey)) scale(0.2) rotate(0deg); opacity: 0; }
  }
  .fly-parcel {
    position: fixed; z-index: 9999; top: 0; left: 0; pointer-events: none;
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; background: #14b8a6; color: white; border-radius: 10px;
    box-shadow: 0 10px 25px -5px rgba(20, 184, 166, 0.5);
    opacity: 0;
  }
  .fly-parcel.animate { animation: flyCurve 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
  `;

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const tid = await getTenantIdOrThrow();
        if (cancel) return;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001";

        let localEmpresaName = '';

        try {
          const res = await fetch(`${API_URL}/api/limits/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const limitsData = await res.json();
          setAiStatus(limitsData?.entitlements?.features?.aiStatus || 'locked');
          localEmpresaName = limitsData?.tenant?.nombre_empresa || '';
        } catch(e) {
          setAiStatus('locked');
        } finally {
          setIsCheckingPlan(false);
        }

        if (!localEmpresaName) {
          const { data: tData } = await supabase.from('tenants').select('nombre_empresa').eq('id', tid).maybeSingle();
          localEmpresaName = tData?.nombre_empresa || '';
        }

        setTenant({ id: tid, nombre_empresa: localEmpresaName });

        try {
          const storedPenalties = JSON.parse(localStorage.getItem(`ap_penalties_${tid}`)) || {};
          setPenalizedSlots(storedPenalties);
        } catch(e) {}

        const { data } = await supabase.from('empresas_transporte_tenant').select('nombre').eq('tenant_id', tid);
        const lista = (data || []).map(e => e?.nombre).filter(Boolean).sort((a,b)=>a.localeCompare(b));
        setCompanias(lista);
        
        const lastCompany = localStorage.getItem('ap_last_company');
        const defaultCompany = (lastCompany && lista.includes(lastCompany)) ? lastCompany : (lista[0] || '');
        setCompania(defaultCompany);
        setBatchCompany(defaultCompany);
        setMultiCompanies(prev => prev.map(v => v || defaultCompany));

        const ub = await cargarUbicaciones(token, tid);
        if (cancel) return;
        
        setRawUbicaciones(Array.isArray(ub?.ubicaciones) ? ub.ubicaciones : []);
        setMetaUbi({ cols: ub?.meta?.cols ?? 5, order: ub?.meta?.order ?? ub?.meta?.orden ?? 'horizontal' });

        if (!propsPaquetes) {
          const pk = await obtenerPaquetesBackend(token, { estado: 'pendiente', all: 1 }).catch(() => []);
          setPaquetesLocales(Array.isArray(pk) ? pk : []);
        }

        startTransition(() => inputClienteRef.current?.focus());
      } catch (e) {
        setIsCheckingPlan(false);
      }
    })();
    return () => { cancel = true; };
  }, [propsPaquetes]);

  const handleActivateTrial = async () => {
    if (activatingTrial) return;
    setActivatingTrial(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001";
      const res = await fetch(`${API_URL}/api/tenants/me/ai-trial`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error al activar prueba');

      setAiStatus('trial_active');
      setShowTrialModal(false);
      setTimeout(() => setShowCamera(true), 300);
    } catch (e) {
      alert(e.message);
    } finally {
      setActivatingTrial(false);
    }
  };

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

  useEffect(() => {
    if (!tenant?.id || Object.keys(penalizedSlots).length === 0) return;
    let changed = false;
    const nextPenalties = { ...penalizedSlots };
    
    for (const [label, threshold] of Object.entries(nextPenalties)) {
      const currentCount = occupancy.get(label) || 0;
      if (currentCount < threshold) {
        delete nextPenalties[label];
        changed = true;
      }
    }
    
    if (changed) {
      setPenalizedSlots(nextPenalties);
      localStorage.setItem(`ap_penalties_${tenant.id}`, JSON.stringify(nextPenalties));
    }
  }, [occupancy, penalizedSlots, tenant?.id]);

  const getMostEmptySlot = useCallback(() => {
    if (!ubicaciones.length) return null;
    const sorted = [...ubicaciones].sort((a,b)=> {
      const ca = occupancy.get(a.id) || occupancy.get(a.label) || 0;
      const cb = occupancy.get(b.id) || occupancy.get(b.label) || 0;
      const penA = penalizedSlots[a.label] !== undefined ? 1000 : 0;
      const penB = penalizedSlots[b.label] !== undefined ? 1000 : 0;
      return (ca + penA) - (cb + penB);
    });
    const best = sorted[0];
    return best ? { id: best.id, label: best.label } : null;
  }, [ubicaciones, occupancy, penalizedSlots]);

  const pickForClient = useCallback((clienteNombre) => {
    const up = toUpperVis(clienteNombre || '');
    if (!up) return getMostEmptySlot();

    const pendientes = paquetes.filter(p => !p.entregado);
    const matches = pendientes.filter(p => toUpperVis(p?.nombre_cliente || '') === up);

    if (matches.length) {
      const counter = new Map();
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

  const leadingName = activeTab === 'single' ? cliente : (multiNames[0] || '');
  const setLeadingName = useCallback((val) => {
    const up = toUpperVis(val);
    if (activeTab === 'single') setCliente(up);
    else setMultiNames(prev => { const n = [...prev]; n[0] = up; return n; });
  }, [activeTab]);

  useEffect(() => {
    const pendientes = paquetes.filter(p => !p.entregado);
    const sug = bestClientSuggestion(leadingName, pendientes);
    setSugCliente(sug);

    if (!seleccionManual) {
      const slot = pickForClient(leadingName) || getMostEmptySlot();
      if (slot) setSlotSel(slot);
    }

    if (sug && toUpperVis(leadingName) !== toUpperVis(sug.name)) {
      let bestLabel = null; let cnt = 0;
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

  const puedeGuardar = activeTab === 'single'
    ? cliente.trim() && compania && slotSel && (slotSel.id || slotSel.label)
    : multiNames.some(n => n.trim()) && slotSel && (slotSel.id || slotSel.label);

  const applyNewMultiCount = useCallback((v) => {
    const n = clamp(v|0, 1, 20);
    setMultiCount(n);
    setMultiNames(prev => {
      const next = [...prev];
      if (next.length < n) while (next.length < n) next.push('');
      else if (next.length > n) next.length = n;
      return next;
    });
    setMultiCompanies(prev => {
      const next = [...prev];
      if (next.length < n) while (next.length < n) next.push(batchSameCompany ? (batchCompany || compania) : (companias[0] || ''));
      else if (next.length > n) next.length = n;
      return next;
    });
  }, [batchSameCompany, batchCompany, compania, companias]);

  const processAIScan = async (base64Image) => {
    setIsScanning(true);
    setShowCamera(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001";
      
      const res = await fetch(`${API_URL}/api/ia/scan-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ imageBase64: base64Image })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error en el servidor de IA');
      }
      
      const data = await res.json();

      if (data.cliente) setLeadingName(data.cliente);
      if (data.telefono) {
        setTelefono(data.telefono);
        setEnviarWhatsapp(false);
      }
      
      if (data.compania) {
        const aiComp = toUpperVis(data.compania);
        const match = companias.find(c => {
          const dbComp = toUpperVis(c);
          return dbComp === aiComp || dbComp.includes(aiComp) || aiComp.includes(dbComp);
        });
        if (match) {
          setCompania(match);
        }
      }
      
      setSeleccionManual(false);
      playMagicChime();

    } catch (err) {
      alert(err.message || 'Error analizando la etiqueta. Por favor, reinténtalo.');
    } finally {
      setIsScanning(false);
    }
  };

  const flyFromInputToSlot = useCallback(() => {
    try {
      const layer = flyLayerRef.current;
      const inputEl = inputClienteRef.current;
      if (!layer || !inputEl || !slotSel) return;

      const start = inputEl.getBoundingClientRect();
      const end = document.querySelector(`[data-ubi-label="${slotSel.label}"]`)?.getBoundingClientRect();
      if (!end) return;

      const parcel = document.createElement('div');
      parcel.className = 'fly-parcel animate';
      parcel.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';
      layer.appendChild(parcel);

      const sx = start.left + start.width - 30;
      const sy = start.top + start.height / 2;
      const ex = end.left + end.width / 2;
      const ey = end.top + 20;
      parcel.style.setProperty('--sx', `${sx}px`);
      parcel.style.setProperty('--sy', `${sy}px`);
      parcel.style.setProperty('--ex', `${ex}px`);
      parcel.style.setProperty('--ey', `${ey}px`);
      
      setTimeout(() => { try { layer.removeChild(parcel); } catch {} }, 800);
    } catch {}
  }, [slotSel]);

  const handleLimitError = (err) => {
    const errorStr = String(err?.message || err?.error || err).toUpperCase();
    if (errorStr.includes('LIMIT_EXCEEDED') || errorStr.includes('LIMITE')) {
      setLimiteAlcanzado(true);
    } else {
      alert(err?.message || 'Error al guardar el paquete.');
    }
  };

  const guardar = useCallback(async (e) => {
    e?.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !tenant?.id) throw new Error('Faltan datos.');

      const upperCliente = toUpperVis(cliente.trim());
      if (!upperCliente) throw new Error('Falta nombre.');
      if (!compania) throw new Error('Falta empresa.');
      if (!slotSel?.label) throw new Error('Falta ubicación.');

      flyFromInputToSlot();

      if (seleccionManual && suggestedLabel && suggestedLabel !== slotSel.label) {
        const countOfSuggested = occupancy.get(suggestedLabel) || 0;
        setPenalizedSlots(prev => {
          const next = { ...prev, [suggestedLabel]: countOfSuggested };
          localStorage.setItem(`ap_penalties_${tenant.id}`, JSON.stringify(next));
          return next;
        });
      }
      
      const payload = {
        tenant_id: tenant.id,
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        ubicacion_label: slotSel.label,
        telefono: telefono.trim() || null,
        ...(slotSel.id ? { ubicacion_id: slotSel.id } : {}),
      };
      
      const res = await crearPaqueteBackend(payload, token);
      if (actualizarPaquetes) await actualizarPaquetes();
      
      setPaquetesLocales(prev => [...prev, res?.paquete || {
        id: Date.now(),
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        ubicacion_id: slotSel.id,
        ubicacion_label: slotSel.label,
        entregado: false
      }]);

      if (activeTab === 'single' && enviarWhatsapp && telefono.trim()) {
        let cleaned = telefono.replace(/\D/g, '');
        if (cleaned.length === 9 && ['6','7','8','9'].includes(cleaned[0])) {
          cleaned = '34' + cleaned;
        }
        if (cleaned) {
          const nombreLocal = tenant?.nombre_empresa || 'nuestro local';
          const text = encodeURIComponent(`Hola ${upperCliente}, tu paquete de ${compania} ya está listo para recoger en ${nombreLocal}. ¡Te esperamos!`);
          window.open(`https://wa.me/${cleaned}?text=${text}`, '_blank');
        }
      }
      
      localStorage.setItem('ap_last_company', compania);
      setUltimoGuardado(slotSel);
      
      playChime();
      setExito(true);
      setTimeout(() => setExito(false), 2000);

      setCliente('');
      setTelefono('');
      setSeleccionManual(false);
      startTransition(() => inputClienteRef.current?.focus());
    } catch (err) {
      handleLimitError(err);
    } finally {
      setLoading(false);
    }
  }, [loading, tenant, cliente, compania, telefono, slotSel, flyFromInputToSlot, actualizarPaquetes, seleccionManual, suggestedLabel, occupancy, activeTab, enviarWhatsapp]);

  const guardarMultiple = useCallback(async () => {
    if (multiSaving) return;
    const names = multiNames.slice(0, multiCount).map(n => toUpperVis(n.trim())).filter(Boolean);
    if (!names.length) { alert('Introduce nombres.'); return; }
    if (batchSameCompany && !batchCompany) { alert('Elige empresa.'); return; }

    try {
      setMultiSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      let commonSlot = slotSel || getMostEmptySlot();

      if (seleccionManual && suggestedLabel && suggestedLabel !== commonSlot.label) {
        const countOfSuggested = occupancy.get(suggestedLabel) || 0;
        setPenalizedSlots(prev => {
          const next = { ...prev, [suggestedLabel]: countOfSuggested };
          localStorage.setItem(`ap_penalties_${tenant.id}`, JSON.stringify(next));
          return next;
        });
      }

      const companiesForRows = names.map((_, i) => batchSameCompany ? (batchCompany || compania) : (multiCompanies[i] || compania));
      const nuevosPaquetes = [];

      for (let i = 0; i < names.length; i++) {
        const res = await crearPaqueteBackend({
          tenant_id: tenant.id, nombre_cliente: names[i], empresa_transporte: companiesForRows[i],
          ubicacion_label: commonSlot.label, ...(commonSlot.id ? { ubicacion_id: commonSlot.id } : {})
        }, token);
        nuevosPaquetes.push(res?.paquete || {
          id: Date.now() + i,
          nombre_cliente: names[i],
          empresa_transporte: companiesForRows[i],
          ubicacion_label: commonSlot.label,
          ubicacion_id: commonSlot.id,
          entregado: false
        });
      }

      localStorage.setItem('ap_last_company', batchSameCompany ? batchCompany : compania);
      if (actualizarPaquetes) await actualizarPaquetes();
      
      setPaquetesLocales(prev => [...prev, ...nuevosPaquetes]);
      
      playChime(260);
      setExito(true);
      setUltimoGuardado(commonSlot);
      setTimeout(() => setExito(false), 2000);
      setMultiNames(Array.from({length: multiCount}, ()=> ''));
    } catch (err) {
      handleLimitError(err);
    } finally {
      setMultiSaving(false);
    }
  }, [multiSaving, multiNames, multiCount, batchSameCompany, batchCompany, multiCompanies, compania, tenant, slotSel, getMostEmptySlot, actualizarPaquetes, seleccionManual, suggestedLabel, occupancy]);

  const aceptarSugerenciaCliente = useCallback(() => {
    if (!sugCliente) return;
    setLeadingName(sugCliente.name);
    setSeleccionManual(false);
    const slot = pickForClient(sugCliente.name);
    if (slot) setSlotSel(slot);
    playChime(150);
  }, [sugCliente, setLeadingName, pickForClient]);

  const getOccStyle = (count) => {
    if (count === 0) return "bg-zinc-50 border-zinc-200 text-zinc-400 hover:bg-zinc-100";
    if (count <= 4) return "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100";
    if (count <= 9) return "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100";
    return "bg-red-50 border-red-200 text-red-700 hover:bg-red-100";
  };

  const suggestionPulse = !!(sugCliente || matchInfo?.label);
  const selectedPulse   = !!(seleccionManual || sugCliente || matchInfo?.label);

  const renderScannerButton = () => {
    if (isCheckingPlan) {
      return <><IconSpinner /> Cargando...</>;
    }
    switch (aiStatus) {
      case 'unlimited':
        return <><IconScan /> Escáner en Vivo</>;
      case 'trial_active':
        return <><IconScan /> Escáner IA (Prueba)</>;
      case 'trial_available':
        return <><IconSparkles className="w-[18px] h-[18px]" /> Probar Pistoleo IA Gratis</>;
      default:
        return <><IconSparkles className="w-[18px] h-[18px]" /> Pistoleo Inteligente IA <IconLock /></>;
    }
  };

  return (
    <div className={`bg-white relative ${modoRapido ? '' : 'p-8 rounded-[2rem] border border-zinc-200/80 shadow-sm max-w-5xl mx-auto'}`}>
      <style dangerouslySetInnerHTML={{ __html: extraStyles }} />
      <div id="fly-layer" ref={flyLayerRef} aria-hidden="true" />
      
      {!modoRapido && (
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-zinc-100 pb-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
              <IconBox />
            </div>
            <div>
              <h2 className="text-3xl font-black text-zinc-950 tracking-tight">Añadir Entrada</h2>
              <p className="text-zinc-600 font-bold text-base mt-1">Registra paquetes y el sistema sugiere la mejor ubicación.</p>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={() => {
              document.activeElement?.blur();
              if (['unlimited', 'trial_active'].includes(aiStatus)) setShowCamera(true);
              else if (aiStatus === 'trial_available') setShowTrialModal(true);
              else setShowUpgradePro(true);
            }}
            disabled={isCheckingPlan}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 ${
              isCheckingPlan || ['unlimited', 'trial_active'].includes(aiStatus)
                ? 'bg-brand-500 hover:bg-brand-400 text-white shadow-brand-500/30'
                : aiStatus === 'trial_available'
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 shadow-amber-500/20'
            }`}
          >
            {renderScannerButton()}
          </button>
        </div>
      )}

      <div className="flex bg-zinc-100/80 p-1.5 rounded-xl border border-zinc-200/60 mb-8 w-full max-w-sm">
        <button type="button" onClick={() => setActiveTab('single')} className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === 'single' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Individual</button>
        <button type="button" onClick={() => setActiveTab('multi')} className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'multi' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}><IconLayers /> Múltiple</button>
      </div>

      <form onSubmit={activeTab === 'single' ? guardar : (e) => { e.preventDefault(); guardarMultiple(); }} className="space-y-8">
        {activeTab === 'single' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 relative md:col-span-2">
              <label className="text-xs font-black text-zinc-600 uppercase tracking-widest">Nombre del Cliente</label>
              <input 
                ref={inputClienteRef} type="text" value={cliente} 
                onChange={e => { setLeadingName(e.target.value); setSeleccionManual(false); }} 
                className={`w-full px-4 py-3.5 bg-zinc-50 border rounded-xl outline-none font-black text-lg text-zinc-950 transition-all focus:ring-4 focus:ring-brand-500/20 ${sugCliente ? 'border-brand-300 shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 'border-zinc-200'}`} 
                placeholder="Escanea o escribe..." 
                autoComplete="off" 
              />
              <AnimatePresence>
                {sugCliente && toUpperVis(leadingName) !== toUpperVis(sugCliente.name) && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute z-10 w-full mt-2">
                    <button type="button" onClick={aceptarSugerenciaCliente} className="w-full text-left px-4 py-3.5 bg-brand-50 border border-brand-200 rounded-xl shadow-lg flex items-center gap-3 hover:bg-brand-100 transition-colors group">
                      <div className="text-brand-500 animate-pulse"><IconSparkles className="w-[18px] h-[18px]" /></div>
                      <div className="text-base font-bold text-brand-900">
                        ¿Querías decir <strong className="font-black group-hover:text-brand-600 transition-colors">{sugCliente.name}</strong>?
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {matchInfo?.label && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mt-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-2.5 rounded-lg border border-amber-200">
                  <IconInfo /> Hay otro paquete de este cliente en {matchInfo.label}.
                </motion.div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-600 uppercase tracking-widest">Compañía Logística</label>
              <select value={compania} onChange={e => setCompania(e.target.value)} className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/20 outline-none font-black text-lg text-zinc-950 transition-all cursor-pointer">
                {companias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2 md:col-span-3">
              <label className="text-xs font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2"><IconPhone /> Teléfono (Opcional)</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 600123456" className="w-full max-w-sm px-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/20 outline-none font-bold text-base text-zinc-950 transition-all" />
            </div>
          </div>
        ) : (
          <div className="bg-zinc-50/50 p-5 rounded-2xl border border-zinc-200 space-y-5">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                 <label className="text-sm font-black text-zinc-700">Cantidad:</label>
                 <select value={multiCount} onChange={(e)=> applyNewMultiCount(e.target.value)} className="px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-black outline-none cursor-pointer focus:ring-4 focus:ring-brand-500/20">
                   {[2,3,4,5,6,8,10,15,20].map(n => <option key={n} value={n}>{n} paquetes</option>)}
                 </select>
               </div>
               <label className="flex items-center gap-2 text-sm font-black text-zinc-700 cursor-pointer">
                 <input type="checkbox" checked={batchSameCompany} onChange={e => setBatchSameCompany(e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
                 Misma compañía
               </label>
             </div>
             
             {batchSameCompany && (
                <select value={batchCompany} onChange={e => setBatchCompany(e.target.value)} className="w-full px-4 py-3.5 bg-white border border-zinc-200 rounded-xl font-black text-lg text-zinc-950 outline-none focus:ring-4 focus:ring-brand-500/20">
                  {companias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             )}

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
               {multiNames.map((n, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={n} onChange={e => { const v = e.target.value; setMultiNames(p => { const np=[...p]; np[i]=toUpperVis(v); return np;}); if(i===0){setLeadingName(v); setSeleccionManual(false);} }} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg focus:ring-4 focus:ring-brand-500/20 outline-none font-black text-zinc-950 text-sm" placeholder={`Cliente #${i+1}...`} />
                    {!batchSameCompany && (
                      <select value={multiCompanies[i]} onChange={e => { const v=e.target.value; setMultiCompanies(p=>{ const np=[...p]; np[i]=v; return np;})}} className="w-1/3 px-2 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-black outline-none">
                        {companias.map(c => <option key={c} value={c}>{c.substring(0,6)}</option>)}
                      </select>
                    )}
                  </div>
               ))}
             </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-6 py-6 my-6 border-y border-zinc-100">
          <div className="flex flex-row items-center justify-center gap-5 sm:gap-8 w-full">
            <div className={`flex flex-col items-center justify-center w-40 sm:w-56 p-5 rounded-2xl border-2 transition-all ${suggestionPulse ? 'bg-amber-50 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'bg-zinc-50 border-zinc-200'}`}>
              <span className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-3 ${suggestionPulse ? 'text-amber-600' : 'text-zinc-400'}`}>
                <IconLightbulb /> Sugerencia
              </span>
              <div className="bg-white w-full py-4 rounded-xl shadow-sm border border-zinc-100 flex justify-center">
                <span className="text-4xl font-black text-zinc-900">{suggestedLabel || '—'}</span>
              </div>
            </div>

            <div className={`flex flex-col items-center justify-center w-40 sm:w-56 p-5 rounded-2xl border-2 transition-all ${selectedPulse ? 'bg-brand-50 border-brand-400 shadow-[0_0_20px_rgba(45,212,191,0.4)]' : 'bg-zinc-50 border-zinc-200'}`}>
              <span className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-3 ${selectedPulse ? 'text-brand-600' : 'text-zinc-400'}`}>
                <IconCheckCircle /> Seleccionado
              </span>
              <div className="bg-white w-full py-4 rounded-xl shadow-sm border border-zinc-100 flex justify-center">
                <span className="text-4xl font-black text-zinc-900">{slotSel?.label || '—'}</span>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col items-center justify-center">
            {activeTab === 'single' && (
              <div className={`mb-6 w-full sm:w-auto min-w-[320px] overflow-hidden rounded-2xl border-2 transition-all duration-300 ${telefono.trim() ? (enviarWhatsapp ? 'border-[#25D366] bg-[#25D366]/5 shadow-[0_0_20px_rgba(37,211,102,0.15)]' : 'border-zinc-200 bg-white hover:border-zinc-300') : 'border-zinc-100 bg-zinc-50/50 opacity-70'}`}>
                <label className={`flex items-center justify-between gap-6 px-5 py-4 cursor-pointer ${!telefono.trim() && 'cursor-not-allowed'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ${telefono.trim() && enviarWhatsapp ? 'bg-[#25D366] text-white shadow-md shadow-[#25D366]/30 scale-110' : 'bg-zinc-100 text-zinc-400'}`}>
                      <IconWhatsapp />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className={`text-base font-black tracking-tight transition-colors ${telefono.trim() && enviarWhatsapp ? 'text-[#25D366]' : 'text-zinc-900'}`}>Notificar por WhatsApp</span>
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${telefono.trim() ? (enviarWhatsapp ? 'text-[#25D366]/70' : 'text-zinc-400') : 'text-zinc-400'}`}>
                        {telefono.trim() ? 'Aviso al cliente' : 'Falta teléfono'}
                      </span>
                    </div>
                  </div>
                  <div className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ${telefono.trim() && enviarWhatsapp ? 'bg-[#25D366]' : 'bg-zinc-200'}`}>
                    <input type="checkbox" checked={enviarWhatsapp && !!telefono.trim()} onChange={e => setEnviarWhatsapp(e.target.checked)} disabled={!telefono.trim()} className="sr-only" />
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${telefono.trim() && enviarWhatsapp ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading || !puedeGuardar} 
              className="w-full sm:w-auto px-12 py-4 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-black text-lg rounded-xl shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"/> : (activeTab==='single' ? 'Guardar paquete' : `Guardar ${multiCount} paquetes`)}
            </button>
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
            <div>
              <label className="text-xs font-black text-zinc-900 uppercase tracking-widest">Estructura del Local</label>
              <p className="text-sm text-zinc-500 font-bold mt-1">El sistema pre-selecciona el hueco óptimo.</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-wider bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-200">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-zinc-300"/> Vacía</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"/> Libre</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"/> Media</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"/> Llena</div>
            </div>
          </div>

          <div 
            className="grid gap-2.5 sm:gap-3 pb-8" 
            style={{ gridTemplateColumns: `repeat(${cols || 5}, minmax(0, 1fr))` }}
          >
            {ubicaciones.map(u => {
              const count = occupancy.get(u.id) || occupancy.get(u.label) || 0;
              const isSelected = slotSel?.id === u.id || slotSel?.label === u.label;
              const isSuggested = suggestedLabel && u.label === suggestedLabel && !seleccionManual;
              
              let finalClasses = getOccStyle(count);
              if (isSelected) {
                finalClasses = 'bg-zinc-950 border-zinc-950 text-white shadow-lg ring-4 ring-zinc-950/20 transform scale-105 z-20';
              } else if (isSuggested) {
                finalClasses = 'bg-amber-50 border-amber-400 text-amber-900 shadow-[0_0_15px_rgba(251,191,36,0.5)] ring-2 ring-amber-300 z-10 animate-pulse';
              }

              return (
                <button
                  key={u.id}
                  type="button"
                  data-ubi-label={u.label}
                  onClick={() => { setSlotSel(u); setSeleccionManual(true); }}
                  className={`
                    relative flex flex-col items-center justify-center py-4 sm:py-6 rounded-xl transition-all border-2 outline-none
                    ${finalClasses}
                  `}
                >
                  <span className="text-lg sm:text-2xl font-black tracking-tight">{u.label}</span>
                  <span className={`text-[10px] sm:text-xs font-bold mt-1 ${isSelected ? 'text-zinc-400' : ''}`}>{count} paq.</span>
                </button>
              );
            })}
          </div>
        </div>

      </form>

      {showCamera && <CameraScanner onCapture={processAIScan} onClose={() => setShowCamera(false)} />}

      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[300] bg-zinc-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <div className="relative flex items-center justify-center w-40 h-40 mb-10">
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="absolute w-full h-full bg-brand-500/20 rounded-full blur-2xl" />
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute w-32 h-32 border-2 border-dashed border-brand-500/50 rounded-full" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute w-24 h-24 border border-brand-400/30 rounded-full" />
              <div className="relative z-10 text-brand-400"><IconSparkles className="w-16 h-16" /></div>
            </div>
            <h3 className="text-3xl font-black text-white tracking-tight mb-3 text-center">La IA está leyendo la etiqueta</h3>
            <p className="text-zinc-400 font-medium text-lg text-center max-w-sm">Extrayendo datos clave del cliente y la compañía con precisión milimétrica.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTrialModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTrialModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center border border-zinc-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-100 text-indigo-500"><IconSparkles className="w-[18px] h-[18px]" /></div>
                <h3 className="text-3xl font-black text-zinc-950 tracking-tight mb-3">Prueba Pistoleo IA</h3>
                <p className="text-zinc-500 font-bold mb-8 leading-relaxed">Como usuario Plus, tienes un pase especial. Disfruta de <strong>7 días de escáner inteligente ilimitado</strong>. Sin compromisos ni cobros sorpresa.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleActivateTrial} disabled={activatingTrial} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                    {activatingTrial ? <IconSpinner /> : 'Activar mis 7 días gratis'}
                  </button>
                  <button onClick={() => setShowTrialModal(false)} disabled={activatingTrial} className="w-full py-4 bg-zinc-100 text-zinc-600 font-bold text-base rounded-xl hover:bg-zinc-200 transition-colors">Ahora no</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {limiteAlcanzado && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center border border-zinc-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[50px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6"><IconLock /></div>
                <h3 className="text-3xl font-black text-zinc-950 tracking-tight mb-3">Límite alcanzado</h3>
                <p className="text-zinc-500 font-bold mb-8 leading-relaxed">Has procesado tus 250 paquetes gratuitos. Pásate a Plus para disfrutar de paquetes ilimitados, notificaciones automáticas y analítica completa.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => navigate(tenantSlug ? `/${tenantSlug}/dashboard/facturacion` : '/dashboard/facturacion')} className="w-full py-4 bg-zinc-950 text-white font-black text-lg rounded-xl shadow-xl shadow-zinc-950/20 hover:bg-zinc-800 transition-all active:scale-95">Ver Planes</button>
                  <button onClick={() => setLimiteAlcanzado(false)} className="w-full py-4 bg-zinc-100 text-zinc-600 font-bold text-base rounded-xl hover:bg-zinc-200 transition-colors">Cerrar y ver paquetes</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpgradePro && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center border border-zinc-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100 text-amber-500"><IconSparkles className="w-[18px] h-[18px]" /></div>
                <h3 className="text-3xl font-black text-zinc-950 tracking-tight mb-3">Pistoleo IA</h3>
                <p className="text-zinc-500 font-bold mb-8 leading-relaxed">
                  {aiStatus === 'trial_expired' 
                    ? "Tu prueba gratuita de 7 días ha finalizado. Mejora al plan PRO para seguir usando el escáner inteligente sin límites." 
                    : "Escanea etiquetas con la cámara y autocompleta el formulario en un segundo. Exclusivo del plan PRO."}
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => navigate(tenantSlug ? `/${tenantSlug}/dashboard/facturacion` : '/dashboard/facturacion')} className="w-full py-4 bg-brand-500 hover:bg-brand-400 text-white font-black text-lg rounded-xl shadow-lg shadow-brand-500/30 transition-all active:scale-95">Mejorar a PRO</button>
                  <button onClick={() => setShowUpgradePro(false)} className="w-full py-4 bg-zinc-100 text-zinc-600 font-bold text-base rounded-xl hover:bg-zinc-200 transition-colors">Volver al escáner manual</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exito && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }} 
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }} 
            exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
            className="fixed bottom-8 left-1/2 bg-zinc-950 text-white px-6 py-4 rounded-2xl shadow-2xl font-black text-base flex items-center gap-3 z-[9999] border border-zinc-800 whitespace-nowrap"
          >
            <div className="text-emerald-400"><IconCheck /></div> 
            Guardado en <span className="text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded-md">{ultimoGuardado?.label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}