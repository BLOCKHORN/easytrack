import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { FaTwitter, FaLinkedin, FaGithub, FaArrowUp, FaShieldAlt } from 'react-icons/fa';
import '../styles/Footer.scss';

export default function Footer() {
  const year = new Date().getFullYear();

  // Rutas coherentes con App.jsx (SEO-friendly)
  const links = useMemo(() => ({
    producto: [
      { to: '/caracteristicas', label: 'Características' },
      { to: '/precios', label: 'Precios' },
      { to: '/como-funciona', label: 'Cómo funciona' },
    ],
    ayuda: [
      { to: '/soporte#faq', label: 'Centro de ayuda (FAQ)' },
      { to: '/soporte#contacto', label: 'Soporte' },
      { to: '/sobre-nosotros', label: 'Sobre nosotros' },
      { to: '/contacto', label: 'Contacto' },
    ],
    legalBottom: [
      { to: '/legal/privacidad', label: 'Privacidad' },
      { to: '/legal/terminos', label: 'Términos' },
      { to: '/legal/cookies', label: 'Cookies' },
    ]
  }), []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="et-footer" role="contentinfo">
      <div className="et-footer__container">
        <div className="et-footer__grid">
          {/* Branding */}
          <div className="et-footer__brand">
            <Link to="/" className="et-footer__brand-link" aria-label="Inicio EasyTrack">
              <img src="/easypack.png" alt="EasyTrack logo" className="et-footer__logo" loading="lazy" />
            </Link>

            <p className="et-footer__tagline">
              Plataforma de gestión de paquetería moderna, segura y escalable.
            </p>

            <div className="et-footer__badge" aria-label="Disponibilidad del servicio">
              <FaShieldAlt /> <span>Objetivo 99,9% de disponibilidad</span>
            </div>

            <div className="et-footer__social" aria-label="Redes sociales">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter">
                <FaTwitter />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <FaLinkedin />
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
                <FaGithub />
              </a>
            </div>

            <div className="et-footer__madeby" aria-label="Hecho por Blockhorn">
              <img src="/blockhorn.png" alt="Blockhorn logo" loading="lazy" />
              <div>
                <span>Una solución de <strong>Blockhorn</strong></span>
                <small>Infraestructura para puntos de paquetería.</small>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="et-footer__nav" aria-label="Mapa del sitio">
            <div className="et-footer__column">
              <h4 className="et-footer__heading">Producto</h4>
              <div className="et-footer__links">
                {links.producto.map(l => (
                  <Link key={l.to} to={l.to} className="et-footer__link">{l.label}</Link>
                ))}
              </div>
            </div>

            <div className="et-footer__column">
              <h4 className="et-footer__heading">Ayuda</h4>
              <div className="et-footer__links">
                {links.ayuda.map(l => (
                  <Link key={l.to} to={l.to} className="et-footer__link">{l.label}</Link>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Línea inferior */}
        <div className="et-footer__bottom">
          <p className="et-footer__copyright">&copy; {year} EasyTrack. Todos los derechos reservados.</p>
          <div className="et-footer__bottom-links">
            {links.legalBottom.map(l => (
              <Link key={l.to} to={l.to} className="et-footer__link et-footer__link--sm">{l.label}</Link>
            ))}
            <button
              type="button"
              className="et-footer__to-top"
              onClick={scrollTop}
              aria-label="Volver arriba"
              title="Volver arriba"
            >
              <FaArrowUp />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
