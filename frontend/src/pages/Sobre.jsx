import {
  FiTarget, FiShield, FiTrendingUp, FiZap, FiDatabase, FiUsers,
  FiCheckCircle, FiClock, FiLayers, FiArrowRight
} from 'react-icons/fi'
import '../styles/Sobre.scss'

export default function Sobre() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'EasyTrack',
    url: 'https://easytrack.pro',
    logo: 'https://easytrack.pro/easypack.png',
    sameAs: ['https://www.linkedin.com', 'https://twitter.com'],
    parentOrganization: {
      '@type': 'Organization',
      name: 'Blockhorn Studios OÜ'
    }
  }

  return (
    <main className="sobre" role="main">
      {/* SEO microdata */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <header className="sobre__hero">
        <div className="sobre__hero-shell">
          <h1>Sobre EasyTrack</h1>
          <p className="sobre__lead">
            SaaS para puntos de paquetería. Diseña tu almacén, controla entradas y entregas
            y obtén métricas claras por negocio y sede.
          </p>
          <div className="sobre__cta">
            <a href="/precios" className="sobre__btn sobre__btn--primary">
              Ver precios <FiArrowRight />
            </a>
            <a href="/soporte#contacto" className="sobre__btn">
              Habla con nosotros
            </a>
          </div>

          <ul className="sobre__trust">
            <li><FiShield /> RGPD & DPA bajo petición</li>
            <li><FiDatabase /> Datos aislados por negocio (multi-tenant)</li>
            <li><FiCheckCircle /> Pagos seguros con Stripe</li>
          </ul>
        </div>
      </header>

      {/* HIGHLIGHTS */}
      <section className="sobre__grid" aria-label="Pilares del producto">
        <article className="sobre__card">
          <div className="sobre__icon"><FiTarget /></div>
          <h3>Misión</h3>
          <p>Que cualquier punto pickup gestione su volumen diario con orden, rapidez y cero fricción.</p>
        </article>

        <article className="sobre__card">
          <div className="sobre__icon"><FiShield /></div>
          <h3>Seguridad primero</h3>
          <p>Separación real por negocio, control de acceso por permisos y cifrado en tránsito.</p>
        </article>

        <article className="sobre__card">
          <div className="sobre__icon"><FiTrendingUp /></div>
          <h3>Escala y rendimiento</h3>
          <p>Interfaz ágil y búsqueda indexada para trabajar rápido incluso con alto volumen.</p>
        </article>

        <article className="sobre__card">
          <div className="sobre__icon"><FiZap /></div>
          <h3>Rapidez operativa</h3>
          <p>Atajos de teclado y escáneres (modo teclado) para registrar en segundos.</p>
        </article>

        <article className="sobre__card">
          <div className="sobre__icon"><FiUsers /></div>
          <h3>Hecho para equipos</h3>
          <p>Roles y permisos, registro de actividad y métricas por sede para decidir con datos.</p>
        </article>

        <article className="sobre__card">
          <div className="sobre__icon"><FiLayers /></div>
          <h3>Integrable</h3>
          <p>Importación CSV, exportación masiva y conectores bajo solicitud.</p>
        </article>
      </section>

      {/* STATS */}
      <section className="sobre__stats" aria-label="Métricas y objetivos">
        <div className="sobre__stat">
          <span className="kpi">~5&nbsp;min</span>
          <span className="cap">Onboarding medio</span>
        </div>
        <div className="sobre__stat">
          <span className="kpi">99,9%</span>
          <span className="cap">Objetivo de disponibilidad</span>
        </div>
        <div className="sobre__stat">
          <span className="kpi">2–3×</span>
          <span className="cap">Más rápido que inventario manual</span>
        </div>
        <div className="sobre__stat">
          <span className="kpi">Multi-sede</span>
          <span className="cap">Negocios con varias ubicaciones</span>
        </div>
      </section>

      {/* QUIÉNES SOMOS */}
      <section className="sobre__content">
        <h2>Quiénes somos</h2>
        <p>
          EasyTrack es una solución de <strong>Blockhorn Studios OÜ</strong> (Estonia). Construimos
          herramientas modernas, privadas y escalables para pequeños y medianos negocios con
          operaciones de paquetería.
        </p>

        <div className="sobre__principles">
          <h3>Principios del producto</h3>
          <ul>
            <li><FiCheckCircle /> Privacidad y seguridad por defecto.</li>
            <li><FiCheckCircle /> Experiencia cuidada en móvil y escritorio.</li>
            <li><FiCheckCircle /> Interfaz clara y sin distracciones.</li>
            <li><FiCheckCircle /> Métricas útiles para decidir, no vanity metrics.</li>
            <li><FiCheckCircle /> Soporte cercano con casos reales de tienda.</li>
          </ul>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="sobre__timeline" aria-label="Hoja de ruta">
        <h2>Hoja de ruta</h2>
        <ol className="timeline">
          <li>
            <div className="dot" />
            <div className="body">
              <h4>MVP y pilotos <span>2024–2025</span></h4>
              <p>Mapas de estantes, búsqueda rápida, importación CSV y primeras tiendas piloto.</p>
            </div>
          </li>
          <li>
            <div className="dot" />
            <div className="body">
              <h4>Roles, métricas y notificaciones <span>2025</span></h4>
              <p>Permisos por equipo, paneles por sede y avisos al cliente bajo configuración.</p>
            </div>
          </li>
          <li className="upcoming">
            <div className="dot" />
            <div className="body">
              <h4>Integraciones de hardware <span>Próximo</span></h4>
              <p>Impresoras térmicas y conectores con transportistas/ERP. ¿Necesitas una en concreto? Escríbenos.</p>
            </div>
          </li>
        </ol>
        <p className="timeline__note"><FiClock /> Las fechas son orientativas; priorizamos necesidades reales de clientes.</p>
      </section>

      {/* SEGURIDAD & CUMPLIMIENTO (orientado a valor) */}
      <section className="sobre__tech" aria-label="Seguridad y cumplimiento">
        <h2>Seguridad & cumplimiento</h2>

        {/* Beneficios claros para negocio */}
        <ul className="bullets">
          <li>Datos <strong>aislados por negocio</strong> y control de acceso por permisos.</li>
          <li>Cifrado en tránsito (HTTPS/TLS) y <strong>copias de seguridad</strong> gestionadas.</li>
          <li><strong>Exporta tus datos</strong> cuando quieras (CSV/ZIP) sin dependencias.</li>
          <li><strong>Uptime objetivo 99,9%</strong> y mantenimiento con aviso.</li>
          <li><strong>DPA</strong> (acuerdo de encargado) disponible bajo solicitud.</li>
        </ul>

        {/* Enlaces legales */}
        <ul className="sobre__legal-links">
          <li><a href="/legal/privacidad">Política de Privacidad</a></li>
          <li><a href="/legal/terminos">Términos y Condiciones</a></li>
          <li><a href="/legal/cookies">Política de Cookies</a></li>
        </ul>

        {/* Para equipos IT */}
        <details className="tech-details">
          <summary>Detalles técnicos para equipos IT</summary>
          <div className="grid-2">
            <div>
              <h4>Arquitectura</h4>
              <ul>
                <li>Aplicación web moderna con separación por negocio y mínimos privilegios.</li>
                <li>Búsqueda indexada y paginación para alto volumen.</li>
                <li>Rastreo de eventos clave para diagnóstico y auditoría básica.</li>
              </ul>
            </div>
            <div>
              <h4>Integraciones</h4>
              <ul>
                <li>Pagos con Stripe (PCI gestionado por el proveedor).</li>
                <li>Importación/Exportación CSV; webhooks/API bajo solicitud.</li>
                <li>Compatibilidad con lectores de código de barras (modo teclado).</li>
              </ul>
            </div>
          </div>
          <p className="note">
            ¿Necesitas ficha técnica o listado de subencargados? Escríbenos a
            <a href="mailto:support@easytrack.pro"> support@easytrack.pro</a>.
          </p>
        </details>
      </section>

      {/* CTA FINAL */}
      <section className="sobre__cta-final" aria-label="Llamada a la acción">
        <h2>¿Te gustaría probar EasyTrack?</h2>
        <p>Configura tus estantes en minutos. Si prefieres, te acompañamos en un onboarding guiado.</p>
        <div className="sobre__cta">
          <a href="/precios" className="sobre__btn sobre__btn--primary">Empezar ahora</a>
          <a href="/soporte#contacto" className="sobre__btn">Solicitar onboarding</a>
        </div>
      </section>
    </main>
  )
}
