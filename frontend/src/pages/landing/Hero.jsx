// frontend/src/pages/landing/Hero.jsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaClipboardCheck,
  FaCubes,
  FaSearch,
  FaBolt,
  FaChartLine,
} from "react-icons/fa";
import HeroIllustration from "../../assets/hero-illustration.svg";
import Trustbar from "./Trustbar";
import DemoModal from "../../components/DemoModal";
import useScrollMotion from "../../utils/useScrollMotion";
import "./Hero.scss";

export default function Hero({ onPrimaryCta }) {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  // Reveal + parallax en la página
  useScrollMotion({ rootMargin: "0px 0px -10% 0px", threshold: 0.15 });

  const startNow = () => {
    try {
      if (typeof onPrimaryCta === "function") onPrimaryCta();
    } catch {}
    navigate("/registro");
  };

  const DEMO_VIDEO = ""; // '/videos/easytrack-demo.mp4'

  return (
    <header className="hero hero--center" role="banner" aria-labelledby="hero-title">
      {/* Fondo decorativo */}
      <div className="hero__bg" aria-hidden="true">
        <div className="bg__beam" />
        <div className="bg__glow bg__glow--1" data-parallax data-speed="14" />
        <div className="bg__glow bg__glow--2" data-parallax data-speed="18" />
        <div className="bg__grid" />
      </div>

      <div className="hero__inner">
        <p className="eyebrow" data-reveal="fade-down" data-duration="600">
          La solución para pickups y puntos de recogida.
        </p>

        {/* SEO: categoría + segmento en H1 */}
        <h1 id="hero-title" className="headline" aria-describedby="hero-sub">
          <span
            className="line line--gradient"
            data-reveal="fade-up"
            data-delay="0"
          >
            Mas volumen de paquetes
          </span>
          <span className="line" data-reveal="fade-up" data-delay="80">
            en menos tiempo
          </span>
        </h1>

        {/* Mensaje claro de beneficios */}
        <p
          id="hero-sub"
          className="subheadline"
          data-reveal="fade-up"
          data-delay="140"
        >
          Ubica por <b>busca y entrega</b>, 
          <strong> sin complicaciones.</strong>
        </p>

        {/* CTA principal */}
        <div
          className="cta-col"
          role="group"
          aria-label="Acciones principales"
          data-reveal="fade-up"
          data-delay="220"
        >
          <button className="btn btn--primary btn--xl" onClick={startNow}>
            Empieza ahora!
          </button>
          <button
            className="btn btn--ghost btn--xl"
            onClick={() => setDemoOpen(true)}
          >
            Ver demo
          </button>
        </div>

        {/* Beneficios rápidos */}
        <ul
          className="bullets"
          aria-label="Ventajas principales"
          data-reveal="stagger-up"
          data-stagger="90"
        >
          <li data-reveal-child>
            <FaCubes aria-hidden="true" /> Ubicación por balda / estante
          </li>
          <li data-reveal-child>
            <FaClipboardCheck aria-hidden="true" /> Entrega con verificación
            básica
          </li>
          <li data-reveal-child>
            <FaSearch aria-hidden="true" /> Búsqueda instantánea de paquetes
          </li>
        </ul>


        <p
          className="hero__disclaimer"
          data-reveal="fade-up"
          data-delay="80"
          data-duration="600"
        >
          Pensado para tu negocio
        </p>

        {/* Ornamento SVG */}
        <div
          className="hero__artblock"
          aria-hidden="true"
          data-reveal="scale-in"
          data-delay="140"
        >
          <div className="artblock__halo" />
          <img
            src={HeroIllustration}
            alt=""
            className="artblock__img"
            draggable="false"
            data-parallax
            data-speed="20"
          />
        </div>

        {/* Trustbar */}
        <div className="hero__trustbar" data-reveal="fade-up" data-delay="120">
          <Trustbar />
        </div>
      </div>

      {/* Modal de demo */}
      <DemoModal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        videoSrc={DEMO_VIDEO}
      />
    </header>
  );
}
