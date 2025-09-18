import { useMemo } from 'react'
import { FiPrinter, FiSettings } from 'react-icons/fi'
import '../styles/Legal.scss'

export default function CookiesPage() {
  const updated = useMemo(
    () => new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' }),
    []
  )

  const TOC = [
    { id: 'intro',   label: '1. Introducción' },
    { id: 'que-es',  label: '2. ¿Qué son las cookies?' },
    { id: 'tipos',   label: '3. Tipos de cookies que usamos' },
    { id: 'base',    label: '4. Base legal' },
    { id: 'gestion', label: '5. Cómo gestionar tus cookies' },
    { id: 'lista',   label: '6. Lista de cookies' },
    { id: 'cambios', label: '7. Cambios en esta política' },
    { id: 'contacto',label: '8. Contacto' },
  ]

  const handlePrint = () => window.print()

  // Intenta abrir el gestor de preferencias de tu CMP si existe
  const openCookiePreferences = () => {
    // CookieYes
    if (window.cookieyes?.openSettings) return window.cookieyes.openSettings()
    // Cookiebot
    if (window.Cookiebot?.show) return window.Cookiebot.show()
    // OneTrust
    if (window.OnetrustActiveGroups !== undefined && window.Optanon) return window.Optanon.ToggleInfoDisplay()
    // Klaro (ejemplo)
    if (window.klaro?.show) return window.klaro.show()
    // Custom
    if (window.__cookiePrefs?.open) return window.__cookiePrefs.open()
    // Fallback
    const anchor = document.getElementById('gestion')
    anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    alert('No se detectó un gestor de preferencias. Integra tu CMP o define window.__cookiePrefs.open().')
  }

  return (
    <main className="legal" role="main">
      <div className="legal__shell">
        {/* TOC */}
        <aside className="legal__card legal__toc" aria-label="Índice de contenidos">
          <div className="legal__toc-head">
            <h3>Contenido</h3>
            <div style={{display:'flex', gap:8}}>
              <button className="legal__print" onClick={openCookiePreferences} aria-label="Configurar cookies">
                <FiSettings /><span>Preferencias</span>
              </button>
              <button className="legal__print" onClick={handlePrint} aria-label="Imprimir o guardar PDF">
                <FiPrinter /><span>Imprimir</span>
              </button>
            </div>
          </div>
          <nav>
            <ul>
              {TOC.map(item => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Contenido */}
        <article className="legal__card legal__content">
          <header className="legal__head">
            <p className="legal__kicker">Legal · Cookies</p>
            <h1 className="legal__title">Política de Cookies</h1>
            <p className="legal__meta">Última actualización: {updated}</p>
          </header>

          <section id="intro" className="legal__section">
            <h2>1. Introducción</h2>
            <p>
              Esta Política explica cómo EasyTrack utiliza cookies y tecnologías similares en el sitio
              web y la aplicación. Puedes gestionar tus preferencias en cualquier momento desde
              <button type="button" className="legal__link-btn" onClick={openCookiePreferences}>Configurar cookies</button>.
            </p>
          </section>

          <section id="que-es" className="legal__section">
            <h2>2. ¿Qué son las cookies?</h2>
            <p>
              Son pequeños archivos que se almacenan en tu dispositivo para recordar información de tu
              visita (preferencias, sesión, etc.). También usamos tecnologías equivalentes (localStorage,
              sessionStorage, etiquetas de seguimiento cuando procede).
            </p>
          </section>

          <section id="tipos" className="legal__section">
            <h2>3. Tipos de cookies que usamos</h2>
            <ul>
              <li><span className="badge">Necesarias</span> habilitan funciones esenciales (inicio de sesión, seguridad, carga de páginas). No pueden desactivarse desde el sistema.</li>
              <li><span className="badge badge--pref">Preferencias</span> recuerdan tus elecciones (idioma, interfaz).</li>
              <li><span className="badge badge--analytics">Analíticas</span> nos ayudan a medir uso y rendimiento (se instalan solo con tu consentimiento).</li>
              <li><span className="badge badge--mkt">Marketing</span> personalizan anuncios o miden campañas (si las activas).</li>
            </ul>
          </section>

          <section id="base" className="legal__section">
            <h2>4. Base legal</h2>
            <p>
              Las <strong>cookies necesarias</strong> se basan en nuestro <em>interés legítimo</em> para prestar el servicio.
              El resto (<em>preferencias, analíticas, marketing</em>) se instalan solo con tu <strong>consentimiento</strong>,
              que puedes retirar en cualquier momento desde
              <button type="button" className="legal__link-btn" onClick={openCookiePreferences}>Configurar cookies</button>.
            </p>
          </section>

          <section id="gestion" className="legal__section">
            <h2>5. Cómo gestionar tus cookies</h2>
            <p>
              Puedes aceptar o rechazar categorías de cookies en el gestor de preferencias:
            </p>
            <p>
              <button type="button" className="legal__btn legal__btn--primary" onClick={openCookiePreferences}>
                Abrir preferencias de cookies
              </button>
            </p>
            <p>
              También puedes borrar o bloquear cookies desde la configuración de tu navegador. Ten en cuenta que
              bloquear las necesarias puede afectar al funcionamiento del servicio.
            </p>
          </section>

          <section id="lista" className="legal__section">
            <h2>6. Lista de cookies</h2>
            <p>
              Este inventario es orientativo; revisa y completa según tu configuración real (CMP/Analytics/Pagos).
            </p>

            <div className="legal__table-wrap">
              <table className="legal__table" aria-label="Listado de cookies">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Proveedor</th>
                    <th>Finalidad</th>
                    <th>Duración</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>cookie_consent</td>
                    <td>EasyTrack</td>
                    <td>Guardar las preferencias de consentimiento de cookies.</td>
                    <td>12 meses</td>
                    <td>Primera parte · Necesaria</td>
                  </tr>
                  <tr>
                    <td>_ga</td>
                    <td>Google</td>
                    <td>Métricas agregadas de uso (si activas analíticas).</td>
                    <td>13 meses</td>
                    <td>Terceros · Analítica</td>
                  </tr>
                  <tr>
                    <td>_gid</td>
                    <td>Google</td>
                    <td>Distinguir usuarios en sesiones (si activas analíticas).</td>
                    <td>24 horas</td>
                    <td>Terceros · Analítica</td>
                  </tr>
                  <tr>
                    <td>__stripe_mid</td>
                    <td>Stripe</td>
                    <td>Prevención de fraude y pago seguro.</td>
                    <td>12 meses</td>
                    <td>Terceros · Necesaria</td>
                  </tr>
                  {/* Añade/ajusta filas reales de tu proyecto si usas otras herramientas */}
                </tbody>
              </table>
            </div>

            <p className="legal__note">
              Si usas almacenamiento local (localStorage/sessionStorage) para sesión (p. ej., tokens de Supabase),
              documenta su uso en la Política de Privacidad.
            </p>
          </section>

          <section id="cambios" className="legal__section">
            <h2>7. Cambios en esta política</h2>
            <p>
              Podemos actualizar esta Política para reflejar cambios legales o técnicos. Publicaremos los cambios
              y, cuando sea necesario, solicitaremos de nuevo tu consentimiento.
            </p>
          </section>

          <section id="contacto" className="legal__section">
            <h2>8. Contacto</h2>
            <p>
              Dudas sobre cookies o privacidad: <a href="mailto:support@easytrack.pro">support@easytrack.pro</a>
            </p>
          </section>
        </article>
      </div>
    </main>
  )
}
