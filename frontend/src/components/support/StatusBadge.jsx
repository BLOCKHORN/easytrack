export default function StatusBadge({ estado }) {
  const cls = estado === "pendiente" ? "s s--pending"
    : estado === "en_proceso" ? "s s--progress"
    : estado === "esperando_cliente" ? "s s--waiting"
    : estado === "cerrado" ? "s s--done"
    : "s";
  const label = estado === "pendiente" ? "Pendiente"
    : estado === "en_proceso" ? "En proceso"
    : estado === "esperando_cliente" ? "Esperando cliente"
    : estado === "cerrado" ? "Cerrado"
    : estado;
  return <span className={cls}>{label}</span>;
}
