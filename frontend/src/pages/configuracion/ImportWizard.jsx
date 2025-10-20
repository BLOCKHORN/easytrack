// src/pages/config/ImportWizard.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { getTenantIdOrThrow } from '../../utils/tenant';
import { importPreview, importCommit } from '../../services/importacionService';
import { cargarCarriers } from '../../services/configuracionService';
import './ImportWizard.scss';

/* ---------- helpers ---------- */
const norm = (s='') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/* ---------- LinedTextarea (gutter + líneas) ---------- */
function LinedTextarea({ value, onChange, placeholder = '', rows = 8 }) {
  const taRef = useRef(null);
  const gutterRef = useRef(null);
  const lineCount = (value?.split(/\r?\n/).length || 1);
  const linesArr = Array.from({ length: Math.max(lineCount, rows) }, (_, i) => i + 1);
  function syncScroll() {
    if (!taRef.current || !gutterRef.current) return;
    gutterRef.current.scrollTop = taRef.current.scrollTop;
  }
  return (
    <div className="iw-lined">
      <div className="iw-lined__gutter" ref={gutterRef} aria-hidden>
        {linesArr.map(n => (
          <div key={n} className="iw-lined__num">{n}</div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={onChange}
        onScroll={syncScroll}
        rows={rows}
        placeholder={placeholder}
        className="iw-lined__textarea"
        spellCheck={false}
      />
    </div>
  );
}

/* ---------- Pills de confianza ---------- */
function ConfidencePill({ v = 0 }) {
  const n = Number.isFinite(v) ? v : 0;
  let tone = 'low';
  if (n >= 0.9) tone = 'high';
  else if (n >= 0.7) tone = 'mid';
  return <span className={`pill pill--${tone}`}>{n.toFixed(2)}</span>;
}

export default function ImportWizard({ onDone, onToast }) {
  const [step, setStep] = useState(1);
  const [tenantId, setTenantId] = useState(null);
  const [token, setToken] = useState('');

  const [content, setContent] = useState('');
  const [rows, setRows] = useState([]);
  const [autoConfirm, setAutoConfirm] = useState(0.9);
  const [loading, setLoading] = useState(false);

  const [carriers, setCarriers] = useState([]);
  const [unknownCompanies, setUnknownCompanies] = useState([]); // nombres únicos no configurados

  // Set tenant + token y carga carriers configurados
  useEffect(() => {
    (async () => {
      const tId = await getTenantIdOrThrow();
      const { data: { session } } = await supabase.auth.getSession();
      const tk = session?.access_token || '';
      setTenantId(tId);
      setToken(tk);

      try {
        const list = await cargarCarriers({ tenantId: tId });
        setCarriers(list || []);
      } catch (e) {
        console.error('[ImportWizard] cargarCarriers', e);
        onToast?.('No se pudo cargar la lista de empresas. Revisa Configuración.', 'error');
      }
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conjunto de nombres permitidos (normalizados)
  const allowedCompanies = useMemo(() => {
    const set = new Set();
    carriers?.forEach(c => { if (c?.nombre) set.add(norm(c.nombre)); });
    return set;
  }, [carriers]);

  const validText = useMemo(() => content.trim().length > 0, [content]);

  // Dado el preview, calcula empresas desconocidas y marca filas
  function evaluateUnknowns(previewRows = []) {
    const missing = new Set();
    previewRows.forEach(r => {
      const emp = norm(r?.detected_empresa || '');
      if (emp && !allowedCompanies.has(emp)) missing.add(r.detected_empresa);
    });
    setUnknownCompanies(Array.from(missing).filter(Boolean).sort());
  }

  async function handlePreview() {
    if (!validText || !tenantId || !token) return;
    setLoading(true);
    try {
      const resp = await importPreview({ token, tenantId, content, source: 'txt' });
      const arr = resp?.rows || [];
      setRows(arr);
      evaluateUnknowns(arr);
      setStep(2);
      const count = resp?.count ?? arr.length;
      onToast?.(`Detectadas ${count} filas.`, 'success');
    } catch (err) {
      console.error('[ImportWizard] preview error', err);
      onToast?.('No se pudo analizar el texto.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    // BLOQUEO UX: si hay empresas desconocidas, no dejamos continuar
    if (unknownCompanies.length > 0) {
      onToast?.(
        `Tienes empresas no configuradas: ${unknownCompanies.join(', ')}. Configúralas antes de importar.`,
        'error'
      );
      return;
    }
    if (!rows.length || !tenantId || !token) return;
    setLoading(true);
    try {
      const payload = rows.map((r, idx) => ({
        source: r.source,
        raw_text: r.raw_text,
        detected_nombre: r.detected_nombre,
        detected_empresa: r.detected_empresa,
        detected_ubicacion: r.detected_ubicacion,
        confidence: r.confidence,
        __line: r.__line ?? (idx + 1)
      }));
      const resp = await importCommit({
        token,
        tenantId,
        rows: payload,
        autoConfirmIfGte: Number(autoConfirm) || 0.9
      });
      onToast?.(
        `Staging: ${resp?.staged || 0}. Creados: ${resp?.created || 0}. Pendientes: ${resp?.pending || 0}.`,
        'success'
      );
      setStep(3);
    } catch (err) {
      console.error('[ImportWizard] commit error', err);
      // Si el trigger ha roto por empresa no configurada, enseñamos su mensaje
      onToast?.(err?.message || 'Error al crear paquetes.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Marca por fila si su empresa es desconocida
  const rowHasUnknown = (r) => {
    const emp = norm(r?.detected_empresa || '');
    return !!emp && !allowedCompanies.has(emp);
  };

  return (
    <div className="import-wizard">
      <div className="iw-head">
        <h3>Importación inicial (TXT/CSV)</h3>
        <div className="iw-steps">Paso {step} de 3</div>
      </div>

      {step === 1 && (
        <div className="iw-step">
          <p className="iw-muted">Pega aquí tu listado (una línea por paquete). Ejemplo:</p>
          <div className="iw-example">
            <code>Cliente 1 - gls - b2</code>
            <code>Cliente 2; seur; b1</code>
          </div>

          <LinedTextarea
            rows={10}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Pega tu TXT/CSV aquí…"
          />

          <div className="iw-bar">
            <label className="iw-threshold">
              Autoconfirmar si confianza ≥
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={autoConfirm}
                onChange={e => setAutoConfirm(e.target.value)}
              />
            </label>
            <div className="spacer" />
            <button
              onClick={handlePreview}
              disabled={!validText || loading}
              className="btn btn--primary"
            >
              {loading ? 'Analizando…' : 'Analizar'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="iw-step">
          {unknownCompanies.length > 0 && (
            <div className="iw-alert iw-alert--danger">
              <div className="iw-alert__title">Empresas no configuradas</div>
              <div className="iw-alert__body">
                Para importar estas líneas debes configurar primero estas empresas:
                <b> {unknownCompanies.join(', ')} </b>.
                Ve a <span className="iw-link">Configuración &gt; Empresas</span> y añádelas.
              </div>
            </div>
          )}

          <p className="iw-muted">
            Revisa las filas detectadas. Las que superen el umbral se crearán directamente.
          </p>

          <div className="iw-table-wrap">
            <table className="iw-table">
              <thead>
                <tr>
                  <th className="col-idx">#</th>
                  <th>Nombre</th>
                  <th>Empresa</th>
                  <th>Ubicación</th>
                  <th className="col-conf">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const idx = (r.__line ?? (i + 1));
                  const isUnknown = rowHasUnknown(r);
                  return (
                    <tr key={r.idTemp ?? `${idx}-${r.detected_nombre || ''}`} className={isUnknown ? 'row-unknown' : ''}>
                      <td className="col-idx">{idx}</td>
                      <td className={r.detected_nombre ? '' : 'is-missing'}>
                        {r.detected_nombre || <i className="muted">—</i>}
                      </td>
                      <td className={r.detected_empresa ? '' : 'is-missing'}>
                        <div className="iw-company-cell">
                          {r.detected_empresa || <i className="muted">—</i>}
                          {isUnknown && <span className="tag tag--danger">No configurada</span>}
                        </div>
                      </td>
                      <td className={r.detected_ubicacion ? '' : 'is-missing'}>
                        {r.detected_ubicacion || <i className="muted">—</i>}
                      </td>
                      <td className="col-conf"><ConfidencePill v={Number(r.confidence ?? 0)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Cards mobile */}
            <div className="iw-cards">
              {rows.map((r, i) => {
                const idx = (r.__line ?? (i + 1));
                const isUnknown = rowHasUnknown(r);
                return (
                  <div className={`iw-card ${isUnknown ? 'row-unknown' : ''}`} key={r.idTemp ?? `m-${idx}`}>
                    <div className="iw-card__top">
                      <span className="badge">#{idx}</span>
                      <ConfidencePill v={Number(r.confidence ?? 0)} />
                    </div>
                    <div className="iw-card__row">
                      <span className="k">Nombre</span>
                      <span className={`v ${r.detected_nombre ? '' : 'is-missing'}`}>{r.detected_nombre || '—'}</span>
                    </div>
                    <div className="iw-card__row">
                      <span className="k">Empresa</span>
                      <span className={`v ${r.detected_empresa ? '' : 'is-missing'}`}>
                        {r.detected_empresa || '—'} {isUnknown && <span className="tag tag--danger m-left">No configurada</span>}
                      </span>
                    </div>
                    <div className="iw-card__row">
                      <span className="k">Ubicación</span>
                      <span className={`v ${r.detected_ubicacion ? '' : 'is-missing'}`}>{r.detected_ubicacion || '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="iw-actions">
            <button onClick={() => setStep(1)} className="btn btn--ghost">Volver</button>
            <div className="spacer" />
            <button
              onClick={handleCommit}
              disabled={!rows.length || loading || unknownCompanies.length > 0}
              className="btn btn--accent"
              title={unknownCompanies.length ? 'Hay empresas no configuradas' : undefined}
            >
              {loading ? 'Creando…' : 'Crear paquetes'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="iw-done">
          <h4>¡Listo!</h4>
          <p className="iw-muted">Se ha realizado la importación. Puedes seguir importando o cerrar.</p>
          <div className="iw-actions iw-actions--center">
            <button
              onClick={() => { setContent(''); setRows([]); setStep(1); setUnknownCompanies([]); }}
              className="btn"
            >
              Nueva importación
            </button>
            <button onClick={() => onDone?.()} className="btn btn--ghost">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
