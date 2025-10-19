// src/components/ScanEtiquetaModal.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/ScanEtiquetaModal.scss';

/* ========= Helpers generales ========= */
const norm = (s='') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function buildCompanyMatcher(tenantCompanies = []) {
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
    for (const [k, val] of map.entries()) if (k && T.includes(k)) return val;
    return '';
  };
}

function tryParseKV(raw='') {
  // JSON, "clave: valor", "key=value"
  const t = raw.trim();
  try {
    const obj = JSON.parse(t);
    if (obj && typeof obj === 'object') return obj;
  } catch {}
  const out = {};
  const lines = t.split(/[\r\n;]+/).map(s=>s.trim()).filter(Boolean);
  for (const ln of lines) {
    const m = ln.match(/^\s*([A-Za-z_][\w \-\.]*)\s*[:=]\s*(.+?)\s*$/);
    if (m) out[m[1].toLowerCase().trim()] = m[2].trim();
  }
  return out;
}

function isLikelyAddressOrCode(l='') {
  return /\b(c\/|calle|avda|avenida|plaza|piso|puerta|cp|c\.p\.|nº|num\.?|cod.*postal|espa[ñn]a|spain|provincia|localidad|via|street|st\.?)\b/i.test(l)
    || /(\b\d{5}\b|\bES\d{3,}\b|[A-Z]{2}\d{6,})/.test(l)
    || /^[\W_]+$/.test(l);
}
function scoreHumanName(line='') {
  const l = line.trim();
  if (!l || isLikelyAddressOrCode(l)) return 0;
  let score = 0;
  const words = l.split(/\s+/);
  const alphaWords = words.filter(w => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(w));
  score += Math.min(3, alphaWords.length);
  if (/^(destinatario|attn|para|cliente|sr\.?|sra\.?)\b[:\- ]?/i.test(l)) score += 2;
  if (/^[A-ZÁÉÍÓÚÜÑ ]+$/.test(l)) score += 1;
  if (/[.,]/.test(l)) score -= 0.5;
  if (/\b(S\.?L\.?|S\.?A\.?)\b/i.test(l)) score += 0.5;
  if (l.length > 3) score += Math.min(2, l.length / 20);
  return score;
}
function extractFieldsFromText(text, matchCompany) {
  // 1) K/V
  const kv = tryParseKV(text);
  let nombre = '';
  let empresa = '';

  for (const k of ['nombre','cliente','destinatario','name','receiver','to','attn']) {
    if (kv[k]) { nombre = String(kv[k]).toUpperCase(); break; }
  }
  for (const k of ['empresa','carrier','company','courier','transportista']) {
    if (kv[k]) { empresa = String(kv[k]); break; }
  }

  // 2) Heurísticas por líneas
  if (!empresa) empresa = matchCompany(text) || '';
  if (!nombre) {
    const lines = String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const best = lines.map(l => ({ l, s: scoreHumanName(l) })).sort((a,b)=> b.s - a.s)[0];
    if (best?.s>0) nombre = best.l.toUpperCase();
  }

  // 3) Separadores comunes
  if ((!nombre || !empresa) && (/\|/.test(text) || /,/.test(text))) {
    const parts = text.split(/[|,]+/).map(s=>s.trim()).filter(Boolean);
    if (!empresa) {
      for (const p of parts) {
        const hit = matchCompany(p);
        if (hit) { empresa = hit; break; }
      }
    }
    if (!nombre) {
      const best = parts.map(l => ({ l, s: scoreHumanName(l) })).sort((a,b)=> b.s - a.s)[0];
      if (best?.s>0) nombre = best.l.toUpperCase();
    }
  }

  return { nombre: (nombre||'').toUpperCase(), empresa };
}

/* ========= Carga dinámica de librerías (CDN) ========= */
// Tesseract v2.1.5 (estable, se auto-gestiona) + OpenCV 4.x
const TESS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/2.1.5/tesseract.min.js';
const OPENCV_URL = 'https://docs.opencv.org/4.x/opencv.js'; // sirve wasm internamente

