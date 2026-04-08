import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

const IconSuccess = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconError = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconWarn = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconInfo = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconClose = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const ensureRoot = () => {
  let el = document.getElementById("et-toasts");
  if (!el) {
    el = document.createElement("div");
    el.id = "et-toasts";
    el.className = "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-3 pointer-events-none";
    document.body.appendChild(el);
  }
  return el;
};

export default function Toast({ message = "", type = "info", onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  const config = {
    success: { icon: <IconSuccess />, bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", iconColor: "text-emerald-500" },
    error: { icon: <IconError />, bg: "bg-red-50", border: "border-red-200", text: "text-red-800", iconColor: "text-red-500" },
    warn: { icon: <IconWarn />, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", iconColor: "text-amber-500" },
    info: { icon: <IconInfo />, bg: "bg-zinc-900", border: "border-zinc-800", text: "text-white", iconColor: "text-zinc-400" }
  }[type] || { icon: <IconInfo />, bg: "bg-zinc-900", border: "border-zinc-800", text: "text-white", iconColor: "text-zinc-400" };

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-xl min-w-[300px] max-w-sm w-full ${config.bg} ${config.border}`}
      role="status"
      aria-live="polite"
    >
      <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>{config.icon}</div>
      <div className={`flex-1 text-sm font-bold leading-snug ${config.text}`}>{message}</div>
      <button
        type="button"
        onClick={() => onClose?.()}
        className={`shrink-0 p-1 rounded-lg transition-colors opacity-60 hover:opacity-100 ${config.text}`}
      >
        <IconClose />
      </button>
    </motion.div>,
    ensureRoot()
  );
}