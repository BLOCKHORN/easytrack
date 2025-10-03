// Compact Toast (bottom-right, no fullscreen overlay)
// Sustituye tu componente actual por este.
// Uso: <Toast message="..." type="success|error|info|warn" onClose={()=>...} />

import { useEffect } from "react";
import { createPortal } from "react-dom";
import "../styles/Toast.scss";

const ensureRoot = () => {
  let el = document.getElementById("et-toasts");
  if (!el) {
    el = document.createElement("div");
    el.id = "et-toasts";
    document.body.appendChild(el);
  }
  return el;
};

export default function Toast({ message = "", type = "info", onClose, duration = 2800 }) {
  const show = !!message;

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [show, duration, onClose]);

  if (!show) return null;

  const root = ensureRoot();

  const tClass =
    type === "success" ? "et-toast--success" :
    type === "error"   ? "et-toast--error"   :
    type === "warn"    ? "et-toast--warn"    :
                         "et-toast--info";

  return createPortal(
    <div className="et-toast-stack" role="region" aria-label="Notificaciones">
      <div className={`et-toast ${tClass}`} role="status" aria-live="polite">
        <div className="et-toast__msg">{message}</div>
        <button
          type="button"
          className="et-toast__close"
          aria-label="Cerrar notificación"
          onClick={() => onClose?.()}
        >
          ×
        </button>
      </div>
    </div>,
    root
  );
}