function loadScriptOnce(src, attrKey) {
  return new Promise((resolve, reject) => {
    if (window.__loadedScripts?.[attrKey]) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true; s.defer = true;
    s.onload = () => { window.__loadedScripts = window.__loadedScripts || {}; window.__loadedScripts[attrKey] = true; resolve(); };
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureTesseract() {
  if (window.Tesseract && window.Tesseract.recognize) return;
  await loadScriptOnce(TESS_URL, 'tesseract215');
}
async function ensureOpenCV() {
  if (window.cv && window.cv.Mat) return;
  await loadScriptOnce(OPENCV_URL, 'opencv4x');
  // OpenCV necesita un “ready” explícito
  await new Promise((res, rej) => {
    const to = setTimeout(()=>rej(new Error('Timeout cargando OpenCV')), 15000);
    const check = () => {
      if (window.cv && window.cv.Mat) { clearTimeout(to); res(); }
      else setTimeout(check, 120);
    };
    check();
  });
}

/* ========= Preprocesado con OpenCV ========= */
function cropAimROI(srcCanvas) {
  const W = srcCanvas.width, H = srcCanvas.height;
  const top = Math.round(H * 0.12);
  const bottom = Math.round(H * 0.12);
  const left = Math.round(W * 0.18);
  const right = Math.round(W * 0.18);
  const x = left, y = top, w = W - left - right, h = H - top - bottom;

  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  off.getContext('2d').drawImage(srcCanvas, x, y, w, h, 0, 0, w, h);
  return off;
}
function preprocessWithOpenCV(srcCanvas) {
  const cv = window.cv;
  const src = cv.imread(srcCanvas);
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  // Bilateral para preservar bordes del boli
  let smooth = new cv.Mat();
  cv.bilateralFilter(gray, smooth, 9, 40, 40);

  // Adaptive threshold (mejor para iluminación desigual)
  let bin = new cv.Mat();
  cv.adaptiveThreshold(
    smooth, bin, 255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY, 35, 15
  );

  // Apertura ligera para quitar puntitos
  const M = cv.Mat.ones(2, 2, cv.CV_8U);
  let opened = new cv.Mat();
  cv.morphologyEx(bin, opened, cv.MORPH_OPEN, M);

  // Escalamos ×2 para que Tesseract tenga resolución
  const out = new cv.Mat();
  cv.resize(opened, out, new cv.Size(0,0), 2, 2, cv.INTER_CUBIC);

  // Pasamos a canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = out.cols; dstCanvas.height = out.rows;
  cv.imshow(dstCanvas, out);

  // Limpieza
  src.delete(); gray.delete(); smooth.delete(); bin.delete(); opened.delete(); M.delete(); out.delete();

  return dstCanvas;
}

/* ========= Componente ========= */
export default function ScanEtiquetaModal({ open, onClose, onResult, tenantCompanies=[] }) {
  const [empresa, setEmpresa] = useState('');
  const [nombre, setNombre]   = useState('');

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | ready | capturing | processing | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [rawPreview, setRawPreview] = useState('');

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const matchCompany = useMemo(() => buildCompanyMatcher(tenantCompanies), [tenantCompanies]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setErrorMsg('');
      setStatus('idle');
      try {
        // 1) Cargar libs de CDN (free)
        await ensureTesseract();
        await ensureOpenCV();

        // 2) Cámara
        await startCamera();
        setStatus('ready');
      } catch (e) {
        console.error('[Scan] init error', e);
        setStatus('error');
        setErrorMsg(e?.message || 'No se pudo iniciar');
      }
    })();

    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height:{ ideal: 720 }
      },
      audio: false
    });
    streamRef.current = stream;
    const v = videoRef.current;
    if (v) { v.srcObject = stream; await v.play(); }
  }
  function stopCamera() {
    try { streamRef.current?.getTracks()?.forEach(t=>t.stop()); } catch {}
    streamRef.current = null;
    const v = videoRef.current;
    if (v) v.srcObject = null;
  }

  async function doCaptureAndOCR() {
    if (!videoRef.current) return;
    setBusy(true);
    setStatus('processing');

    // 1) Captura frame → canvas base
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d', { willReadFrequently:true });
    ctx.drawImage(v, 0, 0, c.width, c.height);

    // 2) ROI + OpenCV preproc (binarización adaptativa + limpieza + upscale)
    const roi = cropAimROI(c);
    const pre = preprocessWithOpenCV(roi);

    try {
      // 3) Tesseract v2 (CDN), idiomas FAST spa+eng (CDN público)
      const { data } = await window.Tesseract.recognize(
        pre, 'spa+eng',
        {
          // langPath default usará CDN; no necesitas hostear ficheros
          tessedit_pageseg_mode: 6,
          preserve_interword_spaces: '1',
          // logger: m => console.log(m)
        }
      );
      const text = (data?.text || '').trim();
      setRawPreview(text || '—');

      // 4) Extraer campos
      const { nombre: n, empresa: e } = extractFieldsFromText(text || '', matchCompany);
      if (n) setNombre(n.toUpperCase());
      if (e) setEmpresa(e);

      setStatus((n || e) ? 'done' : 'ready');
    } catch (e) {
      console.warn('[OCR] fallo', e);
      setStatus('error');
      setErrorMsg(e?.message || 'OCR falló');
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    stopCamera();
    onClose?.();
  }
  function handleConfirm() {
    const payload = { nombre: (nombre||'').toUpperCase(), empresa: empresa || '' };
    onResult?.(payload);
    handleClose();
  }

  if (!open) return null;

  return (
    <div className="scan-modal" role="dialog" aria-modal="true">
      <div className="scan-card">
        <header className="scan-header">
          <h3>Escanear etiqueta (OCR mejorado)</h3>
          <button className="btn btn--ghost" onClick={handleClose} aria-label="Cerrar">✕</button>
        </header>

        <div className="scan-body">
          <div className="cam">
            <video ref={videoRef} playsInline muted />
            <div className="aim" />
            <div className="scan-status">
              {status==='idle' && 'Cargando…'}
              {status==='ready' && 'Listo para capturar'}
              {status==='processing' && 'Procesando OCR…'}
              {status==='done' && 'Texto detectado ✔️'}
              {status==='error' && 'Error'}
            </div>
          </div>

          <div className="fields">
            {status==='error' && !!errorMsg && (
              <div className="errorbox">{errorMsg}</div>
            )}

            <label className="lbl">Empresa detectada</label>
            <input className="input" value={empresa} onChange={e=>setEmpresa(e.target.value)} placeholder="—" />

            <label className="lbl">Nombre cliente</label>
            <input className="input" value={nombre} onChange={e=>setNombre(e.target.value.toUpperCase())} placeholder="—" />

            <div className="rawbox">
              <div className="rawbox-title">Texto detectado (preview)</div>
              <pre className="raw">{rawPreview || '—'}</pre>
            </div>

            <div className="actions-inline">
              <button className="btn" type="button" disabled={busy || status==='idle'} onClick={doCaptureAndOCR}>
                {busy ? 'Procesando…' : '📸 Capturar y reconocer'}
              </button>
              <small className="help">
                Alinea el texto dentro del recuadro. Este modo usa OpenCV para mejorar el contraste y Tesseract (spa+eng) por CDN.
              </small>
            </div>
          </div>
        </div>

        <footer className="scan-foot">
          <button className="btn btn--ghost" onClick={handleClose}>Cancelar</button>
          <div style={{ flex:1 }} />
          <button className="btn btn--primary" onClick={handleConfirm}>
            Usar estos datos
          </button>
        </footer>
      </div>

      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  );
}
