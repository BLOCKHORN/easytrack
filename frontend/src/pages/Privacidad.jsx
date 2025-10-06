// src/pages/Privacidad.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiPrinter } from 'react-icons/fi'
import '../styles/Legal.scss'

/** ===== Datos de la entidad (rellena cuando los tengas) =====
 * Si un campo está vacío, NO se mostrará en la web.
 */
const COMPANY = {
  brand: 'EasyTrack',            // Nombre comercial visible
  legalName: '',                 // Razón social (ej.: Blockhorn Studios OÜ)
  country: '',                   // País (ej.: Estonia)
  regNo: '',                     // Nº registro mercantil
  vatNo: '',                     // NIF/IVA (CIF/VAT)
  address: '',                   // Dirección legal
  email: 'info@easytrack.pro',   // Email de contacto general
  privacyEmail: 'info@easytrack.pro' // Email específico privacidad (puede ser el mismo)
}

/** Encargados/subencargados (ajusta si cambias de stack) */
const SUBPROCESSORS = [
  {
    name: 'Supabase',
    purpose: 'Base de datos, autenticación y Storage',
    dataScope: 'Datos de cuenta, operativa del servicio y ficheros subidos',
    region: 'UE/EEE',
    url: 'https://supabase.com'
  },
  {
    name: 'Stripe Payments Europe, Ltd.',
    purpose: 'Procesamiento de pagos y facturación',
    dataScope: 'Datos de cobro, métodos de pago y metadatos de transacción',
    region: 'UE/EEE y, en su caso, transferencias internacionales con garantías',
    url: 'https://stripe.com'
  },
  {
    name: 'Vercel / Render / Hetzner',
    purpose: 'Hosting y entrega de la plataforma',
    dataScope: 'Logs técnicos, telemetría mínima y contenidos servidos',
    region: 'UE/EEE y, en su caso, transferencias internacionales con garantías',
    url: 'https://vercel.com'
  }
]

