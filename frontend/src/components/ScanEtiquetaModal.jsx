// src/components/ScanEtiquetaModal.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import '../styles/ScanEtiquetaModal.scss';

/* ================== Helpers de parsing ================== */
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
  // Acepta JSON, pares "clave: valor", y "key=value"
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

function extractFieldsFromPayload(text, matchCompany) {
  // 1) K/V directo
  const kv = tryParseKV(text);
  let nombre = '';
  let empresa = '';

  const keysNombre = ['nombre','cliente','destinatario','name','receiver','to','attn'];
  for (const k of keysNombre) {
    if (kv[k]) { nombre = String(kv[k]).toUpperCase(); break; }
  }
  const keysEmpresa = ['empresa','carrier','company','courier','transportista'];
  for (const k of keysEmpresa) {
    if (kv[k]) { empresa = String(kv[k]); break; }
  }

  // 2) Heurísticas por líneas
  if (!nombre || !empresa) {
    const lines = String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if (!empresa) empresa = matchCompany(text) || '';
    if (!nombre) {
      const best = lines.map(l => ({ l, s: scoreHumanName(l) })).sort((a,b)=> b.s - a.s)[0];
      if (best?.s>0) nombre = best.l.toUpperCase();
    }
  }

  // 3) Extra por separadores (pipes, comas)
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

/* ================== Componente ================== */
export default function ScanEtiquetaModal({ open, onClose, onResult, tenantCompanies=[] }) {
  const [empresa, setEmpresa] = useState('');
  const [nombre, setNombre]   = useState('');

  const [status, setStatus] = useState('idle'); // idle|scanning|found|no-text|error
  const [errorMsg, setErrorMsg] = useState('');
  const [rawPreview, setRawPreview] = useState('');

  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const stopFnRef = useRef(null);
  const lastTextRef = useRef('');

  const matchCompany = useMemo(() => buildCompanyMatcher(tenantCompanies), [tenantCompanies]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setErrorMsg('');
      setStatus('idle');
      try {
        await startScan();
      } catch (e) {
        console.error('[ZXing] start error', e);
        setStatus('error');
        setErrorMsg(e?.message || 'No se pudo iniciar la cámara');
      }
    })();
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startScan() {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.PDF_417,
      BarcodeFormat.EAN_8,
      BarcodeFormat.ITF
    ]);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    // Elegimos la cámara trasera si está disponible
    const devices = await BrowserMultiFormatReader.listVideoInputDevices();
    let deviceId = undefined;
    if (devices && devices.length) {
      const back = devices.find((d) => /back|trase|rear|environment/i.test((d.label || '')));
      deviceId = (back || devices[0]).deviceId;
    }

    setStatus('scanning');

    // decodeFromVideoDevice gestiona stream & callbacks
    const cleanup = await reader.decodeFromVideoDevice(
      deviceId || null,
      videoRef.current,
      (result, err) => {
        if (result) {
          const text = result.getText ? result.getText() : String(result.text || '');
          if (!text || text === lastTextRef.current) return;
          lastTextRef.current = text;
          handleDecodedText(text);
        } else if (err) {
          // errores de “no encontrado” son normales durante el escaneo continuo
        }
      }
    );

    // Guardamos la función de parada
    stopFnRef.current = () => {
      try { cleanup?.stop(); } catch {}
      try { reader?.reset(); } catch {}
    };
  }

  function stopScan() {
    try { stopFnRef.current?.(); } catch {}
    stopFnRef.current = null;
    try { readerRef.current?.reset(); } catch {}
    readerRef.current = null;
  }

  function handleDecodedText(text) {
    setRawPreview(text);
    const { nombre: n, empresa: e } = extractFieldsFromPayload(text, matchCompany);

    if (n) setNombre(n.toUpperCase());
    if (e) setEmpresa(e);

    setStatus((n || e) ? 'found' : 'no-text');
  }

  function handleClose() {
    stopScan();
    onClose?.();
  }

  function handleConfirm() {
    const payload = { nombre: (nombre||'').toUpperCase(), empresa: empresa || '' };
    onResult?.(payload);
    handleClose();
  }

  return !open ? null : (
    <div className="scan-modal" role="dialog" aria-modal="true">
      <div className="scan-card">
        <header className="scan-header">
          <h3>Escanear etiqueta (QR / DataMatrix / Cód. barras)</h3>
          <button className="btn btn--ghost" onClick={handleClose} aria-label="Cerrar">✕</button>
        </header>

        <div className="scan-body">
          <div className="cam">
            <video ref={videoRef} playsInline muted />
            <div className="aim" />
            <div className="scan-status">
              {status==='scanning' && 'Escaneando…'}
              {status==='found' && 'Código leído ✔️'}
              {status==='no-text' && 'Código leído pero sin datos útiles'}
              {status==='idle' && 'Listo'}
              {status==='error' && 'Error de cámara'}
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
              <div className="rawbox-title">Contenido decodificado</div>
              <pre className="raw">{rawPreview || '—'}</pre>
            </div>

            <div className="actions-inline">
              <small className="help">
                Apunta al QR/DataMatrix o al código de barras de la etiqueta. Si el contenido incluye nombre y empresa,
                se rellenarán automáticamente. Puedes editar manualmente si hace falta.
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
    </div>
  );
}
