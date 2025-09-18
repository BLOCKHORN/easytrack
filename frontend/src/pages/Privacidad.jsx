import { useEffect, useMemo, useRef, useState } from 'react'
import { FiPrinter } from 'react-icons/fi'
import '../styles/Legal.scss'

export default function Privacidad() {
  const updated = useMemo(() => {
    // Fecha legible en español (p. ej., "6 de septiembre de 2025")
    return new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })
  }, [])

  // Definición del índice (id debe coincidir con la sección)
  const TOC = useMemo(() => ([
    { id: 'resp',      label: '1. Responsable' },
    { id: 'datos',     label: '2. Datos tratados' },
    { id: 'finalidad', label: '3. Finalidades y base legal' },
    { id: 'dest',      label: '4. Destinatarios (encargados)' },
    { id: 'ti',        label: '5. Transferencias internacionales' },
    { id: 'plazo',     label: '6. Conservación' },
    { id: 'derechos',  label: '7. Derechos (RGPD)' },
    { id: 'seg',       label: '8. Seguridad' },
    { id: 'cookies',   label: '9. Cookies' },
  ]), [])

  // Scroll-spy
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

  return (
    <main className="legal" role="main">
      <div className="legal__shell">
        {/* TOC lateral / superior (responsive) */}
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
            <h1 className="legal__title">Política de Privacidad de EasyTrack</h1>
            <p className="legal__meta">Última actualización: {updated}</p>
          </header>

          <section id="resp" className="legal__section">
            <h2>1. Responsable</h2>
            <p>
              Responsable del tratamiento: <strong>Blockhorn Studios OÜ</strong> (EasyTrack).
              Contacto de privacidad/soporte: <a href="mailto:support@easytrack.pro">support@easytrack.pro</a>.
            </p>
            <p className="legal__note">
              Este documento es orientativo. Adáptalo con tu asesoría legal para reflejar tu razón social,
              datos registrales y dirección completos.
            </p>
          </section>

          <section id="datos" className="legal__section">
            <h2>2. Datos que tratamos</h2>
            <ul>
              <li><strong>Cuenta y negocio</strong>: email, nombre de empresa, configuración del almacén.</li>
              <li><strong>Operativa</strong>: paquetes, entregas, búsquedas y eventos técnicos (para mejorar el servicio).</li>
              <li><strong>Pago y facturación</strong>: gestionado por Stripe (no almacenamos tarjetas en nuestros servidores).</li>
              <li><strong>Datos técnicos</strong>: IP, dispositivo/navegador, logs de acceso (seguridad y prevención de abuso).</li>
              <li><strong>Soporte</strong>: mensajes de contacto y metadatos asociados.</li>
            </ul>
            <p>No tratamos categorías especiales de datos ni realizamos perfiles con efectos legales para el usuario.</p>
          </section>

          <section id="finalidad" className="legal__section">
            <h2>3. Finalidades y base legal</h2>
            <ul>
              <li><strong>Prestación del servicio</strong> (ejecución de contrato): alta, acceso y uso de EasyTrack.</li>
              <li><strong>Soporte y mejoras</strong> (interés legítimo): atención a incidencias, telemetría mínima, QA.</li>
              <li><strong>Facturación y cumplimiento</strong> (obligación legal): emisión de facturas, contabilidad.</li>
              <li><strong>Comunicaciones informativas</strong> (interés legítimo/consentimiento): cambios relevantes, mantenimiento.</li>
              <li><strong>Marketing voluntario</strong> (consentimiento): newsletters (si te suscribes). Podrás darte de baja en cualquier momento.</li>
            </ul>
          </section>

          <section id="dest" className="legal__section">
            <h2>4. Destinatarios (encargados/subencargados)</h2>
            <p>
              Utilizamos proveedores necesarios para operar el servicio (por ejemplo, Supabase para base de datos/Storage,
              Stripe para pagos, y proveedores de hosting como Vercel/Render/Hetzner). Todos actúan como encargados con
              acuerdos de tratamiento adecuados y solo acceden a los datos imprescindibles.
            </p>
            <p>
              No vendemos datos a terceros. Podemos compartir información si es requerido por ley o autoridad competente.
            </p>
          </section>

          <section id="ti" className="legal__section">
            <h2>5. Transferencias internacionales</h2>
            <p>
              Cuando un proveedor esté fuera del EEE, exigimos garantías adecuadas (p. ej., cláusulas contractuales tipo,
              equivalencia o mecanismos reconocidos por el RGPD). Detalle disponible bajo solicitud.
            </p>
          </section>

          <section id="plazo" className="legal__section">
            <h2>6. Conservación</h2>
            <ul>
              <li><strong>Cuenta/operativa</strong>: mientras mantengas tu suscripción y por los plazos de prescripción aplicables.</li>
              <li><strong>Facturación</strong>: según normativa fiscal/contable vigente.</li>
              <li><strong>Logs de acceso</strong>: períodos acotados para seguridad y auditoría.</li>
            </ul>
          </section>

          <section id="derechos" className="legal__section">
            <h2>7. Derechos (RGPD)</h2>
            <p>
              Puedes ejercer acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a
              <a href="mailto:support@easytrack.pro"> support@easytrack.pro</a>. Responderemos en los plazos legales.
              Si no quedaras conforme, puedes reclamar ante la autoridad de control competente (p. ej., AEPD o la
              <em> Estonian Data Protection Inspectorate</em>).
            </p>
          </section>

          <section id="seg" className="legal__section">
            <h2>8. Seguridad</h2>
            <ul>
              <li>Separación multi-tenant con políticas RLS y mínimos privilegios.</li>
              <li>Cifrado en tránsito (HTTPS/TLS) y copias de seguridad gestionadas por el proveedor.</li>
              <li>Controles internos de acceso y registro de eventos relevantes.</li>
            </ul>
          </section>

          <section id="cookies" className="legal__section">
            <h2>9. Cookies</h2>
            <p>
              Utilizamos cookies/técnicas para el funcionamiento de la plataforma y, si corresponde, analíticas con tu consentimiento.
              Consulta la <a href="/legal/cookies">Política de Cookies</a> para más detalle y para administrar preferencias.
            </p>
            <p className="legal__note">
              Si integras Analytics/Tag Manager, asegúrate de mostrar un banner de consentimiento con opción de configuración.
            </p>
          </section>

          <div className="legal__cta">
            <a className="legal__btn" href="/">Volver a inicio</a>
            <a className="legal__btn legal__btn--primary" href="/legal/terminos">Ver términos</a>
          </div>
        </article>
      </div>
    </main>
  )
}
