import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  adminGetTicket, adminListMessages, adminPostMessage,
  adminUpdateStatus, uploadFiles
} from '../../../services/adminSupportService.js';

import MessageInput from './MessageInput.jsx';
import MiniStatusBadge from './MiniStatusBadge.jsx';

const LAST_SEEN_KEY = 'sa_support_last_seen';

export default function AdminTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [estado, setEstado] = useState('');
  const scrollerRef = useRef(null);

  function scrollToBottom() {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight + 160;
  }

  async function load() {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([adminGetTicket(id), adminListMessages(id)]);
      setTicket(t);
      setEstado(t.estado);
      setMsgs(m.items || []);
      queueMicrotask(scrollToBottom);
    } finally {
      setLoading(false);
    }
  }

  // Cargar ticket + marcar “visto” nada más entrar
  useEffect(() => {
    // marcamos la visita a soporte
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSend({ text, files }) {
    setSending(true);
    try {
      let adjuntos = [];
      if (files?.length) {
        const up = await uploadFiles(files);
        adjuntos = up.files || [];
      }
      await adminPostMessage(id, { texto: (text || '').trim(), adjuntos });

      // Si quieres dejar el ticket en "esperando_cliente" tras responder, descomenta:
      // await adminUpdateStatus(id, 'esperando_cliente');
      // setEstado('esperando_cliente');

      const m = await adminListMessages(id);
      setMsgs(m.items || []);
      scrollToBottom();
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(e) {
    const value = e.target.value;
    setEstado(value);
    await adminUpdateStatus(id, value);
  }

  if (loading) {
    return (
      <section className="admin-ticket">
        <div className="topbar">
          <button className="btn" onClick={() => navigate('/superadmin/support')}>Volver</button>
        </div>
        <div className="skeleton" />
      </section>
    );
  }

  if (!ticket) {
    return (
      <section className="admin-ticket">
        <div className="topbar">
          <button className="btn" onClick={() => navigate('/superadmin/support')}>Volver</button>
        </div>
        <p>No se encontró el ticket.</p>
      </section>
    );
  }

  const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);

  return (
    <section className="admin-ticket">
      <div className="topbar">
        <button className="btn" onClick={() => navigate('/superadmin/support')}>Volver</button>
        <div className="meta">
          <span className="mono">{ticket.codigo}</span>
          <span className="sep" />
          <span>{ticket.tenant_nombre || ticket.tenant_id}</span>
          <span className="sep" />
          <MiniStatusBadge estado={ticket.estado} />
          <span className="sep" />
          <select value={estado} onChange={changeStatus}>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="esperando_cliente">Esperando cliente</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>
        <div className="grow" />
      </div>

      <div className="chat" ref={scrollerRef}>
        {msgs.map((m) => <Msg key={m.id} m={m} lastSeen={lastSeen} />)}
      </div>

      {ticket.estado !== 'cerrado' && (
        <MessageInput disabled={sending} onSend={handleSend} />
      )}
    </section>
  );
}

function Msg({ m, lastSeen }) {
  const isAgent = m.autor === 'tecnico' || m.author_role === 'admin' || m.es_agente === true;
  const who = isAgent ? 'Soporte EasyTrack' : (m.autor_nombre || m.author_name || 'Cliente');

  const txt =
    m?.texto ?? m?.body ?? m?.text ?? m?.message ?? m?.contenido ?? m?.descripcion ?? '';

  const ts = m.created_at ? new Date(m.created_at).getTime() : 0;
  // Consideramos “nuevo” si es posterior al lastSeen y NO lo escribió un agente
  const isNew = ts > lastSeen && !isAgent;

  return (
    <article className={`a-msg ${isAgent ? 'a-msg--agent' : ''} ${isNew ? 'is-new' : ''}`}>
      <header className="a-msg__hdr">
        <span className="who">{who}</span>
        <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString()}</time>
      </header>
      {txt && <p className="a-msg__txt">{txt}</p>}

      {Array.isArray(m.adjuntos) && m.adjuntos.length > 0 && (
        <div className="a-msg__files">
          {m.adjuntos.map((f, i) => (
            <a key={i} className="file" href={f.url} target="_blank" rel="noreferrer">
              <span className="file__name">{f.nombre || 'archivo'}</span>
              {typeof f.tamano === 'number' && (
                <span className="file__meta">{(f.tamano / 1024).toFixed(1)} KB</span>
              )}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
