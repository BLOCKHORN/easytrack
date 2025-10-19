// src/components/ScanEtiquetaModal.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/ScanEtiquetaModal.scss';

/* =========================================
   Helpers de normalización y heurísticas
========================================= */
const norm = (s='') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function buildCompanyMatcher(tenantCompanies = []) {
  // Variantes comunes; puedes extender si lo necesitáis
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
    map.set(k.replace(/\s+/g,''), o); // versión sin espacios
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

function guessNameFromOCR(text='') {
  const lines = String(text).split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if (!lines.length) return '';
  for (let i=0;i<lines.length;i++){
    if (/^(destinatario|attn|para|cliente)\b[:\- ]?/i.test(lines[i])) {
      const next = lines[i+1]?.trim();
      if (next && !isLikelyAddressOrCode(next) && next.length >= 3) return next.toUpperCase();
    }
  }
  const best = lines.map(l => ({ l, s: scoreHumanName(l) })).sort((a,b)=> b.s - a.s)[0];
  return (best?.s>0 ? best.l : '').toUpperCase();
}

/* =========================================
   Preprocesado (ROI + filtro + Otsu + morfología)
========================================= */
function getAimRoiRect(w, h) {
  // Debe coincidir con el borde visual (.aim { inset:12% 18% })
  const top = Math.round(h * 0.12);
  const bottom = Math.round(h * 0.12);
  const left = Math.round(w * 0.18);
  const right = Math.round(w * 0.18);
  return { x: left, y: top, w: w - left - right, h: h - top - bottom };
}

function otsuThreshold(gray) {
  const hist = new Array(256).fill(0);
  for (let i=0;i<gray.length;i+=4) hist[gray[i]]++;
  const total = gray.length/4;
  let sum=0; for (let t=0;t<256;t++) sum += t * hist[t];
  let sumB=0, wB=0, wF=0, varMax=0, threshold=127;
  for (let t=0;t<256;t++){
    wB += hist[t]; if (wB===0) continue;
    wF = total - wB; if (wF===0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > varMax) { varMax = between; threshold = t; }
  }
  return threshold;
}

function preprocessToOffscreen(srcCanvas, { strong=false } = {}) {
  const { width: W, height: H } = srcCanvas;
  if (!W || !H) return null;
  const roi = getAimRoiRect(W, H);
  const scale = strong ? 2.2 : 1.8; // zoom un poco mayor en “strong”
  const ow = Math.max(1, Math.round(roi.w * scale));
  const oh = Math.max(1, Math.round(roi.h * scale));

  const off = document.createElement('canvas');
  off.width = ow; off.height = oh;

  const sctx = srcCanvas.getContext('2d');
  const octx = off.getContext('2d', { willReadFrequently:true });
  octx.imageSmoothingEnabled = true;
  octx.drawImage(srcCanvas, roi.x, roi.y, roi.w, roi.h, 0, 0, ow, oh);

  let img = octx.getImageData(0,0,ow,oh);
  const d = img.data;
  const idx = (x,y)=> (y*ow + x)*4;

  // 1) Filtro mediana 3x3
  const copy = new Uint8ClampedArray(d);
  for (let y=1;y<oh-1;y++){
    for (let x=1;x<ow-1;x++){
      const arr=[];
      for (let j=-1;j<=1;j++){
        for (let i=-1;i<=1;i++){
          const k = idx(x+i,y+j);
          const g = copy[k]*0.299 + copy[k+1]*0.587 + copy[k+2]*0.114;
          arr.push(g);
        }
      }
      arr.sort((a,b)=>a-b);
      const m = arr[4];
      const k2 = idx(x,y);
      d[k2]=d[k2+1]=d[k2+2]=m;
    }
  }

  // 2) Otsu
  const thr = otsuThreshold(d);
  for (let i=0;i<d.length;i+=4){
    const v = d[i] > thr ? 255 : 0;
    d[i]=d[i+1]=d[i+2]=v;
  }

  // 3) Morfología suave (dilatación 1 iter) para boli fino
  const src = new Uint8ClampedArray(d);
  for (let y=1;y<oh-1;y++){
    for (let x=1;x<ow-1;x++){
      let maxN=0;
      for (let j=-1;j<=1;j++){
        for (let i=-1;i<=1;i++){
          const k = idx(x+i,y+j);
          maxN = Math.max(maxN, src[k]);
        }
      }
      const k2 = idx(x,y);
      d[k2]=d[k2+1]=d[k2+2]=maxN;
    }
  }

  octx.putImageData(img,0,0);
  return off;
}

/* =========================================
   Componente principal
========================================= */
export default function ScanEtiquetaModal({ open, onClose, onResult, tenantCompanies=[] }) {
  const [empresa, setEmpresa] = useState('');
  const [nombre, setNombre]   = useState('');

  const [ocrReady, setOcrReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('idle'); // idle|scanning|no-text|found
  const [rawPreview, setRawPreview] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
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

  /* ---------- OCR con rutas CDN y secuencia “ortodoxa” ---------- */
  async function loadOCR() {
    try {
      if (window.__ET_OCRW) { setOcrReady(true); return; }

      const T = await import('tesseract.js');
      const { createWorker } = T;

      const CDN = 'https://unpkg.com/tesseract.js@5.0.4/dist';
      const LANGS = 'https://tessdata.projectnaptha.com/4.0.0_fast';

      const worker = await createWorker({
        workerPath: `${CDN}/worker.min.js`,
        corePath  : `${CDN}/tesseract-core.wasm.js`,
        langPath  : LANGS,
        logger    : null,
      });

      await worker.load();
      await worker.loadLanguage('spa+eng');
      await worker.initialize('spa+eng');

      // Parámetros seguros; si fallan, seguimos
      try {
        await worker.setParameters({
          preserve_interword_spaces: '1',
          tessedit_pageseg_mode: '6',
        });
      } catch {}

      window.__ET_OCRW = worker;
      setOcrReady(true);
    } catch (e) {
      console.warn('OCR no disponible', e);
    }
  }

  /* ---------- Cámara ---------- */
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

  /* ---------- Bucle “live” con ritmo suave ---------- */
  function stopLoop(){ if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current=null; }
  function loop(){
    stopLoop();
    const tick = async () => { await readAndDetectLive(); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function readAndDetectLive() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;

    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d', { willReadFrequently:true });
    ctx.drawImage(v, 0, 0, c.width, c.height);

    // OCR cada ~900 ms
    const now = performance.now();
    if (!ocrReady || now - lastOcrTsRef.current < 900) return;
    lastOcrTsRef.current = now;

    setStatus('scanning');
    await doOCR(c, { updateStatus: true });
  }

  /* ---------- Ráfaga “Capturar” (3 tomas) ---------- */
  async function doBurstCapture() {
    if (!ocrReady) return;
    setBusy(true);
    setStatus('scanning');

    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || !v.videoWidth) { setBusy(false); return; }
    c.width = v.videoWidth; c.height = v.videoHeight;

    const ctx = c.getContext('2d', { willReadFrequently:true });
    const results = [];

    for (let i=0;i<3;i++){
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const res = await doOCR(c, { strong: i!==0, updateStatus:false }); // dos variantes de preproc
      if (res) results.push(res);
      await new Promise(r=>setTimeout(r, 120));
    }

    // voto mayoritario
    const vote = (arr) => {
      const cnt = new Map();
      for (const s of arr) if (s) cnt.set(s, (cnt.get(s)||0)+1);
      let best=''; let bestN=0;
      for (const [k,v] of cnt.entries()){ if (v>bestN){ best=k; bestN=v; } }
      return best;
    };
    const names = results.map(r => r.nombre).filter(Boolean);
    const comps = results.map(r => r.empresa).filter(Boolean);

    const n = vote(names) || nombre;
    const e = vote(comps) || empresa;
    if (n) setNombre(n.toUpperCase());
    if (e) setEmpresa(e);

    setStatus(n || e ? 'found' : 'no-text');
    setBusy(false);
  }

  /* ---------- OCR core (usa ImageData → evita k.map crash) ---------- */
  async function doOCR(srcCanvas, { strong=false, updateStatus=false } = {}) {
    try {
      const pre = preprocessToOffscreen(srcCanvas, { strong }) || srcCanvas;
      const worker = window.__ET_OCRW;

      const pctx = pre.getContext('2d', { willReadFrequently:true });
      const idata = pctx.getImageData(0, 0, pre.width, pre.height);

      const { data } = await worker.recognize(idata);
      const text = (data?.text || '').trim();
      if (text) setRawPreview(text);

      let found = false;
      if (text) {
        const nom = guessNameFromOCR(text);
        const hitC = matcher(text);
        if (nom && nom.length >= 3) { accumulateName(nom); found = true; }
        if (hitC) { accumulateCompany(hitC); found = true; }
      }
      if (updateStatus) setStatus(found ? 'found' : 'no-text');

      return {
        nombre: guessNameFromOCR(text || ''),
        empresa: matcher(text || '')
      };
    } catch {
      if (updateStatus) setStatus('no-text');
      return null;
    }
  }

  /* ---------- Acumuladores (estabilidad temporal) ---------- */
  function accumulateName(nom) {
    const S = stableRef.current;
    if (nom === S.nombre) S.nombreHits++; else { S.nombre = nom; S.nombreHits = 1; }
    if (S.nombreHits >= 2) setNombre(S.nombre.toUpperCase());
  }
  function accumulateCompany(emp) {
    const S = stableRef.current;
    if (emp === S.empresa) S.empresaHits++; else { S.empresa = emp; S.empresaHits = 1; }
    if (S.empresaHits >= 2) setEmpresa(S.empresa);
  }

  /* ---------- Cierre y confirmación ---------- */
  function handleClose(){ stopLoop(); stopCam(); onClose?.(); }
  function handleConfirm(){
    // ✅ permite confirmar aunque no se haya detectado nada (el padre decide)
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
            <div className="scan-status">
              {status==='scanning' && 'Buscando texto…'}
              {status==='found' && 'Detectado ✔️'}
              {status==='no-text' && 'No se encontró texto'}
              {status==='idle' && (ocrReady ? 'Listo' : 'Cargando OCR…')}
            </div>
          </div>

          <div className="fields">
            <label className="lbl">Empresa detectada</label>
            <input className="input" value={empresa} onChange={e=>setEmpresa(e.target.value)} placeholder="—" />

            <label className="lbl">Nombre cliente</label>
            <input className="input" value={nombre} onChange={e=>setNombre(e.target.value.toUpperCase())} placeholder="—" />

            <div className="rawbox">
              <div className="rawbox-title">Texto detectado (preview)</div>
              <pre className="raw">{rawPreview || '—'}</pre>
            </div>

            <div className="actions-inline">
              <button className="btn" type="button" onClick={doBurstCapture} disabled={!ocrReady || busy}>
                {busy ? 'Procesando…' : '📸 Capturar (ráfaga)'}
              </button>
              <small className="help">Coloca el texto dentro del recuadro. Capturar hace 3 tomas y combina resultados.</small>
            </div>
          </div>
        </div>

        <footer className="scan-foot">
          <button className="btn btn--ghost" onClick={handleClose}>Cancelar</button>
          <div style={{ flex:1 }} />
          <button className="btn btn--primary" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Confirmando…' : 'Usar estos datos'}
          </button>
        </footer>
      </div>

      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  );
}
