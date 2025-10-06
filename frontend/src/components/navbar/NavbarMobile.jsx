// src/components/NavbarMobile.jsx
import { useEffect } from 'react'
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
  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div id={id} ref={refRoot} className={`navbar__mobile ${open ? 'open' : ''}`} aria-hidden={!open}>
      <button
        className="navbar__mobile-backdrop"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <aside
        className="navbar__mobile-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobileMenuTitle"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header fijo con safe-area para que el logo no se tape */}
        <div className="navbar__mobile-header">
          <Link to="/" className="navbar__brand small" onClick={onClose} aria-label="Inicio">
            <span className="brand-wordmark" id="mobileMenuTitle">EASYTRACK</span>
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

        {/* Contenido scrollable */}
        <div className="navbar__mobile-content">
          <nav className="mobile-section" aria-label="Navegación">
            {/* 🔒 Opción Precios oculta temporalmente */}
            {/*
            <Link
              to="/#pricing"
              className="mobile-link"
              onClick={(e) => { handleHashClick?.(e, '#pricing'); onClose?.() }}
            >
              Precios
            </Link>
            */}
          </nav>

          {/* CTA y acciones de cuenta */}
          <div className="mobile-cta">
            {checking ? null : !isLoggedIn ? (
              <>
                <button
                  className="navbar__link block"
                  onClick={() => { onClose?.(); openLogin?.() }}
                >
                  <FaLock /> <span>Login</span>
                </button>
                <button
                  className="navbar__cta block"
                  onClick={() => { onClose?.(); openRegister?.() }}
                >
                  Solicitar DEMO
                </button>
              </>
            ) : (
              <>
                <Link
                  className="btn btn--enter btn--enter-mobile block"
                  to={slug ? `/${slug}/dashboard` : '/dashboard'}
                  onClick={onClose}
                >
                  Ir al panel
                </Link>

                <button
                  className="navbar__mobile-item danger"
                  onClick={() => { onClose?.(); handleLogout?.() }}
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
