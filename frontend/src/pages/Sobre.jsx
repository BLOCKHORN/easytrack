// src/pages/Sobre.jsx
import {
  FiTarget, FiShield, FiTrendingUp, FiZap, FiDatabase, FiUsers,
  FiCheckCircle, FiClock, FiLayers, FiArrowRight
} from 'react-icons/fi'
import '../styles/Sobre.scss'

/** Datos públicos opcionales para SEO estructurado (omitimos claves vacías) */
const ORG = {
  name: 'EasyTrack',
  url: 'https://easytrack.pro',
  logo: '', // p.ej. 'https://easytrack.pro/brand/logo.png'
  sameAs: [ /* p.ej. 'https://www.linkedin.com/company/…', 'https://twitter.com/…' */ ],
  parent: 'Blockhorn Studios OÜ'
}

function buildJsonLd() {
  const base = { '@context': 'https://schema.org', '@type': 'Organization', name: ORG.name, url: ORG.url }
  if (ORG.logo) base.logo = ORG.logo
  if (ORG.sameAs?.length) base.sameAs = ORG.sameAs
  if (ORG.parent) base.parentOrganization = { '@type': 'Organization', name: ORG.parent }
  return base
}

export default function Sobre() {
  const jsonLd = buildJsonLd()

  return (
    <main className="sobre" role="main">
      {/* SEO microdata */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <header className="sobre__hero">
        <div className="sobre__hero-shell">
          <h1>Sobre {ORG.name}</h1>
          <p className="sobre__lead">
            SaaS para puntos de paquetería. Diseña tu almacén, controla entradas y entregas
            y obtén métricas claras por negocio y sede.
          </p>
          <div className="sobre__cta">
            {/* <a href="/precios" className="sobre__btn sobre__btn--primary">Ver precios <FiArrowRight /></a> */}
            <a href="/soporte#contacto" className="sobre__btn">Habla con nosotros</a>
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
          <p>Gestionar volumen diario con orden, rapidez y cero fricción.</p>
        </article>
        <article className="sobre__card">
          <div className="sobre__icon"><FiShield /></div>
          <h3>Seguridad primero</h3>
          <p>Separación por negocio, control de permisos y cifrado en tránsito.</p>
        </article>
        <article className="sobre__card">
          <div className="sobre__icon"><FiTrendingUp /></div>
          <h3>Escala y rendimiento</h3>
          <p>Búsqueda indexada y UI ágil para alto volumen.</p>
        </article>
        <article className="sobre__card">
          <div className="sobre__icon"><FiZap /></div>
          <h3>Rapidez operativa</h3>
          <p>Atajos de teclado y compatibilidad con escáner (modo teclado).</p>
        </article>
        <article className="sobre__card">
          <div className="sobre__icon"><FiUsers /></div>
          <h3>Hecho para equipos</h3>
          <p>Roles, actividad y métricas por sede.</p>
        </article>
        <article className="sobre__card">
          <div className="sobre__icon"><FiLayers /></div>
          <h3>Integrable</h3>
          <p>Import/Export CSV y conectores bajo solicitud.</p>
        </article>
      </section>

      {/* STATS */}
      <section className="sobre__stats" aria-label="Métricas y objetivos">
        <div className="sobre__stat"><span className="kpi">~5&nbsp;min</span><span className="cap">Onboarding medio</span></div>
        <div className="sobre__stat"><span className="kpi">99,9%</span><span className="cap">Objetivo de disponibilidad</span></div>
        <div className="sobre__stat"><span className="kpi">2–3×</span><span className="cap">Más rápido que inventario manual</span></div>
        <div className="sobre__stat"><span className="kpi">Multi-sede</span><span className="cap">Negocios con varias ubicaciones</span></div>
      </section>

      {/* QUIÉNES SOMOS */}
      <section className="sobre__content">
        <h2>Quiénes somos</h2>
        <p>
          {ORG.name} es una solución de <strong>{ORG.parent || 'nuestro equipo'}</strong>. Creamos herramientas
          modernas y privadas para negocios con operaciones de paquetería.
        </p>

        <div className="sobre__principles">
          <h3>Principios del producto</h3>
          <ul>
            <li><FiCheckCircle /> Privacidad y seguridad por defecto.</li>
            <li><FiCheckCircle /> Experiencia cuidada en móvil y escritorio.</li>
            <li><FiCheckCircle /> Interfaz clara y sin distracciones.</li>
            <li><FiCheckCircle /> Métricas útiles para decidir, no “vanity metrics”.</li>
            <li><FiCheckCircle /> Soporte cercano con casos reales.</li>
          </ul>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="sobre__timeline" aria-label="Hoja de ruta">
        <h2>Hoja de ruta</h2>
        <ol className="timeline">
          <li>
            <div className="dot" /><div className="body">
              <h4>MVP y pilotos <span>2024–2025</span></h4>
              <p>Mapa de estantes, búsqueda rápida, importación CSV y primeras tiendas piloto.</p>
            </div>
          </li>
          <li>
            <div className="dot" /><div className="body">
              <h4>Roles, métricas y notificaciones <span>2025</span></h4>
              <p>Permisos por equipo, paneles por sede y avisos bajo configuración.</p>
            </div>
          </li>
          <li className="upcoming">
            <div className="dot" /><div className="body">
              <h4>Integraciones de hardware <span>Próximo</span></h4>
              <p>Impresoras térmicas y conectores con transportistas/ERP.</p>
            </div>
          </li>
        </ol>
        <p className="timeline__note"><FiClock /> Fechas orientativas; priorizamos necesidades reales.</p>
      </section>

      {/* SEGURIDAD */}
      <section className="sobre__tech" aria-label="Seguridad y cumplimiento">
        <h2>Seguridad & cumplimiento</h2>
        <ul className="bullets">
          <li>Datos <strong>aislados por negocio</strong> y control de permisos.</li>
          <li>Cifrado en tránsito (HTTPS/TLS) y <strong>copias de seguridad</strong> gestionadas.</li>
          <li><strong>Exporta tus datos</strong> en CSV/ZIP cuando quieras.</li>
          <li><strong>Uptime objetivo 99,9%</strong> y mantenimiento con aviso.</li>
          <li><strong>DPA</strong> disponible bajo solicitud.</li>
        </ul>

        <ul className="sobre__legal-links">
          <li><a href="/legal/privacidad">Política de Privacidad</a></li>
          <li><a href="/legal/terminos">Términos y Condiciones</a></li>
          <li><a href="/legal/cookies">Política de Cookies</a></li>
        </ul>

        <details className="tech-details">
          <summary>Detalles técnicos para equipos IT</summary>
          <div className="grid-2">
            <div>
              <h4>Arquitectura</h4>
              <ul>
                <li>Separación por negocio (principio de mínimo privilegio).</li>
                <li>Búsqueda indexada y paginación.</li>
                <li>Registro de eventos clave para diagnóstico.</li>
              </ul>
            </div>
            <div>
              <h4>Integraciones</h4>
              <ul>
                <li>Pagos con Stripe (PCI gestionado por el proveedor).</li>
                <li>Importación/Exportación CSV; webhooks/API bajo solicitud.</li>
                <li>Compatibilidad con lectores de código de barras.</li>
              </ul>
            </div>
          </div>
          <p className="note">Ficha técnica o subencargados: <a href="mailto:info@easytrack.pro">info@easytrack.pro</a>.</p>
        </details>
      </section>

      {/* CTA FINAL */}
      <section className="sobre__cta-final" aria-label="Llamada a la acción">
        <h2>¿Te gustaría probar {ORG.name}?</h2>
        <p>Configura tus estantes en minutos. Podemos acompañarte en un onboarding guiado.</p>
        <div className="sobre__cta">
          {/* <a href="/precios" className="sobre__btn sobre__btn--primary">Empezar ahora</a> */}
          <a href="/soporte#contacto" className="sobre__btn">Solicitar onboarding</a>
        </div>
      </section>
    </main>
  )
}
