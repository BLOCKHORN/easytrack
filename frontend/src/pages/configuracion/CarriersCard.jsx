import { useMemo } from "react";
import {
  MdLocalShipping,
  MdAddCircle,
  MdDelete,
} from "react-icons/md";
import "./CarriersCard.scss";

export default function CarriersCard({
  empresas = [],
  empresasDisponibles = [],
  INGRESOS = [],
  añadirEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
}) {
  // evitar duplicados en el selector
  const usados = useMemo(
    () => new Set(empresas.map((e) => e?.nombre).filter(Boolean)),
    [empresas]
  );

  return (
    <section className="card carriers-card" aria-labelledby="carriers-title">
      {/* Header */}
      <header className="card__header carriers-card__header">
        <div className="hdr-left">
          <div className="hdr-icon" aria-hidden="true">
            <MdLocalShipping />
          </div>
          <div className="hdr-txt">
            <h3 id="carriers-title" className="hdr-title">Empresas de transporte</h3>
            <p className="hdr-subtitle">
              Define con qué compañías trabajas y el ingreso por entrega para tu negocio.
            </p>
          </div>
        </div>

        {empresas.length > 0 && (
          <div className="hdr-actions">
            <button className="btn btn--primary" onClick={añadirEmpresa}>
              <MdAddCircle /> Añadir empresa
            </button>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="carriers-card__body">
        {empresas.length === 0 && <EmptyState onAdd={añadirEmpresa} />}

        {empresas.map((e, i) => {
          const color = e?.color || "#2563eb";
          const initials = getInitials(e?.nombre);

          return (
            <article
              key={i}
              className="cc-row"
              style={{ ["--accent"]: color }}
            >
              {/* Badge alineado con controles */}
              <div className="cc-badge" aria-hidden="true">
                <span className="cc-badge__dot" />
                <span className="cc-badge__letters">{initials || "—"}</span>
              </div>

              {/* Empresa */}
              <label className="cc-field cc-field--empresa cc-field--grow">
                <span className="cc-label">Empresa</span>
                <select
                  value={e.nombre || ""}
                  onChange={(ev) => actualizarEmpresa(i, "nombre", ev.target.value)}
                  aria-label="Seleccionar empresa de transporte"
                >
                  <option value="">Seleccionar…</option>
                  {empresasDisponibles.map((emp) => {
                    const disabled = usados.has(emp.nombre) && emp.nombre !== e.nombre;
                    return (
                      <option
                        key={emp.id ?? emp.nombre}
                        value={emp.nombre}
                        disabled={disabled}
                      >
                        {emp.nombre}
                        {disabled ? " (ya usada)" : ""}
                      </option>
                    );
                  })}
                </select>
                {/* hueco de hint reservado por CSS; no hace falta texto aquí */}
              </label>

              {/* Ingreso */}
              <label className="cc-field cc-field--ingreso">
                <span className="cc-label">Ingreso / entrega</span>
                <select
                  value={e.ingreso_por_entrega ?? ""}
                  onChange={(ev) =>
                    actualizarEmpresa(i, "ingreso_por_entrega", ev.target.value)
                  }
                  aria-label="Ingreso por entrega"
                >
                  <option value="">—</option>
                  {INGRESOS.map((val, idx) => (
                    <option key={idx} value={val}>
                      {formatEUR(val)}
                    </option>
                  ))}
                </select>
                <small className="cc-hint">IVA no incluido</small>
              </label>

              {/* Color */}
              <label className="cc-field cc-field--color">
                <span className="cc-label">Color</span>
                <input
                  type="color"
                  value={color}
                  onChange={(ev) => actualizarEmpresa(i, "color", ev.target.value)}
                  title="Color de etiqueta"
                  aria-label="Color de etiqueta"
                />
                {/* hint reservado por CSS */}
              </label>

              {/* Activo */}
              <label className="cc-field cc-field--switch">
                <span className="cc-label">Activo</span>
                <Switch
                  checked={e?.activo ?? true}
                  onChange={(val) => actualizarEmpresa(i, "activo", val)}
                  ariaLabel="Alternar activo"
                />
                {/* hint reservado por CSS */}
              </label>

              {/* Eliminar */}
              <button
                className="btn btn--ghost cc-remove"
                onClick={() => eliminarEmpresa(i)}
                title="Eliminar"
                aria-label={`Eliminar ${e?.nombre || "empresa"}`}
              >
                <MdDelete />
              </button>
            </article>
          );
        })}

        {/* CTA inferior (solo móvil por CSS) */}
        {empresas.length > 0 && (
          <div className="carriers-card__actions">
            <button className="btn btn--primary" onClick={añadirEmpresa}>
              <MdAddCircle /> Añadir otra empresa
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Subcomponentes & helpers ---------- */

function EmptyState({ onAdd }) {
  return (
    <div className="carriers-card__empty" role="note">
      <div className="empty-ill" aria-hidden="true" />
      <div className="empty-txt">
        <h4>Sin empresas configuradas</h4>
        <p>Añade tu primera compañía para empezar a registrar entregas e ingresos.</p>
        <button className="btn btn--primary" onClick={onAdd}>
          <MdAddCircle /> Añadir empresa
        </button>
      </div>
    </div>
  );
}

function Switch({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      className={`switch ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={!!checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__thumb" />
    </button>
  );
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

function formatEUR(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  if (Number.isNaN(n)) return "—";
  return n.toFixed(2) + " €";
}