export default function Privacidad() {
  const updated = useMemo(() => {
    return new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })
  }, [])

  const TOC = useMemo(() => ([
    { id: 'resp',      label: '1. Responsable' },
    { id: 'datos',     label: '2. Datos tratados' },
    { id: 'finalidad', label: '3. Finalidades y base jurídica' },
    { id: 'dest',      label: '4. Destinatarios (encargados)' },
    { id: 'ti',        label: '5. Transferencias internacionales' },
    { id: 'plazo',     label: '6. Plazos de conservación' },
    { id: 'derechos',  label: '7. Derechos RGPD' },
    { id: 'seg',       label: '8. Seguridad' },
    { id: 'cookies',   label: '9. Cookies' },
  ]), [])

  // Scroll-spy TOC
  const [activeId, setActiveId] = useState(TOC[0].id)
  const sectionRefs = useRef({})
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a,b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.2, 0.5, 1] }
    )
    TOC.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) { sectionRefs.current[id] = el; observer.observe(el) }
    })
    return () => observer.disconnect()
  }, [TOC])

  const handlePrint = () => window.print()

  // Render helper: línea condicional
  const Line = ({ label, value }) => {
    if (!value) return null
    return <div><strong>{label}:</strong> {value}</div>
  }

  // Texto “responsable” compacto y sin relleno
  const Responsable = () => {
    const who =
      COMPANY.legalName?.trim()
        ? `${COMPANY.legalName}${COMPANY.brand ? ` (${COMPANY.brand})` : ''}`
        : COMPANY.brand
    return (
      <>
        <p>
          Responsable del tratamiento: <strong>{who}</strong>.
        </p>
        <Line label="País" value={COMPANY.country?.trim()} />
        <Line label="Registro mercantil" value={COMPANY.regNo?.trim()} />
        <Line label="N.º IVA" value={COMPANY.vatNo?.trim()} />
        <Line label="Domicilio" value={COMPANY.address?.trim()} />
        <div>
          <strong>Contacto de privacidad:</strong>{' '}
          <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>
        </div>
      </>
    )
  }

  return (
    <main className="legal" role="main">
      <div className="legal__shell">
        {/* Índice */}
        <aside className="legal__card legal__toc" aria-label="Índice de contenidos">
          <div className="legal__toc-head">
            <h3>Contenido</h3>
            <button className="legal__print" onClick={handlePrint} aria-label="Imprimir o guardar como PDF">
              <FiPrinter /> <span>Imprimir</span>
            </button>
          </div>
          <nav>
            <ul>
              {TOC.map(item => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={activeId === item.id ? 'is-active' : undefined}
                    aria-current={activeId === item.id ? 'true' : 'false'}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Contenido */}
        <article className="legal__card legal__content">
          <header className="legal__head">
            <p className="legal__kicker">Legal · Protección de datos</p>
            <h1 className="legal__title">Política de Privacidad de {COMPANY.brand || 'la plataforma'}</h1>
            <p className="legal__meta">Última actualización: {updated}</p>
          </header>

          <section id="resp" className="legal__section" aria-labelledby="h-resp">
            <h2 id="h-resp">1. Responsable</h2>
            <Responsable />
          </section>

          <section id="datos" className="legal__section" aria-labelledby="h-datos">
            <h2 id="h-datos">2. Datos tratados</h2>
            <ul>
              <li><strong>Cuenta y tenant</strong>: email, nombre de empresa, parámetros de configuración del almacén.</li>
              <li><strong>Uso de la plataforma</strong>: registros de paquetes, entregas, búsquedas y acciones en {COMPANY.brand || 'la plataforma'}.</li>
              <li><strong>Pagos y facturación</strong>: gestionados por Stripe; no almacenamos números de tarjeta.</li>
              <li><strong>Datos técnicos</strong>: IP, agente de usuario, trazas de error y logs de acceso para seguridad y diagnóstico.</li>
              <li><strong>Soporte</strong>: mensajes y metadatos necesarios para atender solicitudes.</li>
            </ul>
            <p>No tratamos categorías especiales de datos ni tomamos decisiones automatizadas con efectos jurídicos.</p>
          </section>

          <section id="finalidad" className="legal__section" aria-labelledby="h-finalidad">
            <h2 id="h-finalidad">3. Finalidades y base jurídica</h2>
            <ul>
              <li><strong>Prestar el servicio</strong> (art. 6.1.b RGPD): alta, acceso y funcionamiento de {COMPANY.brand || 'la plataforma'}.</li>
              <li><strong>Soporte y calidad</strong> (art. 6.1.f): resolución de incidencias, prevención de abuso y mejora con telemetría mínima.</li>
              <li><strong>Facturación y cumplimiento</strong> (art. 6.1.c): emisión de facturas, contabilidad y fiscalidad.</li>
              <li><strong>Comunicaciones operativas</strong> (art. 6.1.f / 6.1.a): avisos de servicio y mantenimiento; marketing opcional solo con consentimiento.</li>
            </ul>
          </section>

          <section id="dest" className="legal__section" aria-labelledby="h-dest">
            <h2 id="h-dest">4. Destinatarios (encargados de tratamiento)</h2>
            <p>Proveedores esenciales para operar la plataforma; acceso limitado y bajo contrato de encargo:</p>
            <ul className="legal__vendors">
              {SUBPROCESSORS.map(v => (
                <li key={v.name}>
                  <strong>{v.name}</strong> — {v.purpose}. <em>Datos:</em> {v.dataScope}. <em>Ubicación:</em> {v.region}. <a href={v.url} target="_blank" rel="noreferrer">Más info</a>.
                </li>
              ))}
            </ul>
            <p>No vendemos datos a terceros. Solo comunicaremos información cuando una ley o autoridad lo exija.</p>
          </section>

          <section id="ti" className="legal__section" aria-labelledby="h-ti">
            <h2 id="h-ti">5. Transferencias internacionales</h2>
            <p>
              Si algún proveedor procesa datos fuera del EEE, aplicamos garantías reconocidas por el RGPD
              (Cláusulas Contractuales Tipo y medidas complementarias), limitando el acceso a lo imprescindible.
            </p>
          </section>

          <section id="plazo" className="legal__section" aria-labelledby="h-plazo">
            <h2 id="h-plazo">6. Plazos de conservación</h2>
            <ul>
              <li><strong>Cuenta y uso</strong>: mientras seas cliente y, tras la baja, el tiempo necesario para responsabilidades y reclamaciones.</li>
              <li><strong>Facturación</strong>: por los plazos exigidos en normativa contable y fiscal.</li>
              <li><strong>Logs técnicos</strong>: periodos acotados para seguridad, auditoría y estabilidad.</li>
            </ul>
          </section>

          <section id="derechos" className="legal__section" aria-labelledby="h-derechos">
            <h2 id="h-derechos">7. Derechos RGPD</h2>
            <p>
              Puedes ejercer acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a
              <a href={`mailto:${COMPANY.privacyEmail}`}> {COMPANY.privacyEmail}</a>. Responderemos en plazo legal.
              Si lo consideras, puedes reclamar ante la AEPD o la autoridad de control de tu país.
            </p>
          </section>

          <section id="seg" className="legal__section" aria-labelledby="h-seg">
            <h2 id="h-seg">8. Seguridad</h2>
            <ul>
              <li>Arquitectura multi-tenant con RLS y mínimo privilegio.</li>
              <li>Cifrado en tránsito (HTTPS/TLS) y backups gestionados por proveedor.</li>
              <li>Controles de acceso internos y registro de eventos relevantes.</li>
            </ul>
          </section>

          <section id="cookies" className="legal__section" aria-labelledby="h-cookies">
            <h2 id="h-cookies">9. Cookies</h2>
            <p>
              Cookies técnicas para funcionamiento y, en su caso, analíticas con tu consentimiento.
              Gestiona tus preferencias en la <a href="/legal/cookies">Política de Cookies</a>.
            </p>
          </section>

          <footer className="legal__cta">
            <a className="legal__btn" href="/">Volver a inicio</a>
            <a className="legal__btn legal__btn--primary" href="/legal/terminos">Ver términos</a>
          </footer>
        </article>
      </div>
    </main>
  )
}
