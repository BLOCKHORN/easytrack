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
  // skeleton mientras carga auth
  if (checking) {
    return (
      <div className="navbar__actions" aria-hidden="true">
        <div className="skel skel--btn" />
        <div className="skel skel--chip" />
      </div>
    )
  }

  // SIN sesión → CTA + Login (sin hamburguesa)
  if (!isLoggedIn) {
    return (
      <div className="navbar__actions" role="group" aria-label="Acciones">
        <button
          className="navbar__cta"
          onClick={openRegister}
          type="button"
        >
          Solicitar DEMO
        </button>

        <button
          className="navbar__login"
          onClick={openLogin}
          type="button"
          aria-label="Iniciar sesión"
        >
          <FaLock aria-hidden="true" />
          <span className="label">Login</span>
        </button>
      </div>
    )
  }

  // CON sesión → chip de cuenta
  return (
    <div className="navbar__actions" role="group" aria-label="Cuenta">
      <NavbarAccountMenu
        avatarUrl={avatarUrl}
        userEmail={userEmail}
        displayName={displayName}
        nombreEmpresa={nombreEmpresa}
        goConfig={goConfig}
        handleLogout={handleLogout}
        slug={slug}
      />
    </div>
  )
}
