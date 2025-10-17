import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaHome } from 'react-icons/fa'
import { useModal } from '../../context/ModalContext'
import NavbarBrand from './NavbarBrand'
import NavbarMenus from './NavbarMenus'
import NavbarActions from './NavbarActions'
import useNavbarAuth from './useNavbarAuth'

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

  const [scrolled, setScrolled] = useState(false)
  const homeBtnRef = useRef(null)

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

  // hash scrolling para el landing
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
      requestAnimationFrame(() => scrollToId(hash))
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goDashboard = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    navigate(slug ? `/${slug}/dashboard` : '/dashboard')
  }

  if (location.pathname === '/email-confirmado') return null

  return (
    <nav className={`navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <NavbarBrand />

      <div className="navbar__spacer" />

      <NavbarMenus handleHashClick={handleHashClick} />


      {/* derecha: casita (si hay sesión) + chip/perfil/cta */}
      <div className="navbar__right">
        {isLoggedIn && (
          <button
            ref={homeBtnRef}
            className="navbar__homebtn"
            onClick={goDashboard}
            aria-label="Ir al panel"
            title="Ir al panel"
            type="button"
          >
            <FaHome aria-hidden="true" />
          </button>
        )}
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
      </div>
    </nav>
  )
}
