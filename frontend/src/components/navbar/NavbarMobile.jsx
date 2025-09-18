// src/components/navbar/NavbarMobile.jsx
import { Link } from 'react-router-dom'
import { FaSignOutAlt, FaLock } from 'react-icons/fa'

export default function NavbarMobile({
  id,
  refRoot,
  refClose,
  open,
  onClose,
  checking,
  isLoggedIn,
  openLogin,
  openRegister,
  slug,
  handleLogout,
  handleHashClick,
}) {
  return (
    <div id={id} ref={refRoot} className={`navbar__mobile ${open ? 'open' : ''}`}>
      <div className="navbar__mobile-backdrop" onClick={onClose} />
      <aside className="navbar__mobile-panel" role="dialog" aria-modal="true">
        <div className="navbar__mobile-header">
          <Link to="/" className="navbar__brand small" onClick={onClose} aria-label="Inicio">
            <span className="brand-wordmark">EASYTRACK</span>
          </Link>
          <button
            ref={refClose}
            className="navbar__mobile-close"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <div className="navbar__mobile-content">

          <Link
            to="/#pricing"
            className="mobile-link"
            onClick={(e) => { handleHashClick(e, '#pricing'); onClose() }}
          >
            Precios
          </Link>

          <div className="mobile-cta">
            {checking ? null : !isLoggedIn ? (
              <>
                <button
                  className="navbar__link block"
                  onClick={() => { onClose(); openLogin() }}
                >
                  <FaLock /> <span>Login</span>
                </button>
                <button
                  className="navbar__cta block"
                  onClick={() => { onClose(); openRegister() }}
                >
                  Empezar prueba gratis
                </button>
              </>
            ) : (
              <>
                <Link
                  className="btn btn--enter block"
                  to={slug ? `/${slug}/dashboard` : '/dashboard'}
                  onClick={onClose}
                >
                  Ir al panel
                </Link>
                <button
                  className="navbar__mobile-item danger"
                  onClick={() => { onClose(); handleLogout() }}
                >
                  <FaSignOutAlt /> <span>Cerrar sesión</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
