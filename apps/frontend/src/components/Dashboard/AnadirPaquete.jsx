import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { getTenantIdOrThrow } from '../../utils/tenant';
import { crearPaqueteBackend, obtenerPaquetesBackend } from '../../services/paquetesService';
import { cargarUbicaciones } from '../../services/ubicacionesService';

// Carga en el entorno global para limpiar desde ConfigPage
window.__AP_PAGE_CACHE = window.__AP_PAGE_CACHE || {
  loaded: false,
  tenant: null,
  aiStatus: 'locked',
  companias: [],
  rawUbicaciones: [],
  metaUbi: { cols: 5, order: 'horizontal' },
  paquetesPendientes: []
};

const IconBox = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconCheck = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const IconLayers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconSparkles = ({ className = "w-[18px] h-[18px]" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconInfo = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconLock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconScan = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.5-1.5"/></svg>;
const IconPhone = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconSpinner = ({ className = "animate-spin h-5 w-5 text-current" }) => <svg className={className} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>;
const IconWhatsapp = ({ className = "w-[18px] h-[18px]" }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133-.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>;
const IconArrowRight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const IconCheckCircle = ({ className = "w-[18px] h-[18px]" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

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
    <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col">
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative w-72 h-40 border border-white/50 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center">
           <div className="w-12 h-0.5 bg-[#14B07E] mb-8" />
           <div className="w-12 h-0.5 bg-[#14B07E]" />
        </div>
        <p className="absolute bottom-10 text-white font-bold text-sm uppercase tracking-widest bg-black/60 px-5 py-2.5 rounded-lg backdrop-blur-md">Encuadra la etiqueta</p>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="bg-zinc-950 p-8 flex items-center justify-between pb-12 border-t border-zinc-800">
        <button onClick={onClose} className="text-zinc-400 font-bold text-sm hover:text-white transition-colors">CANCELAR</button>
        <button onClick={capture} className="w-16 h-16 bg-white rounded-full border-4 border-zinc-800 active:scale-90 transition-transform flex items-center justify-center">
           <div className="w-12 h-12 rounded-full border border-zinc-950" />
        </button>
        <div className="w-16" />
      </div>
    </div>
  );
};

export default function AnadirPaquete({ modoRapido = false, paquetes: propsPaquetes, actualizarPaquetes }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantSlug } = useParams();

  const [isInitializing, setIsInitializing] = useState(!window.__AP_PAGE_CACHE.loaded);
  const [tenant, setTenant] = useState(window.__AP_PAGE_CACHE.tenant);
  const [aiStatus, setAiStatus] = useState(window.__AP_PAGE_CACHE.aiStatus);
  
  const [companias, setCompanias] = useState(window.__AP_PAGE_CACHE.companias);
  const [compania, setCompania]   = useState(() => {
    if (!window.__AP_PAGE_CACHE.loaded) return '';
    const last = localStorage.getItem('ap_last_company');
    return (last && window.__AP_PAGE_CACHE.companias.includes(last)) ? last : (window.__AP_PAGE_CACHE.companias[0] || '');
  });
  
  const [cliente, setCliente]     = useState('');
  const [telefono, setTelefono]   = useState('');
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(false);
  const [activeTab, setActiveTab] = useState('single'); 

  const [multiCount, setMultiCount] = useState(5);
  const [multiNames, setMultiNames] = useState(() => Array.from({length:5}, ()=>''));
  const [batchSameCompany, setBatchSameCompany] = useState(true);
  const [batchCompany, setBatchCompany] = useState(() => {
    if (!window.__AP_PAGE_CACHE.loaded) return '';
    const last = localStorage.getItem('ap_last_company');
    return (last && window.__AP_PAGE_CACHE.companias.includes(last)) ? last : (window.__AP_PAGE_CACHE.companias[0] || '');
  });
  const [multiCompanies, setMultiCompanies] = useState(() => Array.from({length:5}, () => {
    if (!window.__AP_PAGE_CACHE.loaded) return '';
    const last = localStorage.getItem('ap_last_company');
    return (last && window.__AP_PAGE_CACHE.companias.includes(last)) ? last : (window.__AP_PAGE_CACHE.companias[0] || '');
  }));
  const [multiSaving, setMultiSaving] = useState(false);

  const [sugCliente, setSugCliente] = useState(null); 
  const [matchInfo, setMatchInfo] = useState(null);  

  const [rawUbicaciones, setRawUbicaciones] = useState(window.__AP_PAGE_CACHE.rawUbicaciones);
  const [metaUbi, setMetaUbi] = useState(window.__AP_PAGE_CACHE.metaUbi);
  const [penalizedSlots, setPenalizedSlots] = useState({});

  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
  const [showUpgradePro, setShowUpgradePro] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [activatingTrial, setActivatingTrial] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [paquetesLocales, setPaquetesLocales] = useState(window.__AP_PAGE_CACHE.paquetesPendientes);
  const paquetes = propsPaquetes || paquetesLocales;

  const [slotSel, setSlotSel] = useState(null);
  const [seleccionManual, setSeleccionManual] = useState(false);

  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);

  const inputClienteRef = useRef(null);
  const flyLayerRef = useRef(null);

  const cols = clamp(parseInt(metaUbi?.cols ?? 5, 10) || 5, 1, 12);
  
  const ubicaciones = useMemo(() => {
    return [...rawUbicaciones].sort((a,b) => (a.orden ?? 0) - (b.orden ?? 0)).map((u, i) => ({
      ...u,
      label: String(u.label || u.codigo || `B${i+1}`).toUpperCase()
    }));
  }, [rawUbicaciones]);

  const extraStyles = `
  @keyframes flyCurve {
    0% { transform: translate(var(--sx), var(--sy)) scale(1); opacity: 1; }
    50% { transform: translate(calc(var(--sx) + (var(--ex) - var(--sx))/2), calc(var(--sy) - 150px)) scale(1.5) rotate(15deg); opacity: 1; }
    100% { transform: translate(var(--ex), var(--ey)) scale(0.2) rotate(0deg); opacity: 0; }
  }
  .fly-parcel {
    position: fixed; z-index: 9999; top: 0; left: 0; pointer-events: none;
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; background: #18181b; color: white; border-radius: 8px;
    border: 1px solid #3f3f46;
    opacity: 0;
  }
  .fly-parcel.animate { animation: flyCurve 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
  `;

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const tid = await getTenantIdOrThrow();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001";

        try {
          const storedPenalties = JSON.parse(localStorage.getItem(`ap_penalties_${tid}`)) || {};
          setPenalizedSlots(storedPenalties);
        } catch(e) {}

        const [limitsRes, carriersRes, ubiData, pkgsData] = await Promise.all([
          fetch(`${API_URL}/api/limits/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
          fetch(`${API_URL}/api/ubicaciones/carriers`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ empresas: [] })),
          cargarUbicaciones(token, tid).catch(() => ({})),
          !propsPaquetes ? obtenerPaquetesBackend(token, { estado: 'pendiente', all: 1 }).catch(() => []) : Promise.resolve(null)
        ]);

        if (cancel) return;

        const limitsData = limitsRes;
        const newAiStatus = limitsData?.entitlements?.features?.aiStatus || 'locked';
        const nombreEmpresa = limitsData?.tenant?.nombre_empresa || '';
        const newTenant = { id: tid, nombre_empresa: nombreEmpresa };
        
        const listaCompanias = (carriersRes.empresas || []).map(e => e?.nombre).filter(Boolean).sort((a,b)=>a.localeCompare(b));
        const newRawUbis = Array.isArray(ubiData?.ubicaciones) ? ubiData.ubicaciones : [];
        const newMeta = { cols: ubiData?.meta?.cols ?? 5, order: ubiData?.meta?.order ?? ubiData?.meta?.orden ?? 'horizontal' };

        window.__AP_PAGE_CACHE = {
           loaded: true,
           tenant: newTenant,
           aiStatus: newAiStatus,
           companias: listaCompanias,
           rawUbicaciones: newRawUbis,
           metaUbi: newMeta,
           paquetesPendientes: pkgsData ? (Array.isArray(pkgsData) ? pkgsData : []) : window.__AP_PAGE_CACHE.paquetesPendientes
        };

        setTenant(newTenant);
        setAiStatus(newAiStatus);
        setCompanias(listaCompanias);
        setRawUbicaciones(newRawUbis);
        setMetaUbi(newMeta);

        if (!propsPaquetes && pkgsData) {
          setPaquetesLocales(Array.isArray(pkgsData) ? pkgsData : []);
        }

        if (isInitializing) {
          const lastCompany = localStorage.getItem('ap_last_company');
          const defaultCompany = (lastCompany && listaCompanias.includes(lastCompany)) ? lastCompany : (listaCompanias[0] || '');
          setCompania(defaultCompany);
          setBatchCompany(defaultCompany);
          setMultiCompanies(prev => prev.map(() => defaultCompany));
          
          setIsInitializing(false);
          setTimeout(() => inputClienteRef.current?.focus(), 50);
        }

      } catch (e) {
        if (!cancel) setIsInitializing(false);
      }
    })();
    return () => { cancel = true; };
  }, [propsPaquetes, isInitializing]);

  useEffect(() => {
    if (!isInitializing && location.state?.openScanner) {
      window.history.replaceState({}, document.title);
      if (['unlimited', 'trial_active'].includes(aiStatus)) {
        setShowCamera(true);
      } else if (aiStatus === 'trial_available') {
        setShowTrialModal(true);
      } else {
        setShowUpgradePro(true);
      }
    }
  }, [isInitializing, location.state, aiStatus]);

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
    if (isInitializing) return;
    
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
  }, [leadingName, paquetes, seleccionManual, pickForClient, getMostEmptySlot, isInitializing]);

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
      
      const isMulti = activeTab === 'multi';
      const companiaFija = (isMulti && batchSameCompany && batchCompany) ? batchCompany : null;

      const res = await fetch(`${API_URL}/api/ia/scan-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          imageBase64: base64Image, 
          tenant_id: tenant.id,
          compania_fija: companiaFija
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error en el servidor de IA');
      }
      
      const data = await res.json();

      if (isMulti) {
        setMultiNames(prev => {
          const next = [...prev];
          const emptyIdx = next.findIndex(n => !n.trim());
          if (emptyIdx !== -1) {
            next[emptyIdx] = toUpperVis(data.cliente || '');
          }
          return next;
        });
        
        if (!batchSameCompany && data.compania) {
          const aiComp = toUpperVis(data.compania);
          const match = companias.find(c => {
            const dbComp = toUpperVis(c);
            return dbComp === aiComp || dbComp.includes(aiComp) || aiComp.includes(dbComp);
          });
          
          if (match) {
            setMultiCompanies(prev => {
              const next = [...prev];
              const emptyIdx = multiNames.findIndex(n => !n.trim()); 
              if (emptyIdx !== -1) {
                next[emptyIdx] = match;
              }
              return next;
            });
          }
        }
      } else {
        if (data.cliente) setLeadingName(data.cliente);
        if (data.telefono) {
          setTelefono(data.telefono);
          setEnviarWhatsapp(false);
        }
        
        if (!companiaFija && data.compania) {
          const aiComp = toUpperVis(data.compania);
          const match = companias.find(c => {
            const dbComp = toUpperVis(c);
            return dbComp === aiComp || dbComp.includes(aiComp) || aiComp.includes(dbComp);
          });
          if (match) {
            setCompania(match);
          }
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
      
      setTimeout(() => { try { layer.removeChild(parcel); } catch {} }, 600);
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
      
      const newPkg = res?.paquete || {
        id: Date.now(),
        nombre_cliente: upperCliente,
        empresa_transporte: compania,
        ubicacion_id: slotSel.id,
        ubicacion_label: slotSel.label,
        entregado: false
      };
      window.__AP_PAGE_CACHE.paquetesPendientes = [...window.__AP_PAGE_CACHE.paquetesPendientes, newPkg];
      
      if (actualizarPaquetes) await actualizarPaquetes();
      setPaquetesLocales(prev => [...prev, newPkg]);

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
      
      window.__AP_PAGE_CACHE.paquetesPendientes = [...window.__AP_PAGE_CACHE.paquetesPendientes, ...nuevosPaquetes];
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

  const suggestionPulse = !!(sugCliente || matchInfo?.label);
  const selectedPulse   = !!(seleccionManual || sugCliente || matchInfo?.label);

  const renderScannerButton = () => {
    switch (aiStatus) {
      case 'unlimited':
        return <><IconScan /> Escáner en Vivo</>;
      case 'trial_active':
        return <><IconScan /> Escáner IA (Prueba)</>;
      case 'trial_available':
        return <><IconSparkles className="w-4 h-4" /> Probar Escáner IA</>;
      default:
        return (
          <div className="flex items-center gap-2">
            <IconSparkles className="w-4 h-4 text-zinc-500" /> 
            <span>Escaneo Inteligente</span>
            <div className="ml-1 opacity-50"><IconLock /></div>
          </div>
        );
    }
  };

  if (isInitializing) {
    return (
      <div className={`bg-white flex flex-col items-center justify-center ${modoRapido ? 'h-[400px]' : 'min-h-[60vh] rounded-[2rem] border border-zinc-200/80 mx-auto max-w-5xl'}`}>
        <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#14B07E] rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-bold text-sm uppercase tracking-widest">Sincronizando local...</p>
      </div>
    );
  }

  return (
    <div className={`bg-white relative ${modoRapido ? '' : 'p-4 sm:p-8 rounded-[2rem] border border-zinc-200/80 shadow-sm max-w-5xl mx-auto'}`}>
      <style dangerouslySetInnerHTML={{ __html: extraStyles }} />
      <div id="fly-layer" ref={flyLayerRef} aria-hidden="true" />
      
      {!modoRapido && (
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-12 h-12 bg-zinc-950 rounded-2xl items-center justify-center text-white shadow-sm shrink-0">
              <IconBox />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">Añadir Entrada</h2>
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
            className={`flex items-center justify-center gap-2.5 px-4 py-2.5 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 ${
              ['unlimited', 'trial_active'].includes(aiStatus)
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-md'
                : aiStatus === 'trial_available'
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 shadow-sm'
                  : 'bg-zinc-50 text-zinc-400 border border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            {renderScannerButton()}
          </button>
        </div>
      )}

      <div className="flex bg-zinc-100/80 p-1.5 rounded-xl border border-zinc-200/60 mb-6 w-full sm:max-w-sm">
        <button type="button" onClick={() => setActiveTab('single')} className={`flex-1 py-1.5 sm:py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === 'single' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Individual</button>
        <button type="button" onClick={() => setActiveTab('multi')} className={`flex-1 py-1.5 sm:py-2.5 text-sm font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'multi' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}><IconLayers /> Múltiple</button>
      </div>

      <form onSubmit={activeTab === 'single' ? guardar : (e) => { e.preventDefault(); guardarMultiple(); }} className="space-y-4 sm:space-y-6">
        {activeTab === 'single' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-1.5 relative md:col-span-2">
              <label className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">Nombre del Cliente</label>
              <input 
                ref={inputClienteRef} type="text" value={cliente} 
                onChange={e => { setLeadingName(e.target.value); setSeleccionManual(false); }} 
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-zinc-50 border rounded-xl outline-none font-black text-base sm:text-lg text-zinc-950 transition-colors focus:bg-white focus:border-[#14B07E] ${sugCliente ? 'border-[#14B07E] bg-white' : 'border-zinc-200'}`} 
                placeholder="Escanea o escribe..." 
                autoComplete="off" 
              />
              <AnimatePresence>
                {sugCliente && toUpperVis(leadingName) !== toUpperVis(sugCliente.name) && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-10 w-full mt-2">
                    <button type="button" onClick={aceptarSugerenciaCliente} className="w-full text-left px-3 sm:px-4 py-3 bg-white border border-[#14B07E]/30 rounded-xl shadow-md flex items-center gap-3 hover:bg-[#14B07E]/5 transition-colors">
                      <div className="text-[#14B07E]"><IconInfo /></div>
                      <div className="text-sm sm:text-base font-medium text-zinc-700">
                        ¿Querías decir <strong className="font-black text-[#14B07E]">{sugCliente.name}</strong>?
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {matchInfo?.label && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mt-2 text-[10px] sm:text-xs font-bold text-zinc-700 bg-zinc-100 px-3 py-2 rounded-lg border border-zinc-200">
                  <IconInfo /> Otro paquete en {matchInfo.label}.
                </motion.div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">Compañía</label>
              <select value={compania} onChange={e => setCompania(e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none font-black text-base sm:text-lg text-zinc-950 transition-colors focus:bg-white focus:border-[#14B07E] cursor-pointer">
                {companias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><IconPhone /> Teléfono (Opcional)</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 600123456" className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none font-bold text-base sm:text-lg text-zinc-950 transition-colors focus:bg-white focus:border-[#14B07E]" />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">Aviso WhatsApp</label>
              <label className={`flex items-center justify-between w-full h-[46px] sm:h-[56px] px-3 sm:px-4 rounded-xl border transition-all cursor-pointer ${telefono.trim() ? (enviarWhatsapp ? 'border-[#14B07E] bg-[#14B07E] text-white shadow-sm shadow-[#14B07E]/20' : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400') : 'border-zinc-100 bg-zinc-50 opacity-60 cursor-not-allowed'}`}>
                <div className="flex items-center gap-2">
                  <IconWhatsapp />
                  <span className="text-xs sm:text-sm font-bold">Avisar</span>
                </div>
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${telefono.trim() && enviarWhatsapp ? 'bg-white' : 'bg-zinc-300'}`}>
                  <input type="checkbox" className="sr-only" checked={enviarWhatsapp && !!telefono.trim()} onChange={e => setEnviarWhatsapp(e.target.checked)} disabled={!telefono.trim()} />
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${telefono.trim() && enviarWhatsapp ? 'translate-x-4 bg-[#14B07E]' : 'translate-x-1 bg-white'}`} />
                </div>
              </label>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-50/50 p-4 sm:p-5 rounded-2xl border border-zinc-200 space-y-4">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                 <label className="text-sm font-black text-zinc-700">Cantidad:</label>
                 <select value={multiCount} onChange={(e)=> applyNewMultiCount(e.target.value)} className="px-3 sm:px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-black outline-none cursor-pointer focus:border-[#14B07E]">
                   {[2,3,4,5,6,8,10,15,20].map(n => <option key={n} value={n}>{n} paquetes</option>)}
                 </select>
               </div>
               <label className="flex items-center gap-2 text-sm font-black text-zinc-700 cursor-pointer">
                 <input type="checkbox" checked={batchSameCompany} onChange={e => setBatchSameCompany(e.target.checked)} className="w-4 h-4 rounded text-[#14B07E] border-zinc-300 focus:ring-[#14B07E]" />
                 Misma compañía
               </label>
             </div>
             
             {batchSameCompany && (
                <select value={batchCompany} onChange={e => setBatchCompany(e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-white border border-zinc-300 rounded-xl font-black text-base sm:text-lg text-zinc-950 outline-none focus:border-[#14B07E]">
                  {companias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             )}

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-1">
               {multiNames.map((n, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={n} onChange={e => { const v = e.target.value; setMultiNames(p => { const np=[...p]; np[i]=toUpperVis(v); return np;}); if(i===0){setLeadingName(v); setSeleccionManual(false);} }} className="w-full px-3 py-2 sm:py-3 bg-white border border-zinc-200 rounded-lg focus:border-[#14B07E] outline-none font-bold text-zinc-950 text-sm" placeholder={`Cliente #${i+1}...`} />
                    {!batchSameCompany && (
                      <select value={multiCompanies[i]} onChange={e => { const v=e.target.value; setMultiCompanies(p=>{ const np=[...p]; np[i]=v; return np;})}} className="w-1/3 px-1 py-2 sm:py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold outline-none focus:border-[#14B07E]">
                        {companias.map(c => <option key={c} value={c}>{c.substring(0,6)}</option>)}
                      </select>
                    )}
                  </div>
               ))}
             </div>
          </div>
        )}

        <div className="py-4 my-4 border-y border-zinc-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* PANEL DE ENRUTAMIENTO (Routing Summary) */}
          <div className="flex flex-col sm:flex-row items-stretch w-full md:w-auto bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            
            <div className={`flex flex-col justify-center px-5 py-3.5 border-b sm:border-b-0 sm:border-r border-zinc-200 transition-colors w-full sm:w-40 ${suggestionPulse ? 'bg-[#14B07E]/5' : 'bg-zinc-50'}`}>
              <span className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                {suggestionPulse ? <IconSparkles className="w-3 h-3 text-[#14B07E]" /> : null}
                IA Sugiere
              </span>
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${suggestionPulse ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {suggestedLabel || '—'}
              </span>
            </div>

            <div className="hidden sm:flex items-center justify-center px-4 bg-zinc-50 text-zinc-300">
               <IconArrowRight />
            </div>

            <div className={`flex flex-col justify-center px-5 py-3.5 transition-colors w-full sm:w-48 ${selectedPulse ? 'bg-[#14B07E] text-white shadow-inner' : 'bg-white text-zinc-900'}`}>
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 ${selectedPulse ? 'text-white/80' : 'text-zinc-400'}`}>
                {selectedPulse ? <IconCheckCircle className="w-3 h-3" /> : null}
                Destino Final
              </span>
              <span className="text-3xl sm:text-4xl font-black tracking-tighter">
                {slotSel?.label || '—'}
              </span>
            </div>
            
          </div>

          <button 
            type="submit" 
            disabled={loading || !puedeGuardar} 
            className="w-full md:w-auto h-full min-h-[64px] px-8 bg-[#14B07E] hover:bg-[#129A6E] disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-black text-base sm:text-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0 border border-transparent disabled:border-zinc-200"
          >
            {loading ? <div className="w-5 h-5 border-4 border-zinc-400 border-t-[#14B07E] rounded-full animate-spin"/> : (activeTab==='single' ? 'Guardar paquete' : `Guardar ${multiCount}`)}
          </button>
        </div>

        <div>
          <div className="flex flex-row items-center justify-between gap-4 mb-3 sm:mb-4">
            <div>
              <label className="text-[10px] sm:text-xs font-black text-zinc-900 uppercase tracking-widest">Estructura del Local</label>
            </div>
          </div>

          {/* MAPA VISUAL ESTILO PLANO CON MAPA DE CALOR ELEGANTE (TEXTO SIEMPRE NEGRO/GRIS OSCURO) */}
          <div 
            className="grid gap-1.5 sm:gap-3 pb-4" 
            style={{ gridTemplateColumns: `repeat(${metaUbi?.cols || 5}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: (metaUbi?.cols || 5) * Math.max(1, Math.ceil((ubicaciones.reduce((max, u) => Math.max(max, u.orden ?? 0), -1) + 1) / (metaUbi?.cols || 5))) }).map((_, i) => {
              const u = ubicaciones.find(x => x.orden === i);
              
              if (!u) {
                return <div key={`empty-${i}`} className="opacity-0 pointer-events-none aspect-square sm:aspect-auto sm:min-h-[4rem]" />;
              }

              const count = occupancy.get(u.id) || occupancy.get(u.label) || 0;
              const isSelected = slotSel?.id === u.id || slotSel?.label === u.label;
              const isSuggested = suggestedLabel && u.label === suggestedLabel && !seleccionManual;
              
              // MAPA DE CALOR B2B (Muted backgrounds, crisp black text)
              let finalClasses = "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50"; 
              if (count > 0 && count <= 4) finalClasses = "bg-[#E8F7F2] border-[#A7E2CE] text-zinc-900 hover:bg-[#D4EFE6]";
              else if (count >= 5 && count <= 9) finalClasses = "bg-[#FFFBEB] border-[#FDE047] text-zinc-900 hover:bg-[#FEF3C7]";
              else if (count >= 10) finalClasses = "bg-[#FEF2F2] border-[#FECACA] text-zinc-900 hover:bg-[#FEE2E2]";

              // ESTADOS VISUALES
              if (isSelected) {
                finalClasses = 'bg-[#14B07E] border-[#14B07E] text-white shadow-md transform scale-[1.02] z-20';
              } else if (isSuggested) {
                // Marco limpio que indica sugerencia sin robar protagonismo al seleccionado
                finalClasses = 'bg-white border-[#14B07E] border-2 border-dashed text-zinc-900 z-10 hover:bg-zinc-50'; 
              }

              return (
                <button
                  key={u.id || `lbl-${u.label}`}
                  type="button"
                  data-ubi-label={u.label}
                  onClick={() => { setSlotSel(u); setSeleccionManual(true); }}
                  className={`
                    relative flex flex-col items-center justify-center py-3 sm:py-5 rounded-lg sm:rounded-xl transition-all border outline-none aspect-square sm:aspect-auto
                    ${finalClasses}
                  `}
                >
                  <span className="text-sm sm:text-2xl font-black tracking-tight">{u.label}</span>
                  <span className="text-[8px] sm:text-[10px] font-bold mt-0.5 opacity-70 uppercase tracking-wider">{count} paq.</span>
                </button>
              );
            })}
          </div>
        </div>

      </form>

      {/* MODALES LIMPIOS */}
      {showCamera && <CameraScanner onCapture={processAIScan} onClose={() => setShowCamera(false)} />}

      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[300] bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6"
          >
            <div className="relative flex items-center justify-center w-32 h-32 mb-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute w-24 h-24 border-2 border-dashed border-[#14B07E] rounded-full" />
              <div className="relative z-10 text-[#14B07E]"><IconScan className="w-10 h-10" /></div>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2 text-center">Procesando Etiqueta</h3>
            <p className="text-[#14B07E]/70 font-medium text-sm text-center max-w-xs">Extrayendo datos clave mediante visión artificial...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTrialModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTrialModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl shadow-xl w-full max-w-md p-6 sm:p-8 border border-zinc-200">
              <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mb-5 border border-zinc-200 text-zinc-900"><IconSparkles className="w-6 h-6" /></div>
              <h3 className="text-xl font-black text-zinc-950 tracking-tight mb-2">Prueba Pistoleo IA</h3>
              <p className="text-zinc-600 font-medium mb-6 text-sm leading-relaxed">Como usuario Plus, disfruta de <strong>7 días de escáner inteligente ilimitado</strong>. Sin compromisos ni cobros sorpresa.</p>
              <div className="flex flex-col gap-2">
                <button onClick={handleActivateTrial} disabled={activatingTrial} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                  {activatingTrial ? <IconSpinner /> : 'Activar prueba de 7 días'}
                </button>
                <button onClick={() => setShowTrialModal(false)} disabled={activatingTrial} className="w-full py-3 bg-white border border-zinc-200 text-zinc-600 font-bold text-sm rounded-xl hover:bg-zinc-50 transition-colors">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {limiteAlcanzado && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl shadow-xl w-full max-w-md p-6 sm:p-8 border border-zinc-200">
              <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mb-5 border border-zinc-200 text-zinc-900"><IconLock /></div>
              <h3 className="text-xl font-black text-zinc-950 tracking-tight mb-2">Límite alcanzado</h3>
              <p className="text-zinc-600 font-medium mb-6 text-sm leading-relaxed">Has procesado tus paquetes gratuitos. Pásate a Plus para volumen ilimitado y automatización.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate(tenantSlug ? `/${tenantSlug}/dashboard/facturacion` : '/dashboard/facturacion')} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl transition-colors">Ver Planes</button>
                <button onClick={() => setLimiteAlcanzado(false)} className="w-full py-3 bg-white border border-zinc-200 text-zinc-600 font-bold text-sm rounded-xl hover:bg-zinc-50 transition-colors">Volver</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpgradePro && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setShowUpgradePro(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 text-left">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-5 border border-zinc-700 text-white"><IconSparkles className="w-5 h-5" /></div>
              <h3 className="text-xl font-black text-white tracking-tight mb-2">Escaneo Inteligente</h3>
              <p className="text-zinc-400 font-medium mb-6 text-sm leading-relaxed">
                {aiStatus === 'trial_expired' 
                  ? "Tu acceso de prueba ha caducado. Actualiza a una licencia PRO para restaurar el escáner." 
                  : "Utiliza el motor de visión artificial para procesar etiquetas. Función reservada para plan PRO."}
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate(tenantSlug ? `/${tenantSlug}/dashboard/facturacion` : '/dashboard/facturacion')} className="w-full py-3 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm rounded-xl transition-colors">Mejorar a PRO</button>
                <button onClick={() => setShowUpgradePro(false)} className="w-full py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-sm rounded-xl hover:text-white transition-colors">Cerrar</button>
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
            className="fixed bottom-24 md:bottom-8 left-1/2 bg-zinc-900 text-white px-6 py-4 rounded-xl shadow-xl font-bold text-sm flex items-center gap-3 z-[9999] border border-zinc-800 whitespace-nowrap"
          >
            <IconCheck /> 
            Guardado en <span className="bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">{ultimoGuardado?.label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}