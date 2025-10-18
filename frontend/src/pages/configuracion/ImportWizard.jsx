// src/pages/config/ImportWizard.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { getTenantIdOrThrow } from '../../utils/tenant';
import { importPreview, importCommit } from '../../services/importacionService';
import './ImportWizard.scss';

export default function ImportWizard({ onDone, onToast }) {
  const [step, setStep] = useState(1);
  const [tenantId, setTenantId] = useState(null);
  const [token, setToken] = useState('');
  const [content, setContent] = useState('');
  const [rows, setRows] = useState([]);
  const [autoConfirm, setAutoConfirm] = useState(0.9);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const tId = await getTenantIdOrThrow();
      const { data: { session } } = await supabase.auth.getSession();
      setTenantId(tId);
      setToken(session?.access_token || '');
    })().catch(() => {});
  }, []);

  const valid = useMemo(() => content.trim().length > 0, [content]);

  async function handlePreview() {
    if (!valid || !tenantId || !token) return;
    setLoading(true);
    try {
      const resp = await importPreview({ token, tenantId, content, source: 'txt' });
      setRows(resp?.rows || []);
      setStep(2);
      onToast?.(`Detectadas ${resp?.count ?? (resp?.rows?.length || 0)} filas.`, 'success');
    } catch (err) {
      console.error('[ImportWizard] preview error', err);
      onToast?.('No se pudo analizar el texto.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!rows.length || !tenantId || !token) return;
    setLoading(true);
    try {
      const payload = rows.map(r => ({
        source: r.source,
        raw_text: r.raw_text,
        detected_nombre: r.detected_nombre,
        detected_empresa: r.detected_empresa,
        detected_ubicacion: r.detected_ubicacion,
        confidence: r.confidence
      }));
      const resp = await importCommit({ token, tenantId, rows: payload, autoConfirmIfGte: Number(autoConfirm) || 0.9 });
      onToast?.(`Staging: ${resp?.staged || 0}. Creados: ${resp?.created || 0}. Pendientes: ${resp?.pending || 0}.`, 'success');
      setStep(3);
    } catch (err) {
      console.error('[ImportWizard] commit error', err);
      onToast?.('Error al crear paquetes.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="import-wizard" style={{ background:'#111318', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h3 style={{ margin:0, fontSize:18, fontWeight:600 }}>Importación inicial (TXT/CSV)</h3>
        <small style={{ opacity:.8 }}>Paso {step} de 3</small>
      </div>

      {step === 1 && (
        <div>
          <p style={{ marginTop:0, color:'#cbd5e1' }}>
            Pega aquí tu listado (una fila por paquete). Ejemplo:
            <br />
            <code style={{ opacity:.9 }}>
              pepito - gls - b2
              <br />
              mariana; seur; b1
            </code>
          </p>
          <textarea
            rows={8}
            placeholder="Pega tu TXT/CSV aquí…"
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ width:'100%', resize:'vertical', padding:12, borderRadius:10, border:'1px solid rgba(255,255,255,.12)', background:'#0c0d10', color:'#e5e7eb' }}
          />
          <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:12 }}>
            <label style={{ fontSize:12, opacity:.85 }}>
              Autoconfirmar si confianza ≥
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={autoConfirm}
                onChange={e => setAutoConfirm(e.target.value)}
                style={{ width:80, marginLeft:8, background:'#0c0d10', color:'#e5e7eb', border:'1px solid rgba(255,255,255,.12)', borderRadius:8, padding:'6px 8px' }}
              />
            </label>
            <div style={{ flex:1 }} />
            <button
              onClick={handlePreview}
              disabled={!valid || loading}
              className="btn"
              style={{ padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,.14)', background:'#14161b', color:'#e5e7eb' }}
            >
              {loading ? 'Analizando…' : 'Analizar'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ marginTop:0, color:'#cbd5e1' }}>
            Revisa las filas detectadas. Se mostrará una confianza (0–1). Las filas con confianza ≥ umbral se crearán directamente.
          </p>
          <div style={{ maxHeight:260, overflow:'auto', border:'1px solid rgba(255,255,255,.08)', borderRadius:10 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
              <thead>
                <tr style={{ background:'#0f1116' }}>
                  <th style={th}>Nombre</th>
                  <th style={th}>Empresa</th>
                  <th style={th}>Ubicación</th>
                  <th style={th}>Conf.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.idTemp}>
                    <td style={td}>{r.detected_nombre || <i style={{ opacity:.6 }}>—</i>}</td>
                    <td style={td}>{r.detected_empresa || <i style={{ opacity:.6 }}>—</i>}</td>
                    <td style={td}>{r.detected_ubicacion || <i style={{ opacity:.6 }}>—</i>}</td>
                    <td style={td}>{(r.confidence ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display:'flex', gap:12, marginTop:12 }}>
            <button
              onClick={() => setStep(1)}
              className="btn"
              style={{ padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,.14)', background:'transparent', color:'#e5e7eb' }}
            >
              Volver
            </button>
            <div style={{ flex:1 }} />
            <button
              onClick={handleCommit}
              disabled={!rows.length || loading}
              className="btn"
              style={{ padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,.14)', background:'#34d399', color:'#0b110e', fontWeight:600 }}
            >
              {loading ? 'Creando…' : 'Crear paquetes'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ textAlign:'center', padding:'20px 4px' }}>
          <h4 style={{ margin:0, marginBottom:6 }}>¡Listo!</h4>
          <p style={{ color:'#cbd5e1' }}>Se ha realizado la importación. Puedes seguir importando o cerrar.</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <button
              onClick={() => { setContent(''); setRows([]); setStep(1); }}
              className="btn"
              style={{ padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,.14)', background:'#14161b', color:'#e5e7eb' }}
            >
              Nueva importación
            </button>
            <button
              onClick={() => onDone?.()}
              className="btn"
              style={{ padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,.14)', background:'transparent', color:'#e5e7eb' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { textAlign:'left', padding:'10px', borderBottom:'1px solid rgba(255,255,255,.08)', position:'sticky', top:0 };
const td = { padding:'10px', borderBottom:'1px solid rgba(255,255,255,.06)' };
