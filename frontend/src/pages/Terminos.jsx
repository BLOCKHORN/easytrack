import { useEffect, useMemo, useRef, useState } from 'react'
import { FiPrinter } from 'react-icons/fi'
import '../styles/Legal.scss'

export default function Terminos() {
  const updated = useMemo(
    () => new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' }),
    []
  )

  const TOC = useMemo(() => ([
    { id: 'id',      label: '1. Identificación' },
    { id: 'objeto',  label: '2. Objeto' },
    { id: 'cuenta',  label: '3. Cuenta y registro' },
    { id: 'uso',     label: '4. Uso permitido' },
    { id: 'precios', label: '5. Precios y cancelación' },
    { id: 'pi',      label: '6. Propiedad intelectual' },
    { id: 'resp',    label: '7. Responsabilidad' },
    { id: 'datos',   label: '8. Datos personales' },
    { id: 'mods',    label: '9. Modificaciones' },
    { id: 'ley',     label: '10. Ley aplicable' },
  ]), [])

  // Scroll-spy
  const [activeId, setActiveId] = useState(TOC[0].id)
  const sectionRefs = useRef({})
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const v = entries.filter(e => e.isIntersecting)
                         .sort((a,b) => b.intersectionRatio - a.intersectionRatio)
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
            <h1 className="legal__title">Términos y Condiciones de EasyTrack</h1>
            <p className="legal__meta">Última actualización: {updated}</p>
          </header>

          <section id="id" className="legal__section">
            <h2>1. Identificación</h2>
            <p>
              EasyTrack es un servicio SaaS operado por <strong>[Tu sociedad]</strong>, NIF/CIF <strong>[XXX]</strong>,
              domicilio <strong>[Dirección]</strong>. Contacto: <a href="mailto:support@easytrack.pro">support@easytrack.pro</a>.
            </p>
            <p className="legal__note">Sustituye los corchetes por tus datos registrales reales.</p>
          </section>

          <section id="objeto" className="legal__section">
            <h2>2. Objeto</h2>
            <p>Estos términos regulan el acceso y uso de EasyTrack por parte de clientes y usuarios autorizados.</p>
          </section>

          <section id="cuenta" className="legal__section">
            <h2>3. Cuenta y registro</h2>
            <ul>
              <li>Debes aportar información veraz y mantenerla actualizada.</li>
              <li>Eres responsable de las credenciales y de la actividad realizada por tu equipo.</li>
              <li>Podemos suspender cuentas por uso fraudulento o incumplimientos graves.</li>
            </ul>
          </section>

          <section id="uso" className="legal__section">
            <h2>4. Uso permitido</h2>
            <ul>
              <li>Prohibido el uso ilícito, la alteración de la seguridad o la denegación de servicio.</li>
              <li>No está permitida la ingeniería inversa, scraping masivo o extracción automatizada salvo permiso escrito.</li>
              <li>Debes respetar las leyes aplicables y los derechos de terceros.</li>
            </ul>
          </section>

          <section id="precios" className="legal__section">
            <h2>5. Precios, pagos y cancelación</h2>
            <ul>
              <li>La suscripción se cobra de forma periódica (p. ej., mensual/anual) a través de Stripe.</li>
              <li>Los cambios de plan se prorratean cuando corresponde. Puedes cancelar en cualquier momento desde el panel; el acceso continúa hasta el fin del período abonado.</li>
              <li>Los impuestos aplicables se muestran en el checkout según tu país.</li>
              <li>Salvo disposición legal, no hay devoluciones por períodos ya iniciados.</li>
            </ul>
          </section>

          <section id="pi" className="legal__section">
            <h2>6. Propiedad intelectual</h2>
            <p>El software, la marca y los materiales de EasyTrack pertenecen a sus titulares. No se concede ningún derecho salvo los necesarios para usar el servicio según estos términos.</p>
            <p>El contenido que subas sigue siendo tuyo; nos concedes una licencia limitada para alojarlo y operarlo dentro del servicio.</p>
          </section>

          <section id="resp" className="legal__section">
            <h2>7. Responsabilidad</h2>
            <p>
              EasyTrack se presta “tal cual”. En la máxima medida legal: (i) no respondemos por daños indirectos
              (lucro cesante, pérdida de datos); y (ii) la responsabilidad total agregada no superará las tarifas
              satisfechas por ti en los 12 meses anteriores al incidente.
            </p>
            <p>Podemos programar mantenimiento con aviso razonable. No somos responsables de fallos imputables a terceros o fuerza mayor.</p>
          </section>

          <section id="datos" className="legal__section">
            <h2>8. Datos personales</h2>
            <p>
              El tratamiento de datos se detalla en la <a href="/legal/privacidad">Política de Privacidad</a>.
              Usamos proveedores como Stripe o servidores cloud como encargados de tratamiento con garantías adecuadas.
            </p>
          </section>

          <section id="mods" className="legal__section">
            <h2>9. Modificaciones</h2>
            <p>
              Podemos actualizar estos términos por motivos legales, técnicos u operativos. Si hay cambios sustanciales,
              te lo notificaremos con antelación razonable.
            </p>
          </section>

          <section id="ley" className="legal__section">
            <h2>10. Ley aplicable y jurisdicción</h2>
            <p>
              Estos términos se rigen por la legislación española. Cualquier disputa se someterá a los tribunales de
              <strong> [tu ciudad]</strong>, salvo normas imperativas en contrario.
            </p>
          </section>

          <div className="legal__cta">
            <a className="legal__btn" href="/">Volver a inicio</a>
            <a className="legal__btn legal__btn--primary" href="/legal/privacidad">Ver privacidad</a>
          </div>
        </article>
      </div>
    </main>
  )
}
