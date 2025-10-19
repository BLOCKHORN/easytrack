// src/components/ScanEtiquetaModal.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import './ScanEtiquetaModal.scss';

/* ===== helpers ===== */
const norm = (s='') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function buildCompanyMatcher(tenantCompanies = []) {
  // Variantes frecuentes por marca (puedes extender si quieres)
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
    map.set(k.replace(/\s+/g,''), o);
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

function isLikelyAddressOrCode(l='') {
  return /\b(c\/|calle|avda|avenida|plaza|piso|puerta|cp|c\.p\.|nº|num\.?|cod.*postal|espa[ñn]a|spain|provincia|localidad)\b/i.test(l)
    || /(\d{3,}[-\s]?\d{3,}|\bES\d{3,}|\b\d{5}\b)/i.test(l)
    || /^[\W_]+$/.test(l);
}

function scoreHumanName(line='') {
  // puntuación heurística para línea que parece nombre de persona/empresa destinataria
  const l = line.trim();
  if (!l) return 0;
  if (isLikelyAddressOrCode(l)) return 0;

  let score = 0;
  const words = l.split(/\s+/);
  const alphaWords = words.filter(w => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(w));
  score += Math.min(3, alphaWords.length); // más palabras alfabéticas
  if (/^(destinatario|attn|para|sr\.?|sra\.?|cliente)\b/i.test(l)) score += 2;
  if (/^[A-ZÁÉÍÓÚÜÑ ]+$/.test(l)) score += 1; // todo mayúsculas
  if (/[.,]/.test(l)) score -= 0.5; // sospechoso de dirección
  if (/\b(S\.?L\.?|S\.?A\.?)\b/i.test(l)) score += 0.5; // empresas
  if (l.length > 3) score += Math.min(2, l.length / 20);
  return score;
}

function guessNameFromOCR(text='') {
  const lines = String(text).split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if (!lines.length) return '';
  // 1) prioriza línea tras clave
  for (let i=0;i<lines.length;i++){
    if (/^(destinatario|attn|para|cliente)\b[:\- ]?/i.test(lines[i])) {
      const next = lines[i+1]?.trim();
      if (next && !isLikelyAddressOrCode(next) && next.length >= 3) return next.toUpperCase();
    }
  }
  // 2) mayor score humano
  const best = lines
    .map(l => ({ l, s: scoreHumanName(l) }))
    .sort((a,b)=> b.s - a.s)[0];
  return (best?.s>0 ? best.l : '').toUpperCase();
}

/* ===== Componente ===== */
export default function ScanEtiquetaModal({ open, onClose, onResult, tenantCompanies=[] }) {
  const [empresa, setEmpresa] = useState('');
  const [nombre, setNombre]   = useState('');
  const [ocrReady, setOcrReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenRef = useRef(null); // para ROI+preproc
  const rafRef = useRef(null);
  const lastOcrTsRef = useRef(0);
  const stableRef = useRef({ nombre: '', empresa: '', nombreHits: 0, empresaHits: 0 });

  const matcher = useMemo(() => buildCompanyMatcher(tenantCompanies), [tenantCompanies]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try { await startCam(); await loadOCR(); loop(); } catch(e){ console.error(e); }
    })();
    return () => { stopLoop(); stopCam(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ====== OCR loader con rutas CDN fijas ====== */
  async function loadOCR() {
    try {
      if (window.__ET_OCRW) { setOcrReady(true); return; }
      const T = await import('tesseract.js');
      const { createWorker } = T;

      // Rutas (Tesseract v5)
      const CDN = 'https://unpkg.com/tesseract.js@v5.0.4/dist';
      const LANGS = 'https://tessdata.projectnaptha.com/4.0.0_fast';

      const worker = await createWorker({
        workerPath: `${CDN}/worker.min.js`,
        corePath  : `${CDN}/tesseract-core.wasm.js`,
        langPath  : `${LANGS}`,
        gzip      : true,
        logger    : null
      });

      await worker.loadLanguage('eng+spa');
      await worker.initialize('eng+spa');
      window.__ET_OCRW = worker;
      setOcrReady(true);
    } catch (e) {
      console.warn('OCR no disponible', e);
    }
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

  function getAimRoiRect(w, h) {
    // Debe coincidir con .aim { inset:12% 18% } → top/bottom 12%, left/right 18%
    const top = Math.round(h * 0.12);
    const bottom = Math.round(h * 0.12);
    const left = Math.round(w * 0.18);
    const right = Math.round(w * 0.18);
    return { x: left, y: top, w: w - left - right, h: h - top - bottom };
  }

  function preprocessToOffscreen(srcCanvas) {
    const { width: W, height: H } = srcCanvas;
    if (!W || !H) return null;
    const roi = getAimRoiRect(W, H);

    const scale = 1.6; // agrandar para OCR
    const ow = Math.max(1, Math.round(roi.w * scale));
    const oh = Math.max(1, Math.round(roi.h * scale));

    const off = offscreenRef.current || document.createElement('canvas');
    off.width = ow; off.height = oh;
    offscreenRef.current = off;

    const sctx = srcCanvas.getContext('2d');
    const octx = off.getContext('2d', { willReadFrequently:true });

    // 1) volcar ROI escalado
    octx.imageSmoothingEnabled = true;
    octx.drawImage(srcCanvas, roi.x, roi.y, roi.w, roi.h, 0, 0, ow, oh);

    // 2) grayscale + binarización simple (umbral)
    const img = octx.getImageData(0, 0, ow, oh);
    const d = img.data;
    let sum = 0;
    for (let i=0;i<d.length;i+=4){
      const g = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114);
      d[i]=d[i+1]=d[i+2]=g;
      sum += g;
    }
    const mean = sum / (d.length/4);
    const thr = Math.max(90, Math.min(180, mean + 5)); // umbral adaptativo simple
    for (let i=0;i<d.length;i+=4){
      const v = d[i] > thr ? 255 : 0;
      d[i]=d[i+1]=d[i+2]=v;
    }
    octx.putImageData(img, 0, 0);
    return off;
  }

  async function readAndDetect() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;

    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d', { willReadFrequently:true });
    ctx.drawImage(v, 0, 0, c.width, c.height);

    // ZXing (rápido). Si ve texto con pistas de transportista, lo usamos.
    try {
      const { BrowserMultiFormatReader, HTMLCanvasElementLuminanceSource, HybridBinarizer, BinaryBitmap } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const src = new HTMLCanvasElementLuminanceSource(c);
      const bin = new HybridBinarizer(src);
      const bmp = new BinaryBitmap(bin);
      const code = reader.decodeBitmap(bmp);
      const txt = code?.getText?.() || '';
      const hit = matcher(txt);
      if (hit) accumulateCompany(hit);
    } catch { /* no code -> seguimos */ }

    // OCR cada ~800 ms para no saturar móvil
    const now = performance.now();
    if (!ocrReady || now - lastOcrTsRef.current < 800) return;
    lastOcrTsRef.current = now;

    const pre = preprocessToOffscreen(c) || c;
    try {
      const worker = window.__ET_OCRW;
      const dataUrl = pre.toDataURL('image/png');
      const { data } = await worker.recognize(dataUrl);
      const text = data?.text || '';
      if (text) {
        const nom = guessNameFromOCR(text);
        if (nom && nom.length >= 3) accumulateName(nom);
        const hit = matcher(text);
        if (hit) accumulateCompany(hit);
      }
    } catch (e) {
      // frame con ruido; ignoramos
    }
  }

  function accumulateName(nom) {
    const S = stableRef.current;
    if (nom === S.nombre) {
      S.nombreHits++;
    } else {
      S.nombre = nom; S.nombreHits = 1;
    }
    // “Confirmar” cuando se repite 2 veces
    if (S.nombreHits >= 2) setNombre(S.nombre.toUpperCase());
  }
  function accumulateCompany(emp) {
    const S = stableRef.current;
    if (emp === S.empresa) {
      S.empresaHits++;
    } else {
      S.empresa = emp; S.empresaHits = 1;
    }
    if (S.empresaHits >= 2) setEmpresa(S.empresa);
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
            <small className="help">Apunta la cámara al texto dentro del recuadro; se refina cada ~1s. Edita si hace falta.</small>
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

      {/* canvas base y offscreen (preproc) */}
      <canvas ref={canvasRef} style={{ display:'none' }} />
      <canvas ref={offscreenRef} style={{ display:'none' }} />
    </div>
  );
}
