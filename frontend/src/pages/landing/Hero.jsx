import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  FaClipboardCheck,
  FaWhatsapp,
  FaCubes
} from 'react-icons/fa'
import HeroIllustration from '../../assets/hero-illustration.svg'
import Trustbar from './Trustbar'
import DemoModal from '../../components/DemoModal'
import './Hero.scss'

export default function Hero({ onPrimaryCta }) {
  const navigate = useNavigate()
  const [demoOpen, setDemoOpen] = useState(false)

  const startNow = () => {
    try { if (typeof onPrimaryCta === 'function') onPrimaryCta() } catch {}
    navigate('/precios')
  }

  // 👉 Cuando tengas el vídeo, pon aquí la ruta o impórtalo
  // import demoMp4 from '../../assets/demo.mp4'
  const DEMO_VIDEO = '' // p.ej. '/videos/easytrack-demo.mp4'

  return (
    <header className="hero hero--center" role="banner" aria-labelledby="hero-title">
      {/* Fondo decorativo */}
      <div className="hero__bg" aria-hidden="true">
        <div className="bg__beam" />
        <div className="bg__glow bg__glow--1" />
        <div className="bg__glow bg__glow--2" />
        <div className="bg__grid" />
      </div>

      <div className="hero__inner">
        <p className="eyebrow">Software para puntos de recogida</p>

        {/* SEO: categoría + segmento en H1 */}
        <h1 id="hero-title" className="headline">
          <span className="line line--gradient">Software de gestión de paquetería</span>
          <span className="line">para puntos de recogida (PUDO)</span>
        </h1>

        {/* SEO: long-tails clave */}
        <p className="subheadline">
          Ubica por balda/estante, avisa por WhatsApp y entrega con justificante.
          Conciliación con transportistas sin Excel. <strong>30 días de prueba incluidos.</strong>
        </p>

        {/* CTAs en columna */}
        <div className="cta-col" role="group" aria-label="Acciones principales">
          <button className="btn btn--primary" onClick={startNow}>
            Empezar gratis 30 días
          </button>
          <button className="btn btn--ghost" onClick={() => setDemoOpen(true)}>
            Ver demo
          </button>
        </div>

        {/* Badges (beneficios con intención de búsqueda) */}
        <ul className="bullets" aria-label="Ventajas principales">
          <li><FaClipboardCheck aria-hidden="true" /> Conciliación con transportistas</li>
          <li><FaCubes aria-hidden="true" /> Ubicación por balda / estante</li>
          <li><FaWhatsapp aria-hidden="true" /> Notificaciones por WhatsApp</li>
        </ul>

        {/* Ornamento SVG compacto (va entre badges y trustbar) */}
        <div className="hero__artblock" aria-hidden="true">
          <div className="artblock__halo" />
          <img
            src={HeroIllustration}
            alt=""
            className="artblock__img"
            draggable="false"
          />
        </div>

        {/* Trustbar */}
        <div className="hero__trustbar">
          <Trustbar />
        </div>
      </div>

      {/* Modal de demo (reutilizable) */}
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} videoSrc={DEMO_VIDEO} />
    </header>
  )
}
