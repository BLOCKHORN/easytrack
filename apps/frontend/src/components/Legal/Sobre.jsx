import { FiTarget, FiShield, FiTrendingUp, FiZap, FiDatabase, FiUsers, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Sobre() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'EasyTrack',
    url: 'https://easytrack.pro',
    parentOrganization: { '@type': 'Organization', name: 'Blockhorn Studios OÜ' }
  };

  return (
    <main className="bg-white min-h-screen pt-28 pb-20 antialiased font-sans text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20 sm:mb-24">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#7C3AED] mb-4">
          <span>Infraestructura para Puntos de Recogida</span>
          <span>·</span>
          <span>Desarrollado en la UE</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-zinc-950 tracking-tight leading-tight text-balance mb-6">
          Devolver el control a los <span className="text-[#7C3AED]">puntos de recogida.</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 font-normal leading-relaxed max-w-2xl mx-auto text-pretty">
          EasyTrack es una plataforma de software desarrollada por <strong>Blockhorn Studios OÜ</strong> para erradicar el caos físico, las colas en mostrador y las pérdidas de tiempo en la gestión de paquetería local.
        </p>
      </div>

      {/* Grid Valores */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24 sm:mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: <FiTarget className="w-5 h-5" />, title: "Precisión Absoluta", desc: "Sustituimos la memoria del operario por coordenadas exactas de balda y estante. Cero paquetes perdidos." },
            { icon: <FiZap className="w-5 h-5" />, title: "Velocidad Operativa", desc: "Búsquedas instantáneas indexadas al milisegundo. Entregas en menos de 5 segundos por cliente." },
            { icon: <FiShield className="w-5 h-5" />, title: "Seguridad y Aislamiento", desc: "Arquitectura multi-tenant con transacciones ACID en PostgreSQL y tokens de sesión HttpOnly inmunes a XSS." },
            { icon: <FiTrendingUp className="w-5 h-5" />, title: "Escalabilidad Flexible", desc: "Adaptable tanto para un estanco familiar como para quioscos con más de 200 paquetes diarios." },
            { icon: <FiDatabase className="w-5 h-5" />, title: "Métricas Reales", desc: "Sin métricas vanidosas. Datos reales de facturación estimada por agencia, saturación y tiempos de permanencia." },
            { icon: <FiUsers className="w-5 h-5" />, title: "Soporte Directo", desc: "Equipo de ingeniería cercano. Atención directa y resolutiva sin intermediarios ni bots automáticos." }
          ].map((item, i) => (
            <div key={i} className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 hover:border-zinc-300 transition-colors">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#7C3AED] shadow-sm border border-zinc-200 mb-4">
                {item.icon}
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-600 font-normal leading-relaxed text-pretty">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Principios y Compromiso */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        <div className="space-y-6">
          <div>
            <div className="text-xs font-semibold text-[#7C3AED] mb-1">Filosofía de Producto</div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">Hacia dónde vamos</h2>
          </div>
          <p className="text-zinc-600 font-normal leading-relaxed text-pretty">
            No desarrollamos funciones superfluas. Cada iteración de EasyTrack nace del feedback directo de dependientes y autónomos que gestionan cientos de paquetes al día entre tabaco, prensa, papelería y cobros en caja.
          </p>

          <div className="space-y-4 pt-2">
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
              <div className="text-xs font-bold text-[#7C3AED] mb-1">Fase 1 · Producción 2026</div>
              <div className="font-bold text-zinc-900 text-sm mb-1">Infraestructura Core y Zero-Supabase</div>
              <p className="text-xs text-zinc-600">Base de datos dedicada PostgreSQL en Hetzner (Alemania), autenticación segura HttpOnly y control multi-agencia unificado.</p>
            </div>
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
              <div className="text-xs font-bold text-zinc-500 mb-1">Fase 2 · En Desarrollo</div>
              <div className="font-bold text-zinc-900 text-sm mb-1">Integración de Hardware de Mostrador</div>
              <p className="text-xs text-zinc-600">Soporte directo para impresoras térmicas ESC/POS, lectores de código de barras USB/Bluetooth y avisos automáticos al cliente.</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 p-8 sm:p-10 rounded-2xl text-white">
          <h3 className="text-xl sm:text-2xl font-bold mb-6 tracking-tight">Nuestros Principios Inquebrantables</h3>
          <ul className="space-y-4 text-sm">
            {[
              'Privacidad y aislamiento de datos por diseño con servidores dedicados en la UE.',
              'Interfaces rápidas e intuitivas diseñadas para operar con una sola mano en móvil.',
              'Cero venta ni cesión de bases de datos de clientes a agencias publicitarias.',
              'Mantenimientos programados fuera del horario comercial del comercio minorista.',
              'Precios transparentes y cancelación con un solo clic sin permanencias.'
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start">
                <FiCheckCircle className="text-emerald-400 w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-normal text-zinc-300 leading-snug">{text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs text-zinc-400">
              ¿Dudas técnicas o auditoría DPA?
            </div>
            <a
              href="mailto:info@easytrack.pro"
              className="inline-flex items-center gap-1.5 bg-white text-zinc-950 px-4 py-2 rounded-md font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm active:scale-[0.97]"
            >
              <span>Contactar con ingeniería</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}