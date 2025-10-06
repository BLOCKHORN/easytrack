// src/pages/Terminos.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiPrinter } from 'react-icons/fi'
import '../styles/Legal.scss'

/** ===== Datos de la entidad (rellénalos cuando los tengas)
 *  Cualquier campo vacío NO se muestra en la página.
 */
const COMPANY = {
  brand: 'EasyTrack',          // Nombre comercial visible
  legalName: '',               // Razón social (ej. Blockhorn Studios OÜ)
  country: '',                 // País de establecimiento (ej. Estonia)
  regNo: '',                   // Nº de registro mercantil
  vatNo: '',                   // NIF/IVA (CIF/VAT)
  address: '',                 // Domicilio social
  email: 'info@easytrack.pro'  // Email de contacto
}

export default function Terminos() {
  const updated = useMemo(
    () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
    []
  )

  const TOC = useMemo(() => ([
    { id: 'id',      label: '1. Identificación' },
    { id: 'objeto',  label: '2. Objeto' },
    { id: 'cuenta',  label: '3. Cuenta y registro' },
    { id: 'uso',     label: '4. Uso permitido' },
    { id: 'precios', label: '5. Precios, pagos y cancelación' },
    { id: 'pi',      label: '6. Propiedad intelectual' },
    { id: 'resp',    label: '7. Responsabilidad' },
    { id: 'datos',   label: '8. Datos personales' },
    { id: 'mods',    label: '9. Cambios en el servicio y en los términos' },
    { id: 'ley',     label: '10. Ley aplicable y jurisdicción' },
  ]), [])

  // Scroll-spy
  const [activeId, setActiveId] = useState(TOC[0].id)
  const sectionRefs = useRef({})
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const v = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (v[0]) setActiveId(v[0].target.id)
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, .25, .5, 1] }
    )
    TOC.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) { sectionRefs.current[id] = el; obs.observe(el) }
    })
    return () => obs.disconnect()
  }, [TOC])

  const handlePrint = () => window.print()

  // Helper visual para líneas condicionales
  const Line = ({ label, value }) => (value ? <div><strong>{label}:</strong> {value}</div> : null)

  // Bloque de identificación sin “rellenos”
  const Identificacion = () => {
    const who =
      COMPANY.legalName?.trim()
        ? `${COMPANY.legalName}${COMPANY.brand ? ` (${COMPANY.brand})` : ''}`
        : (COMPANY.brand || 'La plataforma')
    return (
      <>
        <p><strong>{who}</strong> opera el servicio {COMPANY.brand || ''}.</p>
        <Line label="País de establecimiento" value={COMPANY.country?.trim()} />
        <Line label="Registro mercantil" value={COMPANY.regNo?.trim()} />
        <Line label="N.º IVA" value={COMPANY.vatNo?.trim()} />
        <Line label="Domicilio" value={COMPANY.address?.trim()} />
        <div>
          <strong>Contacto:</strong> <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </div>
      </>
    )
  }

  return (
    <main className="legal" role="main">
      <div className="legal__shell">
        {/* TOC */}
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
            <p className="legal__kicker">Legal · Términos</p>
            <h1 className="legal__title">Términos y Condiciones de {COMPANY.brand || 'la plataforma'}</h1>
            <p className="legal__meta">Última actualización: {updated}</p>
          </header>

          <section id="id" className="legal__section" aria-labelledby="h-id">
            <h2 id="h-id">1. Identificación</h2>
            <Identificacion />
          </section>

          <section id="objeto" className="legal__section" aria-labelledby="h-objeto">
            <h2 id="h-objeto">2. Objeto</h2>
            <p>
              Estos términos regulan el acceso y uso de {COMPANY.brand || 'la plataforma'} por parte de clientes y
              usuarios autorizados, así como la relación contractual derivada del alta y la suscripción.
            </p>
          </section>

          <section id="cuenta" className="legal__section" aria-labelledby="h-cuenta">
            <h2 id="h-cuenta">3. Cuenta y registro</h2>
            <ul>
              <li>Debes facilitar información veraz y mantenerla actualizada.</li>
              <li>Eres responsable de custodiar credenciales y de la actividad de tus usuarios internos.</li>
              <li>Podremos suspender o cancelar el acceso ante incumplimientos graves, fraude o riesgos de seguridad.</li>
            </ul>
          </section>

          <section id="uso" className="legal__section" aria-labelledby="h-uso">
            <h2 id="h-uso">4. Uso permitido</h2>
            <ul>
              <li>Prohibido el uso ilícito, la alteración de medidas de seguridad y la denegación de servicio.</li>
              <li>No se permite ingeniería inversa, scraping masivo o extracción automatizada sin autorización escrita.</li>
              <li>Debes respetar la normativa aplicable y los derechos de terceros.</li>
            </ul>
          </section>

          <section id="precios" className="legal__section" aria-labelledby="h-precios">
            <h2 id="h-precios">5. Precios, pagos y cancelación</h2>
            <ul>
              <li>La suscripción se cobra de forma periódica a través de Stripe (mensual/anual según el plan).</li>
              <li>Los cambios de plan podrán prorratearse cuando proceda. Puedes cancelar en cualquier momento; el acceso continúa hasta el fin del período ya abonado.</li>
              <li>Impuestos y retenciones se calculan en el checkout según tu jurisdicción.</li>
              <li>Salvo obligación legal, no se emiten devoluciones por periodos ya iniciados.</li>
              <li>Podemos ajustar precios o planes con aviso previo razonable y opción de cancelación antes de su efectividad.</li>
            </ul>
          </section>

          <section id="pi" className="legal__section" aria-labelledby="h-pi">
            <h2 id="h-pi">6. Propiedad intelectual</h2>
            <p>
              El software, la marca y los materiales de {COMPANY.brand || 'la plataforma'} pertenecen a sus titulares.
              No se concede ningún derecho salvo los necesarios para usar el servicio conforme a estos términos.
            </p>
            <p>
              El contenido que subas es tuyo. Nos concedes una licencia no exclusiva, mundial y revocable para alojarlo y
              operarlo dentro del servicio, únicamente con la finalidad de prestarte {COMPANY.brand || 'la plataforma'}.
            </p>
          </section>

          <section id="resp" className="legal__section" aria-labelledby="h-resp">
            <h2 id="h-resp">7. Responsabilidad</h2>
            <p>
              El servicio se presta “tal cual”. En la máxima medida permitida: (i) no respondemos de daños indirectos
              o emergentes (lucro cesante, pérdida de datos); y (ii) la responsabilidad total agregada se limita a las
              tarifas efectivamente pagadas por ti en los 12 meses anteriores al incidente.
            </p>
            <p>Podemos realizar mantenimiento con aviso razonable. No respondemos por fallos imputables a terceros o fuerza mayor.</p>
          </section>

          <section id="datos" className="legal__section" aria-labelledby="h-datos">
            <h2 id="h-datos">8. Datos personales</h2>
            <p>
              El tratamiento de datos se rige por la <a href="/legal/privacidad">Política de Privacidad</a>.
              Actuamos con proveedores como encargados de tratamiento bajo garantías adecuadas.
            </p>
          </section>

          <section id="mods" className="legal__section" aria-labelledby="h-mods">
            <h2 id="h-mods">9. Cambios en el servicio y en los términos</h2>
            <p>
              Podremos actualizar funcionalidades, suspender elementos obsoletos y modificar estos términos por razones
              legales, técnicas u operativas. Si el cambio es sustancial, lo comunicaremos con antelación razonable.
            </p>
          </section>

          <section id="ley" className="legal__section" aria-labelledby="h-ley">
            <h2 id="h-ley">10. Ley aplicable y jurisdicción</h2>
            <p>
              La relación contractual se rige por la legislación aplicable en el lugar de establecimiento del responsable
              (si lo has indicado) {COMPANY.country ? `(${COMPANY.country})` : ''}. Las controversias se someterán a los
              tribunales competentes, sin perjuicio de normas imperativas de protección de consumidores que resulten de aplicación.
            </p>
          </section>

          <footer className="legal__cta">
            <a className="legal__btn" href="/">Volver a inicio</a>
            <a className="legal__btn legal__btn--primary" href="/legal/privacidad">Ver privacidad</a>
          </footer>
        </article>
      </div>
    </main>
  )
}
