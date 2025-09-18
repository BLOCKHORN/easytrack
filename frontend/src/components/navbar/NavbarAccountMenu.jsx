import { useEffect, useRef, useState } from 'react'
import { FaChevronDown, FaCog, FaSignOutAlt } from 'react-icons/fa'

function Avatar({ email, url, size = 'md', ring = true }) {
  const letter = (email?.[0] || 'U').toUpperCase()
  const colors = ['#4F46E5', '#2563EB', '#059669', '#DC2626', '#0EA5E9', '#9333EA']
  const color = colors[letter.charCodeAt(0) % colors.length]
  return (
    <span className={`account__avatar ${size} ${ring ? 'ring' : ''}`}>
      {url ? (
        <img src={url} alt="avatar" />
      ) : (
        <div className="navbar__avatar-fallback" style={{ backgroundColor: color }}>
          {letter}
        </div>
      )}
    </span>
  )
}

/** Contenedor para íconos con tamaño blindado (no les afecta el font-size global) */
function Icon({ children, size = 18, className = '' }) {
  return (
    <span
      className={`account__icon ${className}`}
      style={{ '--icon-size': `${size}px` }}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}

export default function NavbarAccountMenu({
  avatarUrl,
  userEmail,
  displayName,
  nombreEmpresa,
  goConfig,
  handleLogout,
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const menuRef = useRef(null)

  const enter = () => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(true)
  }
  const leave = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 160)
  }

  // Cerrar por click fuera
  useEffect(() => {
    const onDocPointer = (e) => {
      if (!open) return
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => document.removeEventListener('pointerdown', onDocPointer)
  }, [open])

  return (
    <div
      className={`account ${open ? 'open' : ''}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
      ref={menuRef}
    >
      <button
        className="account__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar email={userEmail} url={avatarUrl} />
        <span className="account__meta">
          <strong className="truncate">{nombreEmpresa}</strong>
          <small className="truncate">{displayName}</small>
        </span>

        {/* chevron con tamaño bloqueado */}
        <Icon size={14} className="account__chev">
          <FaChevronDown />
        </Icon>
      </button>

      <div className="account__menu" role="menu" aria-hidden={!open}>
        <div className="account__header">
          <Avatar email={userEmail} url={avatarUrl} size="lg" />
          <div className="account__who">
            <strong>{displayName}</strong>
            <small className="muted">{userEmail}</small>
            <small className="muted">Empresa: {nombreEmpresa}</small>
          </div>
        </div>

        <button onClick={goConfig} className="account__item" role="menuitem">
          <Icon size={18}><FaCog /></Icon>
          <span>Configuración</span>
        </button>

        <hr />

        <button onClick={handleLogout} className="account__item danger" role="menuitem">
          <Icon size={18}><FaSignOutAlt /></Icon>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )
}
