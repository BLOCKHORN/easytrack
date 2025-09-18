// src/components/navbar/Navbar.jsx
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useModal } from '../../context/ModalContext'
import NavbarBrand from './NavbarBrand'
import NavbarMenus from './NavbarMenus'
import NavbarActions from './NavbarActions'
import NavbarMobile from './NavbarMobile'
import useNavbarAuth from './useNavbarAuth'

// estilos (como el landing: base + parciales por componente)
import './NavbarBase.scss'
import './NavbarBrand.scss'
import './NavbarMenus.scss'
import './NavbarActions.scss'
import './NavbarAccountMenu.scss'
import './NavbarMobile.scss'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { openLogin, openRegister } = useModal()

  // estado UI
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // refs para control de foco en móvil
  const hamburgerRef = useRef(null)
  const mobileCloseRef = useRef(null)
  const mobileRootRef = useRef(null)

  // auth + tenant
  const {
    checking,
    isLoggedIn,
    userEmail,
    avatarUrl,
    displayName,
    nombreEmpresa,
    slug,
    handleLogout,
    goConfig,
  } = useNavbarAuth(navigate)

  // scroll suave a #hash si ya estamos en "/"
  const NAV_OFFSET = 80
  const scrollToId = (hash) => {
    const id = (hash || '').replace('#', '')
    if (!id) return
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
  const handleHashClick = (e, hash) => {
    if (location.pathname === '/' && hash) {
      e.preventDefault()
      if (mobileOpen) closeMobile()
      requestAnimationFrame(() => scrollToId(hash))
    }
  }

  // efectos
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('no-scroll', mobileOpen)
    const el = mobileRootRef.current
    if (el) {
      // @ts-ignore inert es experimental pero soportado
      el.inert = !mobileOpen
      if (!mobileOpen) el.setAttribute('aria-hidden', 'true')
      else el.removeAttribute('aria-hidden')
    }
    return () => document.body.classList.remove('no-scroll')
  }, [mobileOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && mobileOpen) closeMobile() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  // móvil: open/close con foco correcto
  const openMobile = () => {
    setMobileOpen(true)
    requestAnimationFrame(() => mobileCloseRef.current?.focus())
  }
  const closeMobile = () => {
    hamburgerRef.current?.focus?.({ preventScroll: true })
    requestAnimationFrame(() => setMobileOpen(false))
  }

  // ocultar navbar en rutas concretas
  if (location.pathname === '/email-confirmado') return null

  return (
    <nav className={`navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <NavbarBrand />

      <div className="navbar__spacer" />

      {/* Menú simplificado: solo enlaces directos */}
      <NavbarMenus handleHashClick={handleHashClick} />

      <span className="navbar__divider" aria-hidden="true">|</span>

      <NavbarActions
        checking={checking}
        isLoggedIn={isLoggedIn}
        openLogin={openLogin}
        openRegister={openRegister}
        slug={slug}
        avatarUrl={avatarUrl}
        userEmail={userEmail}
        displayName={displayName}
        nombreEmpresa={nombreEmpresa}
        goConfig={goConfig}
        handleLogout={handleLogout}
      />

      {/* HAMBURGUESA (móvil) */}
      <button
        ref={hamburgerRef}
        id="navbarHamburger"
        className={`navbar__hamburger ${mobileOpen ? 'active' : ''}`}
        onClick={mobileOpen ? closeMobile : openMobile}
        aria-label="Abrir menú"
        aria-expanded={mobileOpen}
        aria-controls="mobileMenu"
      >
        <span /><span /><span />
      </button>

      <NavbarMobile
        id="mobileMenu"
        refRoot={mobileRootRef}
        refClose={mobileCloseRef}
        open={mobileOpen}
        onClose={closeMobile}
        checking={checking}
        isLoggedIn={isLoggedIn}
        openLogin={openLogin}
        openRegister={openRegister}
        slug={slug}
        handleLogout={handleLogout}
        handleHashClick={handleHashClick}
      />
    </nav>
  )
}
