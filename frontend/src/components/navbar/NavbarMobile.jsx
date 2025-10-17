import { useEffect, useRef, useState } from 'react'
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
  // ----- Swipe-to-close -----
  const panelRef = useRef(null)
  const localRootRef = useRef(null)
  const rootEl = refRoot ?? localRootRef
  const startX = useRef(0)
  const dragDX = useRef(0)
  const [dragging, setDragging] = useState(false)

  // ⛑ Anti “tap de apertura cierra”: el backdrop se arma tras 250ms
  const [armed, setArmed] = useState(false)

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Armar/desarmar backdrop + scroll lock + hidden
  useEffect(() => {
    const root = rootEl.current
    if (!root) return
    if (!open) root.setAttribute('hidden', '')
    else root.removeAttribute('hidden')

    document.body.classList.toggle('no-scroll', open)

    if (open) {
      setArmed(false)
      const t = setTimeout(() => setArmed(true), 250)
      return () => clearTimeout(t)
    } else {
      setArmed(false)
    }
  }, [open, rootEl])

  const resetDrag = () => {
    dragDX.current = 0
    setDragging(false)
    if (panelRef.current) {
      panelRef.current.style.transform = ''
      panelRef.current.style.opacity = ''
      panelRef.current.style.transition = ''
    }
  }

  const onTouchStart = (e) => {
    if (!open) return
    const vw = window.innerWidth || 0
    const x0 = e.touches?.[0]?.clientX ?? 0
    if (vw - x0 > 48 && !panelRef.current?.contains(e.target)) return
    setDragging(true)
    startX.current = x0
    dragDX.current = 0
  }

  const onTouchMove = (e) => {
    if (!dragging) return
    const x = e.touches?.[0]?.clientX ?? 0
    const dx = Math.max(0, x - startX.current)
    dragDX.current = dx
    if (panelRef.current) {
      const damped = Math.min(dx, 320)
      const progress = Math.min(1, damped / 320)
      panelRef.current.style.transform = `translateX(${damped}px)`
      panelRef.current.style.opacity = String(1 - progress * 0.35)
    }
  }

  const onTouchEnd = () => {
    if (!dragging) return
    const dx = dragDX.current
    const shouldClose = dx > 80
    if (shouldClose) {
      if (panelRef.current) {
        panelRef.current.style.transition = 'transform .16s ease-out, opacity .16s ease-out'
        panelRef.current.style.transform = 'translateX(100%)'
        panelRef.current.style.opacity = '0.6'
      }
      setTimeout(() => { resetDrag(); onClose?.() }, 140)
    } else {
      if (panelRef.current) {
        panelRef.current.style.transition = 'transform .16s ease-out, opacity .16s ease-out'
        panelRef.current.style.transform = ''
        panelRef.current.style.opacity = ''
        setTimeout(() => { if (panelRef.current) panelRef.current.style.transition = '' }, 160)
      }
      resetDrag()
    }
  }

  return (
    <div
      id={id}
      ref={rootEl}
      className={`navbar__mobile ${open ? 'open' : ''}`}
      aria-hidden={!open}
    >
      {/* Backdrop (se arma después de 250ms para ignorar el click sintetizado del tap de apertura) */}
      {open && (
        <button
          className="navbar__mobile-backdrop"
          aria-label="Cerrar menú"
          onClick={(e) => {
            // si aún no está armado, ignorar este tap
            if (!armed) { e.preventDefault(); e.stopPropagation(); return }
            onClose?.()
          }}
          style={{ pointerEvents: armed ? 'auto' : 'none' }}
        />
      )}

      <aside
        ref={panelRef}
        className={`navbar__mobile-panel ${dragging ? 'is-dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobileMenuTitle"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
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
            {/* 
            <button
              className="mobile-link"
              onClick={(e) => { handleHashClick?.(e, '#features'); onClose?.() }}
            >
              Características
            </button>
            */}
          </nav>

          {/* CTA y acciones de cuenta */}
          <div className="mobile-cta">
            {checking ? null : !isLoggedIn ? (
              <>
                <button
                  className="navbar__cta block"
                  onClick={() => { onClose?.(); openRegister?.() }}
                >
                  Solicitar DEMO
                </button>
                <button
                  className="navbar__link block"
                  onClick={() => { onClose?.(); openLogin?.() }}
                >
                  <FaLock /> <span>Login</span>
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
