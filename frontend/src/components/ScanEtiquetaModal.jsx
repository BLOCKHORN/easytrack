// src/components/ScanEtiquetaModal.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/ScanEtiquetaModal.scss';

/* ===== helpers ===== */
const norm = (s='') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function buildCompanyMatcher(tenantCompanies = []) {
  // Variantes frecuentes por marca
  const COMMON = {
    'correos': ['correos'],
    'correos express': ['correos express','correosexpress','correos-express','correos_express','cte','cte express'],
    'seur': ['seur'],
    'mrw': ['mrw'],
    'nacex': ['nacex'],
    'tourline express': ['tourline','tourline express','ctt','ctt express'],
    'zeleris': ['zeleris'],
    'envialia': ['envialia'],
    'halcourier': ['halcourier','hal courier'],
    'tipsa': ['tipsa'],
    'asm': ['asm'],
    'paq24': ['paq24','paquete 24','paqueteria 24'],
    'genei': ['genei'],
    'sending': ['sending'],
    'redyser': ['redyser'],
    'dhl': ['dhl'],
    'ups': ['ups'],
    'fedex': ['fedex','fed ex'],
    'tnt': ['tnt'],
    'gls': ['gls','general logistics'],
    'dpd': ['dpd'],
    'chronopost': ['chronopost'],
    'amazon logistics': ['amazon logistics','amazon','amzl','amz logistics','amzlogistics'],
    'inpost': ['inpost'],
    'mondial relay': ['mondial relay','mondialrelay'],
    'packlink': ['packlink'],
    'relais colis': ['relais colis','relaiscolis'],
    'celeritas': ['celeritas'],
    'shipius': ['shipius'],
    'punto pack': ['punto pack','puntopack'],
    'stuart': ['stuart'],
    'deliveroo logistics': ['deliveroo','deliveroo logistics'],
    'uber direct': ['uber direct','uber'],
    'otros': ['otros','otro','other'],
    'servientrega': ['servientrega'],
    'servienvia': ['servienvia'],
  };

  const map = new Map();
  for (const original of tenantCompanies) {
    const o = String(original||'').trim();
    if (!o) continue;
    const k = norm(o);
    map.set(k, o);
    const variants = COMMON[k] || COMMON[o.toLowerCase()] || [];
    for (const v of variants) map.set(norm(v), o);
    map.set(k.replace(/\s+/g,''), o); // sin espacios
  }

  return (text='') => {
    const T = norm(text);
    if (!T) return '';
    for (const [k, val] of map.entries()) {
      if (k && T.includes(k)) return val;
    }
    return '';
  };
}

function guessNameFromOCR(text='') {
  const lines = String(text).split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const bad = (l) =>
    /\b(c\/|calle|avda|avenida|plaza|piso|puerta|cp|c\.p\.|nº|num\.?|cod.*postal|espa[ñn]a|spain)\b/i.test(l) ||
    /(\d{3,}[-\s]?\d{3,}|\bES\d{3,})/.test(l) ||
    /^[\W_]+$/.test(l);

  for (const l of lines) {
    if (bad(l)) continue;
    const words = l.split(/\s+/).filter(w => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(w));
    if (words.length >= 2 && l.length >= 4) return l.toUpperCase();
  }
  const cand = lines.filter(l => !bad(l)).sort((a,b)=>b.length-a.length)[0];
  return (cand||'').toUpperCase();
}

/* ===== Componente ===== */
export default function ScanEtiquetaModal({ open, onClose, onResult, tenantCompanies=[] }) {
  const [empresa, setEmpresa] = useState('');
  const [nombre, setNombre]   = useState('');
  const [ocrReady, setOcrReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const matcher = useMemo(() => buildCompanyMatcher(tenantCompanies), [tenantCompanies]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try { await startCam(); await loadOCR(); loop(); } catch(e){ console.error(e); }
    })();
    return () => { stopLoop(); stopCam(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadOCR() {
    try {
      if (window.__ET_OCRW) { setOcrReady(true); return; }
      const T = await import('tesseract.js');
      const { createWorker } = T;
      window.__ET_OCRW = await createWorker('eng', 1, { workerPath: undefined });
      setOcrReady(true);
    } catch { /* ignore */ }
  }

  async function startCam() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, audio: false
    });
    const v = videoRef.current;
    if (v) { v.srcObject = stream; await v.play(); }
  }
  function stopCam() {
    const v = videoRef.current;
    if (v && v.srcObject) v.srcObject.getTracks().forEach(t => t.stop());
  }

  function stopLoop(){ if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current=null; }
  function loop(){
    stopLoop();
    const tick = async () => { await readAndDetect(); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function readAndDetect() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || !ocrReady || !v.videoWidth) return;

    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d', { willReadFrequently:true });
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.7);

    // ZXing → pistas de transportista
    try {
      const { BrowserMultiFormatReader, HTMLCanvasElementLuminanceSource, HybridBinarizer, BinaryBitmap } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const src = new HTMLCanvasElementLuminanceSource(c);
      const bin = new HybridBinarizer(src);
      const bmp = new BinaryBitmap(bin);
      const code = reader.decodeBitmap(bmp);
      const txt = code?.getText?.() || '';
      const hit = matcher(txt);
      if (hit && !empresa) setEmpresa(hit);
    } catch { /* sin código */ }

    // OCR → nombre + empresa
    try {
      const worker = window.__ET_OCRW;
      const { data } = await worker.recognize(dataUrl);
      const text = data?.text || '';
      if (text) {
        const nom = guessNameFromOCR(text);
        if (nom && nom.length >= 3) setNombre(nom);
        const hit = matcher(text);
        if (hit) setEmpresa(hit);
      }
    } catch { /* frame con ruido: ignorar */ }
  }

  function handleClose(){ stopLoop(); stopCam(); onClose?.(); }
  async function handleConfirm(){
    if (!nombre) return;
    setBusy(true);
    try { onResult?.({ nombre, empresa: empresa || '' }); handleClose(); }
    finally { setBusy(false); }
  }

  if (!open) return null;
  return (
    <div className="scan-modal" role="dialog" aria-modal="true">
      <div className="scan-card">
        <header className="scan-header">
          <h3>Escanear etiqueta</h3>
          <button className="btn btn--ghost" onClick={handleClose} aria-label="Cerrar">✕</button>
        </header>

        <div className="scan-body">
          <div className="cam">
            <video ref={videoRef} playsInline muted />
            <div className="aim" />
          </div>

          <div className="fields">
            <label className="lbl">Empresa detectada</label>
            <input className="input" value={empresa} onChange={e=>setEmpresa(e.target.value)} placeholder="—" />

            <label className="lbl">Nombre cliente</label>
            <input className="input" value={nombre} onChange={e=>setNombre(e.target.value.toUpperCase())} placeholder="—" />
            <small className="help">Edita si lo ves raro antes de confirmar.</small>
          </div>
        </div>

        <footer className="scan-foot">
          <button className="btn btn--ghost" onClick={handleClose}>Cancelar</button>
          <div style={{ flex:1 }} />
          <button className="btn btn--primary" onClick={handleConfirm} disabled={!nombre || busy}>
            {busy ? 'Confirmando…' : 'Usar estos datos'}
          </button>
        </footer>
      </div>

      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  );
}
