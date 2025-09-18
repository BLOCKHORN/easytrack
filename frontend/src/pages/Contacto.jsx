import { FiMail, FiMessageSquare } from 'react-icons/fi'
import '../styles/Contacto.scss'

export default function Contacto() {
  const subject = encodeURIComponent('Consulta desde la web');
  const body = encodeURIComponent('Hola EasyTrack, necesito ayuda con ...');
  const mailto = `mailto:support@easytrack.pro?subject=${subject}&body=${body}`;

  return (
    <main className="contacto">
      <header className="contacto__hero">
        <h1>Contacto</h1>
        <p>Te respondemos en horario laboral con la máxima rapidez posible.</p>
      </header>

      <section className="contacto__cards">
        <article className="contacto__card">
          <div className="ico"><FiMail /></div>
          <h3>Soporte</h3>
          <p>Incidencias técnicas, dudas de uso y facturación.</p>
          <a className="btn" href={mailto}>Abrir correo</a>
        </article>

        <article className="contacto__card">
          <div className="ico alt"><FiMessageSquare /></div>
          <h3>Centro de ayuda</h3>
          <p>Consulta guías y procedimientos rápidos.</p>
          <a className="btn ghost" href="/soporte#faq">Ir al FAQ</a>
        </article>
      </section>
    </main>
  )
}
