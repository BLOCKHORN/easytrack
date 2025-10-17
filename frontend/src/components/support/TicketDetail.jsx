import { useEffect, useRef, useState } from "react";
import {
  getTicket,
  listMessages,
  postMessage,
  updateStatus,
  rateTicket,
  uploadFiles,
} from "../../services/ticketsService.js";
import StatusBadge from "./StatusBadge.jsx";
import TicketMessageInput from "./TicketMessageInput.jsx";
import "./TicketDetail.scss";

// 🔔 Aviso global
import { setNotice, clearNotice } from "../../utils/supportNotice";

export default function TicketDetail({ id, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);

  const scrollerRef = useRef(null);
  const lastMsgIdRef = useRef(null);

  function scrollToBottom() {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight + 240;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([getTicket(id), listMessages(id)]);
      setTicket(t);

      const items = m.items || [];
      setMsgs(items);

      // Detecta respuesta de soporte nueva (último mensaje no es del cliente)
      const last = items[items.length - 1];
      if (last && last.id !== lastMsgIdRef.current) {
        if (last.autor && last.autor !== "cliente") {
          setNotice(true); // 🔔 en layout
        }
        lastMsgIdRef.current = last.id;
      }

      queueMicrotask(scrollToBottom);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // Si quieres refresco: const int = setInterval(loadAll, 15000); return () => clearInterval(int);
  }, [id]);

  // Al hacer scroll al final, consideramos "visto" y limpiamos aviso
  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (nearBottom) clearNotice();
  }

  async function handleSend(payload) {
    setSending(true);
    try {
      const rawText =
        (payload?.text ??
          payload?.texto ??
          payload?.body ??
          payload?.mensaje ??
          payload?.descripcion ??
          "")?.trim();
      const rawFiles = payload?.files || payload?.adjuntos || [];

      let adjuntos = [];
      if (rawFiles.length > 0) {
        const up = await uploadFiles(rawFiles);
        adjuntos = up.files || [];
      }

      await postMessage(id, { texto: rawText, adjuntos });
      const m = await listMessages(id);
      setMsgs(m.items || []);
      clearNotice();              // Tú contestas → limpia aviso
      scrollToBottom();
    } finally {
      setSending(false);
    }
  }

  async function markClosed() {
    await updateStatus(id, "cerrado");
    const t = await getTicket(id);
    setTicket(t);
    setRatingOpen(true);
  }

  async function submitRating(value, comment) {
    await rateTicket(id, { value, comentario: comment });
    setRatingOpen(false);
  }

  if (loading) {
    return (
      <section className="ticket">
        <div className="ticket__topbar">
          <button className="btn" onClick={onBack}>Volver</button>
          <div className="grow" />
        </div>
        <div className="ticket__skeleton" />
      </section>
    );
  }

  if (!ticket) {
    return (
      <section className="ticket">
        <div className="ticket__topbar">
          <button className="btn" onClick={onBack}>Volver</button>
          <div className="grow" />
        </div>
        <p>No se encontró el ticket.</p>
      </section>
    );
  }

  return (
    <section className="ticket">
      <div className="ticket__topbar">
        <button className="btn" onClick={onBack}>Volver</button>

        <div className="ticket__meta">
          <span className="code">{ticket.codigo}</span>
          <span className="sep" />
          <span className="type">{labelTipo(ticket.tipo)}</span>
          <span className="sep" />
          <StatusBadge estado={ticket.estado} />
        </div>

        <div className="grow" />

        {ticket.estado !== "cerrado" && (
          <button className="btn btn--muted" onClick={markClosed}>
            Marcar como cerrado
          </button>
        )}
      </div>

      <div className="ticket__chat" ref={scrollerRef} onScroll={onScroll}>
        {msgs.map((m) => (
          <ChatMessage key={m.id} msg={m} />
        ))}
      </div>

      {ticket.estado !== "cerrado" ? (
        <TicketMessageInput disabled={sending} onSend={handleSend} />
      ) : (
        <div className="ticket__closed">
          <p>Ticket cerrado.</p>
          {!ticket.valoracion && (
            <RatingBox
              open={ratingOpen}
              onSubmit={submitRating}
              onClose={() => setRatingOpen(false)}
            />
          )}
        </div>
      )}
    </section>
  );
}

function ChatMessage({ msg }) {
  const isClient = msg.autor === "cliente";
  const authorLabel = isClient ? "Tú" : "Soporte EasyTrack"; // ✅ nombre fijo

  const txt =
    msg?.texto ??
    msg?.body ??
    msg?.text ??
    msg?.message ??
    msg?.contenido ??
    msg?.descripcion ??
    "";

  return (
    <article
      className={`chatmsg ${isClient ? "chatmsg--self" : ""}`}
      aria-label={isClient ? "Mensaje enviado" : "Mensaje de soporte"}
    >
      <header className="chatmsg__hdr">
        <span className="author">{authorLabel}</span>
        <time dateTime={msg.created_at}>{formatDate(msg.created_at)}</time>
      </header>

      {txt && <p className="chatmsg__txt">{txt}</p>}

      {msg.adjuntos?.length > 0 && (
        <div className="chatmsg__files">
          {msg.adjuntos.map((f, i) => (
            <a
              key={`${f.url || f.nombre || i}`}
              className="file"
              href={f.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="file__name">{f.nombre || "archivo"}</span>
              {typeof f.tamano === "number" && (
                <span className="file__meta">{prettyBytes(f.tamano)}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function RatingBox({ open, onSubmit, onClose }) {
  const [val, setVal] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  if (!open) return null;

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="rate">
      <h4>Valora la atención</h4>

      <div className="rate__stars" role="radiogroup" aria-label="Valoración">
        {stars.map((n) => {
          const active = (hover || val) >= n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={val === n}
              className={`star ${active ? "is-on" : ""}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setVal(n)}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path d="M12 2l3.09 6.27 6.91 1-5 4.86L18.18 22 12 18.6 5.82 22 7 14.13l-5-4.86 6.91-1L12 2z" />
              </svg>
            </button>
          );
        })}
        <span className="rate__value">{val}/5</span>
      </div>

      <textarea
        placeholder="Comentario (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <div className="rate__actions">
        <button className="btn" onClick={onClose}>Omitir</button>
        <button className="btn btn--primary" onClick={() => onSubmit(val, comment)}>
          Enviar valoración
        </button>
      </div>
    </div>
  );
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
function labelTipo(t) {
  if (t === "incidencia") return "Incidencia";
  if (t === "mejora") return "Mejora";
  if (t === "consultoria") return "Consultoría";
  return t;
}
function prettyBytes(n) {
  if (!n && n !== 0) return "";
  const units = ["B", "KB", "MB", "GB"]; let i=0; let v = n;
  while (v >= 1024 && i < units.length-1) { v/=1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}
