import { Link } from 'react-router-dom'
import { FaLock, FaArrowRight } from 'react-icons/fa'
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
  const panelHref = slug ? `/${slug}/dashboard` : '/dashboard';

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
            <FaLock aria-hidden="true" />
            <span>Login</span>
          </button>
          <Link to="/registro" className="btn btn-primary">Solicitar DEMO</Link>
        </>
      ) : (
        <>
          {/* Botón pro */}
          <Link
            className="btn nav-btn-pro btn--enter"
            to={panelHref}
            title="Ir al panel"
          >
            <span className="btn__label">Ir al panel</span>
            <FaArrowRight className="btn__icon" aria-hidden="true" />
          </Link>

          {/* Separador a la DERECHA del botón */}
          <span className="nav-sep" aria-hidden="true" />

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
