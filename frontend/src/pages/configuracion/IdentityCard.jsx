import { MdStore, MdInfo } from "react-icons/md";
import ConfiguracionImagen from "../../components/ConfiguracionImagen";
import "./IdentityCard.scss";

export default function IdentityCard({ nombre, setNombre, usuario }) {
  return (
    <div className="card identity-card" aria-labelledby="identity-title">
      {/* Header */}
      <div className="card__header identity-card__header">
        <div className="identity-card__badge" aria-hidden="true">
          <MdStore />
        </div>
        <div className="identity-card__headtext">
          <h3 id="identity-title" className="identity-card__title">
            Identidad del negocio
          </h3>
          <p className="identity-card__subtitle">
            Nombre visible y banner del dashboard. Solo administradores pueden editarlo.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="card-body identity-card__body">
        {/* Callout */}
        <div className="identity-card__callout" role="note" aria-live="polite">
          <MdInfo />
          <p>Usa un nombre claro y corto. Puedes cambiarlo cuando quieras.</p>
        </div>

        {/* Campo: Nombre */}
        <div className="identity-card__row">
          <label className="identity-card__field">
            <span className="identity-card__label">Nombre de empresa</span>
            <div className="identity-card__inputwrap">
              <span className="identity-card__inputicon" aria-hidden="true">
                <MdStore />
              </span>
              <input
                className="identity-card__input"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Mi empresa logística"
                aria-label="Nombre de empresa"
                maxLength={120}
                autoComplete="organization"
              />
            </div>
            <small className="identity-card__hint">
              Se muestra en la cabecera del panel e informes.
            </small>
          </label>
        </div>

        <hr className="identity-card__divider" />

        {/* Sección banner */}
        <section className="identity-card__section" aria-labelledby="banner-title">
          <header className="identity-card__sectionhead">
            <h4 id="banner-title" className="identity-card__sectiontitle">
              Imagen de cabecera (banner)
            </h4>
            <p className="identity-card__sectiondesc">
              Recomendado <strong>1440×360 px</strong> · JPG, PNG, WEBP o AVIF. Se mostrará en la parte superior del panel.
            </p>
          </header>

          <div className="identity-card__bannerframe">
            <div className="identity-card__bannerinner">
              <ConfiguracionImagen usuario={usuario} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
