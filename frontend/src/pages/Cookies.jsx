// src/pages/Cookies.jsx
import { useMemo } from 'react'
import { FiPrinter, FiSettings } from 'react-icons/fi'
import '../styles/Legal.scss'

/**
 * Política de cookies alineada con RGPD/ePrivacy.
 * Incluye apertura del gestor de consentimiento (CMP) si existe.
 */
export default function CookiesPage() {
  const updated = useMemo(
    () => new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' }),
    []
  )

  const TOC = [
    { id: 'intro',   label: '1. Introducción' },
    { id: 'que-es',  label: '2. ¿Qué son las cookies?' },
    { id: 'tipos',   label: '3. Categorías de cookies' },
    { id: 'base',    label: '4. Base legal' },
    { id: 'gestion', label: '5. Gestor de preferencias' },
    { id: 'lista',   label: '6. Inventario de cookies y almacenamiento' },
    { id: 'cambios', label: '7. Cambios en esta política' },
    { id: 'contacto',label: '8. Contacto' },
  ]

  const handlePrint = () => window.print()

  // Abre el gestor de consentimiento si tu CMP está presente
  const openCookiePreferences = () => {
    if (window.cookieyes?.openSettings) return window.cookieyes.openSettings()
    if (window.Cookiebot?.show) return window.Cookiebot.show()
    if (window.OnetrustActiveGroups !== undefined && window.Optanon) return window.Optanon.ToggleInfoDisplay()
    if (window.klaro?.show) return window.klaro.show()
    if (window.__cookiePrefs?.open) return window.__cookiePrefs.open()
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
              En EasyTrack utilizamos cookies y tecnologías equivalentes para operar la plataforma y, si así lo aceptas,
              para medir uso y mejorar la experiencia. Puedes cambiar tu elección en cualquier momento desde{' '}
              <button type="button" className="legal__link-btn" onClick={openCookiePreferences}>Configurar cookies</button>.
            </p>
          </section>

          <section id="que-es" className="legal__section">
            <h2>2. ¿Qué son las cookies?</h2>
            <p>
              Pequeños archivos o identificadores que el sitio envía a tu navegador para recordar información durante tu
              sesión. Tratamos como “similares” ciertos usos de <code>localStorage</code> o <code>sessionStorage</code>
              cuando cumplen una función análoga.
            </p>
          </section>

          <section id="tipos" className="legal__section">
            <h2>3. Categorías de cookies</h2>
            <ul>
              <li><span className="badge">Necesarias</span> — imprescindibles para iniciar sesión, seguridad y prestación del servicio.</li>
              <li><span className="badge badge--pref">Preferencias</span> — recuerdan configuración de interfaz.</li>
              <li><span className="badge badge--analytics">Analíticas</span> — métricas agregadas de uso (solo si las aceptas).</li>
              <li><span className="badge badge--mkt">Marketing</span> — medición/publicidad (solo si las aceptas).</li>
            </ul>
          </section>

          <section id="base" className="legal__section">
            <h2>4. Base legal</h2>
            <p>
              Las <strong>necesarias</strong> se basan en nuestro interés legítimo para prestar el servicio.
              Preferencias, analíticas y marketing se instalan solo con tu <strong>consentimiento</strong>, que puedes
              retirar desde{' '}
              <button type="button" className="legal__link-btn" onClick={openCookiePreferences}>Configurar cookies</button>.
            </p>
          </section>

          <section id="gestion" className="legal__section">
            <h2>5. Gestor de preferencias</h2>
            <p>Puedes aceptar o rechazar categorías de cookies:</p>
            <p>
              <button type="button" className="legal__btn legal__btn--primary" onClick={openCookiePreferences}>
                Abrir preferencias de cookies
              </button>
            </p>
            <p>También puedes gestionar cookies desde tu navegador. Bloquear las necesarias puede impedir el funcionamiento.</p>
          </section>

          <section id="lista" className="legal__section">
            <h2>6. Inventario de cookies y almacenamiento</h2>

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
                    <td>Guardar las preferencias de consentimiento.</td>
                    <td>12 meses</td>
                    <td>Primera parte · Necesaria</td>
                  </tr>
                  <tr>
                    <td>__stripe_mid</td>
                    <td>Stripe</td>
                    <td>Prevención de fraude y pago seguro.</td>
                    <td>12 meses</td>
                    <td>Terceros · Necesaria</td>
                  </tr>
                  <tr>
                    <td>_ga</td>
                    <td>Google</td>
                    <td>Analítica agregada (solo si la activas).</td>
                    <td>13 meses</td>
                    <td>Terceros · Analítica</td>
                  </tr>
                  <tr>
                    <td>_gid</td>
                    <td>Google</td>
                    <td>Distinguir sesiones (solo si la activas).</td>
                    <td>24 horas</td>
                    <td>Terceros · Analítica</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Almacenamiento local</h3>
            <p>
              Usamos <code>localStorage</code>/<code>sessionStorage</code> para datos técnicos de sesión (p. ej.,
              tokens de Supabase, preferencias de interfaz). Su tratamiento se detalla en la{' '}
              <a href="/legal/privacidad">Política de Privacidad</a>.
            </p>
          </section>

          <section id="cambios" className="legal__section">
            <h2>7. Cambios en esta política</h2>
            <p>
              Publicaremos actualizaciones y, cuando sea necesario, solicitaremos de nuevo tu consentimiento.
            </p>
          </section>

          <section id="contacto" className="legal__section">
            <h2>8. Contacto</h2>
            <p>Privacidad y cookies: <a href="mailto:info@easytrack.pro">info@easytrack.pro</a></p>
          </section>
        </article>
      </div>
    </main>
  )
}
