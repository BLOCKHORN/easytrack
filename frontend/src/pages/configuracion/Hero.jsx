import { MdBusiness, MdStore, MdInfo } from "react-icons/md";
import "./Hero.scss";

export default function Hero({ tenant, usuario }) {
  const nombreEmpresa = (tenant?.nombre_empresa || "").trim();
  const email = usuario?.email || "—";
  const isEmptyName = !nombreEmpresa;
  const displayName = isEmptyName ? "Sin nombre" : nombreEmpresa;

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "—";

  return (
    <header className="hero hero--config" aria-label="Cabecera de configuración">
      <div className="hero__brand" aria-hidden="true">
        <div className="hero__orb" role="img" aria-label={`Avatar de ${displayName}`}>
          <span className="hero__initials">{initials}</span>
          <span className="hero__icon">
            <MdBusiness />
          </span>
        </div>
      </div>

      <div className="hero__content">
        <p className="hero__eyebrow">Panel de control</p>
        <h1 className="hero__title">Configuración del negocio</h1>
        <p className="hero__subtitle" id="hero-subtitle">
          Define el nombre, personaliza el banner y diseña tu almacén. Añade tus
          empresas de transporte y el ingreso por entrega para los informes.
        </p>

        <div className="hero__meta" role="list" aria-describedby="hero-subtitle">
          <span
            className={`chip hero__chip ${isEmptyName ? "chip--error" : "chip--success"}`}
            role="listitem"
            title={displayName}
          >
            <MdStore />
            <span className="truncate">{displayName}</span>
          </span>

          <span className="chip hero__chip" role="listitem" title={email}>
            <MdInfo />
            <span className="truncate">{email}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
