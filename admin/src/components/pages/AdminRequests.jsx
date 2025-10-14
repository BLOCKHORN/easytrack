// src/pages/AdminRequests.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import {
  listDemoRequests,
  getDemoRequest,
  acceptDemoRequest,
  declineDemoRequest,
  getDemoCounters
} from '../../services/adminService';
import '../../styles/adminrequests.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');

/* ============ UI: Chip ============ */
function Chip({ state }) {
  const cls =
    state === 'accepted' ? 'chip chip--ok'
    : state === 'pending'  ? 'chip chip--warn'
    :                        'chip chip--muted';
  return <span className={cls}>{state}</span>;
}

/* ============ UI: Toasts ============ */
function Toast({ toast, onClose }) {
  // auto-close
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.duration ?? 2800);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.type || 'info'}`} role="status" aria-live="polite">
      <div className="toast__content">
        {toast.title ? <strong className="toast__title">{toast.title}</strong> : null}
        <div className="toast__msg">{toast.message}</div>
      </div>
      <button className="toast__close" onClick={onClose} aria-label="Cerrar notificación">×</button>
    </div>
  );
}

/* ============ UI: Modal genérico ============ */
function Modal({ open, title, children, onClose, actions, variant = 'default', initialFocusRef }) {
  const dialogRef = useRef(null);
  // focus on open
  useEffect(() => {
    if (!open) return;
    const el = initialFocusRef?.current || dialogRef.current?.querySelector('[data-autofocus]');
    el?.focus();
  }, [open, initialFocusRef]);

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`modal ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <button className="modal__backdrop" onClick={onClose} aria-label="Cerrar" />
      <div className={`modal__panel modal__panel--${variant}`} ref={dialogRef}>
        <div className="modal__head">
          <h4 id="modalTitle" className="modal__title">{title}</h4>
          <button className="modal__x" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal__body">{children}</div>
        {Array.isArray(actions) && actions.length > 0 && (
          <div className="modal__foot">
            {actions.map((a, i) => (
              <button
                key={i}
                className={`btn ${a.variant ? `btn--${a.variant}` : ''}`}
                onClick={a.onClick}
                disabled={a.disabled}
                ref={i === 0 ? initialFocusRef : undefined}
                data-autofocus={i === 0 ? true : undefined}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ helper: fetch con Authorization ============ */
async function authed(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

const STATUS_SEGMENTS = [
  { value: '', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'declined', label: 'Declinadas' },
];

export default function AdminRequests() {
  // filtros / paginación
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // data
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // detalle
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  // geo/extra
  const [geo, setGeo] = useState(null);
  const [geoErr, setGeoErr] = useState('');
  const [popMeta, setPopMeta] = useState(null);

  // counters
  const [pendingUnseen, setPendingUnseen] = useState(0);

  // UI: modales y toasts
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const confirmBtnRef = useRef(null);

  const [toast, setToast] = useState(null);
  const showToast = (t) => setToast(t);
  const closeToast = () => setToast(null);

  const totalPages = useMemo(() => Math.ceil((count || 0) / pageSize), [count]);
  const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
  const nf  = (n) => Intl.NumberFormat('es-ES').format(n);

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [q, status, page]);

  async function refresh() {
    setLoading(true);
    try {
      const [{ data, count }, counters] = await Promise.all([
        listDemoRequests({ q, status, page, pageSize }),
        getDemoCounters().catch(() => ({ pending_unseen: 0 }))
      ]);

      setRows(data || []);
      setCount(count || 0);
      setPendingUnseen(Number(counters?.pending_unseen || 0));

      let nextSel = null;
      if ((data?.length ?? 0) > 0) {
        nextSel = selected ? data.find(d => d.id === selected.id) || data[0] : data[0];
      }
      setSelected(nextSel);
      if (nextSel) onSelect(nextSel, true);
      else { setDetail(null); setGeo(null); setPopMeta(null); }
    } finally { setLoading(false); }
  }

  async function onSelect(item, silent = false) {
    setSelected(item);
    const { request } = await getDemoRequest(item.id);
    const d = request || item || null;
    setDetail(d);
    if (!silent) window.scrollTo({ top: 0, behavior: 'smooth' });
    await enrichGeo(d);
  }

  function fullAddress(d) {
    if (!d) return '';
    return [
      d.address,
      [d.postal_code, d.city].filter(Boolean).join(' '),
      [d.province, d.country_name || d.country_code].filter(Boolean).join(', ')
    ].filter(Boolean).join(', ');
  }

  function mapLinks(d, g) {
    const addr = fullAddress(d) || [d?.city, d?.postal_code].filter(Boolean).join(' ');
    const google = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    const osm = g?.lat && g?.lon
      ? `https://www.openstreetmap.org/?mlat=${g.lat}&mlon=${g.lon}#map=16/${g.lat}/${g.lon}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(addr)}`;
    return { google, osm };
  }

  /* --------- ACEPTAR ---------- */
  async function onAccept() {
    if (!selected) return;
    setBusy(true);
    try {
      const frontend_url = (import.meta.env.VITE_FRONTEND_URL || window.location.origin).replace(/\/$/, '');
      const res = await acceptDemoRequest(selected.id, {
        token_ttl: '7 days',
        frontend_url,
      });

      if (res.method === 'invite') {
        showToast({ type: 'success', title: 'Invitación enviada', message: 'La invitación de Supabase se ha enviado correctamente.' });
      } else if (res.method === 'magiclink' && res.action_link) {
        try { await navigator.clipboard.writeText(res.action_link); } catch {}
        showToast({ type: 'info', title: 'Magic Link generado', message: 'Enlace copiado al portapapeles.' });
      } else {
        showToast({ type: 'success', title: 'Solicitud aceptada', message: 'Se ha procesado correctamente.' });
      }

      await refresh();
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', title: 'Error al aceptar', message: e.message || 'No se pudo aceptar la solicitud.' });
    } finally {
      setBusy(false);
    }
  }

  /* --------- DECLINAR (modal) ---------- */
  function openDeclineModal() {
    setDeclineReason('');
    setShowDecline(true);
  }

  async function confirmDecline() {
    if (!selected) return;
    setBusy(true);
    try {
      await declineDemoRequest(selected.id, { reason: declineReason || '', purge: false });
      setShowDecline(false);
      showToast({ type:'success', title:'Solicitud declinada', message:'Se ha notificado el estado.' });
      await refresh();
    } catch (e) {
      console.error(e);
      showToast({ type:'error', title:'Error al declinar', message:'No se pudo declinar la solicitud.' });
    } finally { setBusy(false); }
  }

  /* --------- REENVIAR EMAIL ---------- */
  async function onResendEmail() {
    if (!selected) return;
    setBusy(true);
    try {
      const redirectTo = (import.meta.env.VITE_FRONTEND_URL || window.location.origin).replace(/\/$/,'');
      const res = await authed(`/admin/demo-requests/${selected.id}/resend`, {
        method:'POST',
        body: JSON.stringify({ redirectTo }),
      });
      if (res.method === 'invite') {
        showToast({ type:'success', title:'Reenviado', message:'Invitación de Supabase reenviada.' });
      } else if (res.method === 'magiclink') {
        showToast({ type:'success', title:'Reenviado', message:'Magic link reenviado correctamente.' });
      } else {
        showToast({ type:'info', title:'Reenvío completado', message:'Se ha reenviado el email.' });
      }
    } catch (e) {
      console.error(e);
      showToast({ type:'error', title:'Error al reenviar', message: e.message || 'No se pudo reenviar el email.' });
    } finally { setBusy(false); }
  }

  /* --------- ELIMINAR (modal) ---------- */
  function openDeleteModal() { setShowDelete(true); }

  async function confirmDelete() {
    if (!selected) return;
    setBusy(true);
    try {
      await deleteDemoRequest(selected.id);
      setShowDelete(false);
      showToast({ type:'success', title:'Eliminada', message:'La solicitud se ha eliminado correctamente.' });
      await refresh();
    } catch (e) {
      showToast({ type:'error', title:'Error al eliminar', message: e.message || 'No se pudo eliminar la solicitud.' });
    } finally {
      setBusy(false);
    }
  }

  /* --------- Población / Geo ---------- */
  async function populationFromPostcodeES(cp) {
    if (!cp) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=es&postalcode=${encodeURIComponent(cp)}&limit=1&addressdetails=1&extratags=1`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    const arr = await r.json();
    const x = Array.isArray(arr) && arr[0];
    const pop = Number(x?.extratags?.population || x?.population || 0) || null;
    return pop ? { value: pop, source: 'CP (OSM)' } : null;
  }

  async function populationFromWikipedia(place) {
    if (!place) return null;
    const url1 = `https://es.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&origin=*&titles=${encodeURIComponent(place)}`;
    const r1 = await fetch(url1);
    const j1 = await r1.json();
    const pages = j1?.query?.pages || {};
    const first = pages[Object.keys(pages)[0]];
    const qid = first?.pageprops?.wikibase_item;
    if (!qid) return null;

    const url2 = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
    const r2 = await fetch(url2, { headers: { Accept: 'application/json' } });
    const j2 = await r2.json();
    const claims = j2?.entities?.[qid]?.claims?.P1082 || [];
    if (!Array.isArray(claims) || !claims.length) return null;

    const withTime = claims.map(c => {
      const amount = Number(c?.mainsnak?.datavalue?.value?.amount || 0);
      const q = c?.qualifiers?.P585?.[0]?.datavalue?.value?.time || null;
      const t = q ? Date.parse(q.replace('+', '')) : 0;
      return { amount, t };
    }).filter(x => x.amount > 0);

    if (!withTime.length) return null;
    withTime.sort((a,b) => b.t - a.t);
    return { value: withTime[0].amount, source: 'Municipio (Wikidata)' };
  }

  async function enrichGeo(d) {
    setGeo(null); setGeoErr(''); setPopMeta(null);
    if (!d) return;

    const query = [d.address, d.postal_code, d.city, d.province, d.country_name || d.country_code]
      .filter(Boolean).join(', ');
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&extratags=1&q=${encodeURIComponent(query)}`;
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      const arr = await r.json();
      const x = Array.isArray(arr) && arr[0];
      if (!x) throw new Error('NO_GEO');
      const bb = x.boundingbox?.map(Number);
      const bbox = bb?.length === 4 ? { south: bb[0], north: bb[1], west: bb[2], east: bb[3] } : null;
      const population = Number(x?.extratags?.population || x?.population || 0) || null;
      setGeo({ lat: Number(x.lat), lon: Number(x.lon), bbox, display_name: x.display_name, population });

      if (population) setPopMeta({ value: population, source: 'OSM' });
      else {
        if (d.country_code === 'ES' && d.postal_code) {
          const byCP = await populationFromPostcodeES(d.postal_code);
          if (byCP) { setPopMeta(byCP); return; }
        }
        const byCity = await populationFromWikipedia(d.city || d.province || '');
        if (byCity) setPopMeta(byCity);
      }
    } catch {
      setGeoErr('No se pudo estimar la ubicación.');
    }
  }

  const links = detail ? mapLinks(detail, geo) : { google: '#', osm: '#' };
  const bbox = (() => {
    if (!geo?.lat || !geo?.lon) return null;
    const pad = 0.01;
    const west  = geo?.bbox?.west  ?? (geo.lon - pad);
    const east  = geo?.bbox?.east  ?? (geo.lon + pad);
    const south = geo?.bbox?.south ?? (geo.lat - pad);
    const north = geo?.bbox?.north ?? (geo.lat + pad);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${west},${south},${east},${north}&layer=mapnik&marker=${geo.lat},${geo.lon}`;
  })();

  return (
    <section className="ar card">
      {/* Toasts */}
      <Toast toast={toast} onClose={closeToast} />

      <div className="ar__header">
        <h3 className="ar__title">
          Solicitudes de DEMO
          {pendingUnseen > 0 && (
            <span className="chip chip--warn ml8" title="Pendientes sin revisar">
              {nf(pendingUnseen)}
            </span>
          )}
        </h3>

        {/* Segment filter */}
        <div className="ar__segments" role="tablist" aria-label="Filtrar por estado">
          {STATUS_SEGMENTS.map(s => (
            <button
              key={s.value || 'all'}
              role="tab"
              aria-selected={status === s.value}
              className={`seg ${status === s.value ? 'is-active' : ''}`}
              onClick={() => { setPage(1); setStatus(s.value); }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ar__tools">
          <input
            className="ar__search"
            placeholder="Buscar por email, empresa o ciudad…"
            value={q}
            onChange={e => { setPage(1); setQ(e.target.value); }}
          />
          <select
            className="ar__select"
            value={status}
            onChange={e => { setPage(1); setStatus(e.target.value); }}
            aria-label="Filtrar por estado"
          >
            <option value="">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="accepted">Aceptadas</option>
            <option value="declined">Declinadas</option>
          </select>
        </div>
      </div>

      <div className="ar__content">
        {/* LISTA */}
        <div className="ar__list">
          <div className="ar__table">
            <div className="thead">
              <div>Fecha</div>
              <div>Empresa</div>
              <div>Email</div>
              <div>Ciudad</div>
              <div className="ta-r">Estado</div>
            </div>
            <div className="tbody">
              {loading ? (
                <div className="muted p16">Cargando…</div>
              ) : rows.length === 0 ? (
                <div className="muted p16">Sin solicitudes.</div>
              ) : rows.map(r => (
                <button
                  type="button"
                  key={r.id}
                  className={`tr ${selected?.id === r.id ? 'is-active' : ''}`}
                  onClick={() => onSelect(r)}
                  title="Ver detalle"
                >
                  <div className="c">{fmt(r.created_at)}</div>
                  <div className="c ell">{r.company_name || '—'}</div>
                  <div className="c ell mono">{r.email}</div>
                  <div className="c ell">{r.city || '—'}</div>
                  <div className="c ta-r"><Chip state={r.status} /></div>
                </button>
              ))}
            </div>
          </div>

          <div className="ar__pager">
            <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <span>Página {page} de {totalPages || 1}</span>
            <button className="btn btn--ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        </div>

        {/* DETALLE */}
        <aside className="ar__detail">
          {!detail ? (
            <div className="ar__placeholder">Selecciona una solicitud para ver el detalle.</div>
          ) : (
            <>
              <div className="box head">
                <div className="col">
                  <div className="company">{detail.company_name}</div>
                  <div className="muted mono">{detail.email}</div>
                  <div className="muted small">Recibida: {fmt(detail.created_at)}</div>
                </div>
                <div className="col actions">
                  <Chip state={detail.status} />
                  <div className="btns">
                    {detail.status === 'pending' && (
                      <>
                        <button className="btn btn--success" disabled={busy} onClick={onAccept}>Aceptar</button>
                        <button className="btn btn--warning" disabled={busy} onClick={openDeclineModal}>Declinar</button>
                      </>
                    )}
                    {detail.status === 'accepted' && (
                      <button className="btn btn--info" disabled={busy} onClick={onResendEmail}>Reenviar email</button>
                    )}
                    <button className="btn btn--danger" disabled={busy} onClick={openDeleteModal}>Eliminar</button>
                  </div>
                </div>
              </div>

              <div className="box">
                <div className="kv">
                  <div><span>Nombre</span><strong>{detail.full_name}</strong></div>
                  <div><span>Teléfono</span><strong>{detail.phone ? <a href={`tel:${detail.phone}`}>{detail.phone}</a> : '—'}</strong></div>
                  <div><span>País</span><strong>{detail.country_name || detail.country_code || '—'}</strong></div>
                  <div><span>Provincia</span><strong>{detail.province || '—'}</strong></div>
                  <div><span>Ciudad</span><strong>{detail.city || '—'}</strong></div>
                  <div><span>CP</span><strong className="mono">{detail.postal_code || '—'}</strong></div>
                  <div><span>CIF</span><strong className="mono">{detail.cif || '—'}</strong></div>
                  <div><span>Volumen mensual</span><strong>{detail.declared_monthly_volume_band || '—'}</strong></div>
                </div>
              </div>

              <div className="box">
                <div className="addr-title">Dirección</div>
                <div className="addr">{fullAddress(detail) || '—'}</div>
                <div className="addr-links">
                  <a className="btn btn--ghost" href={links.google} target="_blank" rel="noreferrer">Google Maps</a>
                  <a className="btn btn--ghost" href={links.osm}    target="_blank" rel="noreferrer">OpenStreetMap</a>
                </div>
              </div>

              <div className="box">
                <div className="box-head">
                  <div className="title">Ubicación aproximada</div>
                  {popMeta?.value ? (
                    <span className="chip chip--info">
                      Población aprox.: {nf(popMeta.value)} <span className="source">· {popMeta.source}</span>
                    </span>
                  ) : null}
                </div>
                {bbox ? (
                  <iframe title="mapa" src={bbox} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                ) : (
                  <div className="muted small">{geoErr || 'No hay mapa disponible.'}</div>
                )}
                {geo?.display_name ? <div className="muted tiny">{geo.display_name}</div> : null}
              </div>

              {detail.review_notes ? (
                <div className="box">
                  <div className="title">Notas de revisión</div>
                  <p className="muted">{detail.review_notes}</p>
                </div>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {/* MODAL: Declinar */}
      <Modal
        open={showDecline}
        title="Declinar solicitud"
        onClose={() => setShowDecline(false)}
        actions={[
          { label: 'Cancelar', onClick: () => setShowDecline(false), variant: 'ghost' },
          { label: busy ? 'Declinando…' : 'Declinar', onClick: confirmDecline, variant: 'warning', disabled: busy },
        ]}
        variant="warning"
        initialFocusRef={confirmBtnRef}
      >
        <p className="muted">Opcionalmente, puedes indicar el motivo para informar al solicitante.</p>
        <textarea
          className="input input--area"
          rows={4}
          placeholder="Motivo de declinación (opcional)…"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
        />
      </Modal>

      {/* MODAL: Eliminar */}
      <Modal
        open={showDelete}
        title="Eliminar solicitud"
        onClose={() => setShowDelete(false)}
        actions={[
          { label: 'Cancelar', onClick: () => setShowDelete(false), variant: 'ghost' },
          { label: busy ? 'Eliminando…' : 'Eliminar', onClick: confirmDelete, variant: 'danger', disabled: busy },
        ]}
        variant="danger"
        initialFocusRef={confirmBtnRef}
      >
        <div className="confirm">
          <p>
            Vas a <strong>eliminar definitivamente</strong> esta solicitud.
            Esta acción no se puede deshacer.
          </p>
          {detail ? (
            <ul className="confirm__ul">
              <li><strong>Empresa:</strong> {detail.company_name || '—'}</li>
              <li><strong>Email:</strong> {detail.email}</li>
              <li><strong>Estado:</strong> {detail.status}</li>
              <li><strong>Recibida:</strong> {fmt(detail.created_at)}</li>
            </ul>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
