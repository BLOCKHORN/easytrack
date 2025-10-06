// src/pages/Contacto.jsx
import { FiMail, FiMessageSquare } from 'react-icons/fi'
import '../styles/Contacto.scss'

/**
 * Contacto “limpio”: sin texto genérico, con foco en soporte real.
 * Horario en CET/CEST (España), coherente con tu operación.
 */
export default function Contacto() {
  const subject = encodeURIComponent('Consulta de soporte desde la web')
  const body = encodeURIComponent(
    [
      'Hola EasyTrack,',
      '',
      'Cuéntanos el caso (qué esperabas que ocurriera, qué ocurrió y pasos para reproducir):',
      '—',
      '',
      'Datos útiles (opcional):',
      '• Negocio/Sede:',
      '• Navegador/SO:',
      '• Código de paquete (si aplica):',
    ].join('\n')
  )
  const mailto = `mailto:info@easytrack.pro?subject=${subject}&body=${body}`

  return (
    <main className="contacto" role="main">
      <header className="contacto__hero">
        <h1>Contacto</h1>
        <p>Soporte técnico y ayuda funcional. L–V 9:00–18:00 (CET/CEST).</p>
      </header>

      <section className="contacto__cards" aria-label="Vías de contacto">
        <article className="contacto__card">
          <div className="ico"><FiMail /></div>
          <h3>Soporte directo</h3>
          <p>Incidencias, dudas de uso y facturación.</p>
          <a className="btn" href={mailto}>Escribir a soporte</a>
          <small className="meta">Tiempo medio de respuesta: 1–6 h laborables</small>
        </article>

        <article className="contacto__card">
          <div className="ico alt"><FiMessageSquare /></div>
          <h3>Centro de ayuda</h3>
          <p>Guías cortas y procedimientos paso a paso.</p>
          <a className="btn ghost" href="/soporte#faq">Ver FAQ</a>
        </article>
      </section>
    </main>
  )
}
