import { useEffect, useState } from "react";
import { listTickets } from "../../services/ticketsService.js";
import StatusBadge from "./StatusBadge.jsx";
import EmptyState from "./EmptyState.jsx";

const STATE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En proceso" },
  { value: "esperando_cliente", label: "Esperando cliente" },
  { value: "cerrado", label: "Cerrado" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Cualquiera" },
  { value: "incidencia", label: "Incidencia" },
  { value: "mejora", label: "Mejora" },
  { value: "consultoria", label: "Consultoría" },
];

// Marca como "nuevo" si el estado indica que espera al cliente
// o si el backend expone ultimo_autor != "cliente". Ajusta si tus nombres cambian.
function isNewForClient(t) {
  const estado = String(t?.estado || "").toLowerCase();
  const estadoNuevo = ["esperando_cliente", "pendiente_cliente", "soporte_respondio"].includes(estado);
  const ultimoAutorNoCliente = t?.ultimo_autor && t.ultimo_autor !== "cliente";
  return Boolean(estadoNuevo || ultimoAutorNoCliente);
}

export default function TicketsList({ filters, setFilters, onOpen }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    try {
      const res = await listTickets({
        page,
        pageSize,
        estado: filters.estado || undefined,
        tipo: filters.tipo || undefined,
        q: filters.q || undefined,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setPage(1); }, [filters.estado, filters.tipo, filters.q]);
  useEffect(() => { load(); }, [page, filters]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="tickets">
      <div className="tickets__filters">
        <div className="field">
          <label>Estado</label>
          <select
            value={filters.estado}
            onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
          >
            {STATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Tipo</label>
          <select
            value={filters.tipo}
            onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value }))}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="field field--grow">
          <label>Buscar</label>
          <input
            type="search"
            placeholder="Busca por código o descripción"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>
      </div>

      {loading ? (
        <div className="tickets__skeleton" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="row skel" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Sin tickets todavía"
          body="Cuando abras un ticket aparecerá aquí."
          actionLabel="Nuevo ticket"
          onAction={() => document.querySelector(".btn.btn--primary")?.click()}
        />
      ) : (
        <div className="tickets__table" role="table" aria-label="Listado de tickets">
          <div className="tickets__thead" role="row">
            <div role="columnheader">Código</div>
            <div role="columnheader">Tipo</div>
            <div role="columnheader">Asunto</div>
            <div role="columnheader">Estado</div>
            <div role="columnheader" className="t-right">Creado</div>
          </div>
          <div className="tickets__tbody">
            {items.map((t) => {
              const nuevo = isNewForClient(t);
              return (
                <button
                  key={t.id}
                  className={`tickets__row ${nuevo ? "tickets__row--new" : ""}`}
                  role="row"
                  onClick={() => onOpen(t.id)}
                  aria-label={`Abrir ticket ${t.codigo}${nuevo ? ", tiene respuesta nueva" : ""}`}
                >
                  <div role="cell" className="code">
                    {nuevo && <span className="dot" aria-hidden="true" />}
                    {t.codigo}
                  </div>
                  <div role="cell" className="type">{labelTipo(t.tipo)}</div>
                  <div role="cell" className="subject">
                    {t.asunto || t.descripcion?.slice(0, 80) || "(sin asunto)"}
                    {nuevo && <span className="badge-new">NUEVO</span>}
                  </div>
                  <div role="cell"><StatusBadge estado={t.estado} /></div>
                  <div role="cell" className="t-right">{formatDate(t.created_at)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {pages > 1 && (
        <div className="tickets__pager">
          <button disabled={page<=1} onClick={() => setPage((p) => p-1)}>Anterior</button>
          <span>Página {page} de {pages}</span>
          <button disabled={page>=pages} onClick={() => setPage((p) => p+1)}>Siguiente</button>
        </div>
      )}
    </section>
  );
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
function labelTipo(t) {
  if (t === "incidencia") return "Incidencia";
  if (t === "mejora") return "Mejora";
  if (t === "consultoria") return "Consultoría";
  return t || "—";
}
