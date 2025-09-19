// src/components/navbar/NavbarActions.jsx
import { Link } from 'react-router-dom'
import { FaLock } from 'react-icons/fa'
import NavbarAccountMenu from './NavbarAccountMenu'

export default function NavbarActions({
  checking,
  isLoggedIn,
  openLogin,
  openRegister,
  slug,
  avatarUrl,
  userEmail,
  displayName,
  nombreEmpresa,
  goConfig,
  handleLogout,
}) {
  return (
    <div className="navbar__actions" aria-label="Acciones de usuario">
      {checking ? (
        <div className="navbar__skeleton" aria-hidden>
          <div className="skel skel--btn" />
          <div className="skel skel--btn skel--primary" />
        </div>
      ) : !isLoggedIn ? (
        <>
          <button className="navbar__link" onClick={openLogin}>
            <FaLock /> <span>Login</span>
          </button>
          <Link to="/precios" className="btn btn-primary">Empezar prueba gratis</Link>
        </>
      ) : (
        <>
          <Link
            className="btn btn--enter"
            to={slug ? `/${slug}/dashboard` : '/dashboard'}
          >
            Ir al panel
          </Link>

          <NavbarAccountMenu
            avatarUrl={avatarUrl}
            userEmail={userEmail}
            displayName={displayName}
            nombreEmpresa={nombreEmpresa}
            goConfig={goConfig}
            handleLogout={handleLogout}
            slug={slug}
          />
        </>
      )}
    </div>
  )
}
