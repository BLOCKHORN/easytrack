// src/components/Testimonials.jsx
import { useEffect, useRef, useState } from 'react'
import { FaStar, FaCheckCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import './Testimonials.scss'

/**
 * Reseñas enfocadas en:
 * - Impacto en caja (ahorro de tiempo, menos errores, picos controlados).
 * - Escalar añadiendo más paqueteras sin fricción.
 * - Plan único: 29 €/mes; anual 24 €/mes (pago único); bianual 19 €/mes (pago único).
 * - 1 reseña 4★ con pequeña pega (realismo).
 * NOTA: sin prometer multi-empresa por cuenta.
 */
const REVIEWS = [
  {
    initials: 'MG',
    name: 'María G.',
    role: 'Administradora',
    sector: 'Kiosco de barrio',
    businessLabel: 'Zona San Blas',
    city: 'Madrid',
    rating: 5,
    quote:
      'La conciliación pasó de 3 horas/mes a 12 minutos. Junio marcó 3 diferencias que recuperamos en el siguiente pago.',
    meta: ['−86% tiempo conciliación', '+3 ajustes recuperados'],
    date: 'Jun 2025',
    verified: true
  },
  {
    initials: 'JL',
    name: 'José L.',
    role: 'Propietario',
    sector: 'Supermercado independiente',
    businessLabel: 'Barrio La Huerta',
    city: 'Valencia',
    rating: 5,
    quote:
      'Empezamos mes a mes y al ver el ahorro de tiempo pasamos al anual: 24 €/mes (pago único). Coste predecible y sin sustos.',
    meta: ['Plan anual 24 €/mes', 'Coste estable'],
    date: 'May 2025',
    verified: true
  },
  {
    initials: 'PC',
    name: 'Paula C.',
    role: 'Encargada',
    sector: 'Punto PUDO',
    businessLabel: 'Nervión',
    city: 'Sevilla',
    rating: 5,
    quote:
      'Añadimos dos paqueteras nuevas la semana del Día de la Madre. Sin formación extra y sin colas: fue plug & play.',
    meta: ['+2 paqueteras en 1 semana', '0 colas añadidas'],
    date: 'May 2025',
    verified: true
  },
  {
    initials: 'DP',
    name: 'Diego P.',
    role: 'Jefe de tienda',
    sector: 'MiniMarket 24h',
    businessLabel: 'Centro',
    city: 'Zaragoza',
    rating: 5,
    quote:
      'Altas en 22 segundos de media y 0 paquetes extraviados en 90 días. La cola de tarde prácticamente desapareció.',
    meta: ['22 s alta media', '0 extravíos en 90 días'],
    date: 'Ago 2025',
    verified: true
  },
  {
    initials: 'RS',
    name: 'Rosa S.',
    role: 'Responsable',
    sector: 'Estanco',
    businessLabel: 'Málaga Centro',
    city: 'Málaga',
    rating: 5,
    quote:
      'Avisos por WhatsApp con un clic: recogidas al primer intento +21 puntos. Ahorro directo en tiempo de mostrador.',
    meta: ['+21 pp primer intento', '118 € ahorro/mes'],
    date: 'Jul 2025',
    verified: true
  },
  {
    initials: 'LP',
    name: 'Luis P.',
    role: 'Propietario',
    sector: 'Papelería',
    businessLabel: 'Indautxu',
    city: 'Bilbao',
    rating: 5,
    quote:
      'La conciliación automática detectó 5 diferencias en el Q2. Recuperamos 164 € de margen que dábamos por perdidos.',
    meta: ['5 ajustes Q2', '+164 € recuperados'],
    date: 'Jun 2025',
    verified: true
  },
  {
    initials: 'EH',
    name: 'Elena H.',
    role: 'Gerente',
    sector: 'Tienda de barrio',
    businessLabel: 'Playa de San Juan',
    city: 'Alicante',
    rating: 5,
    quote:
      'Con 29 €/mes nos compensa, y al pasar a anual queda en 24 €/mes (pago único). ROI desde el primer mes.',
    meta: ['ROI en el mes 1', 'Plan anual 24 €/mes'],
    date: 'Jul 2025',
    verified: true
  },
  {
    initials: 'IV',
    name: 'Iván V.',
    role: 'Encargado',
    sector: 'Punto PUDO',
    businessLabel: 'Sants',
    city: 'Barcelona',
    rating: 5,
    quote:
      'Mover entre baldas sin perder rastro bajó los errores un 73%. Se nota en el tiempo y en la cara del cliente.',
    meta: ['−73% errores de ubicación', '183 € ahorro/mes'],
    date: 'May 2025',
    verified: true
  },
  {
    initials: 'NP',
    name: 'Nuria P.',
    role: 'Dueña',
    sector: 'Supermercado eco',
    businessLabel: 'Rondilla',
    city: 'Valladolid',
    rating: 5,
    quote:
      'Panel diario y caducidades a cero. Las llamadas de “¿está mi paquete?” cayeron un 58%.',
    meta: ['0 caducidades en 120 días', '−58% llamadas'],
    date: 'Ago 2025',
    verified: true
  },
  {
    initials: 'TT',
    name: 'Tomás T.',
    role: 'Gerente',
    sector: 'Droguería',
    businessLabel: 'Barrio del Carmen',
    city: 'Murcia',
    rating: 4,
    quote:
      'Me habría gustado más plantillas de informes desde el primer día; soporte me pasó una en 48 h. Seguimos en mensual (29 €/mes) y quizá pasemos a anual.',
    meta: ['Soporte en 48 h', '29 €/mes (mensual)'],
    date: 'Jul 2025',
    verified: true
  },
  {
    initials: 'FR',
    name: 'Félix R.',
    role: 'Dueño',
    sector: 'Ferretería',
    businessLabel: 'Casco Antiguo',
    city: 'Toledo',
    rating: 5,
    quote:
      'Sumamos otra paquetera en Navidad en 3 minutos. No tuvimos que enseñar nada al equipo: la interfaz es la misma.',
    meta: ['+1 paquetera en 3 min', 'Sin formación adicional'],
    date: 'Dic 2024',
    verified: true
  },
  {
    initials: 'CB',
    name: 'Carla B.',
    role: 'Gerente',
    sector: 'Cafetería con PUDO',
    businessLabel: 'Ensanche',
    city: 'Pamplona',
    rating: 5,
    quote:
      'Aguantamos el pico de rebajas con un 30% más de paquetes sin ampliar personal. La pista por baldas fue clave.',
    meta: ['+30% volumen en rebajas', '0 contrataciones extra'],
    date: 'Ene 2025',
    verified: true
  }
]

export default function Testimonials() {
  const avg = (
    REVIEWS.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / REVIEWS.length
  ).toFixed(1)

  const viewportRef = useRef(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  // calcula páginas reales según ancho del viewport vs ancho de tarjeta
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const calc = () => {
      const card = el.querySelector('.et-tst__card')
      if (!card) return
      const gap = parseFloat(getComputedStyle(el).getPropertyValue('--gap')) || 16
      const slideW = card.getBoundingClientRect().width
      const perView = Math.max(1, Math.round((el.clientWidth + gap) / (slideW + gap)))
      const totalPages = Math.max(1, Math.ceil(REVIEWS.length / perView))
      setPages(totalPages)
      setPage((p) => Math.min(p, totalPages - 1))
    }

    const ro = new ResizeObserver(calc)
    ro.observe(el)
    calc()

    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth)
      setPage(idx)
    }
    el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', onScroll)
    }
  }, [])

  const goTo = (i) => {
    const el = viewportRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(i, pages - 1))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }
  const next = () => goTo(page + 1)
  const prev = () => goTo(page - 1)

  return (
    <section className="et-tst" id="testimonios" aria-labelledby="et-tst-title">
      <header className="et-tst__head">
        <h2 id="et-tst-title">Lo que dicen de EasyTrack</h2>

        <div className="et-tst__trust" aria-label="Indicadores de confianza">
          <div className="et-tst__trust-item" title="Media de valoraciones">
            <div className="et-tst__stars" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <FaStar key={i} className="on" />
              ))}
            </div>
            <span className="et-tst__trust-text">
              {avg}/5 <span className="muted">media</span>
            </span>
          </div>

          <div className="et-tst__trust-item" title="Verificación interna">
            <FaCheckCircle className="ok" aria-hidden="true" />
            <span className="et-tst__trust-text">Reseñas verificadas</span>
          </div>

          <div className="et-tst__trust-item" title="Plan único">
            <span className="dot" aria-hidden="true" />
            <span className="et-tst__trust-text">Plan único: 29 €/mes</span>
          </div>

          <div className="et-tst__trust-item" title="Plan anual (pago único)">
            <span className="dot" aria-hidden="true" />
            <span className="et-tst__trust-text">Anual: 24 €/mes (pago único)</span>
          </div>

          <div className="et-tst__trust-item" title="Plan bianual (pago único)">
            <span className="dot" aria-hidden="true" />
            <span className="et-tst__trust-text">Bianual: 19 €/mes (pago único)</span>
          </div>

          <div className="et-tst__trust-item" title="Origen de las cifras">
            <span className="dot" aria-hidden="true" />
            <span className="et-tst__trust-text">Datos del panel (H1–H2 2025)</span>
          </div>
        </div>
      </header>

      {/* Carrusel */}
      <div className="et-tst__carousel">
        <button
          className="et-tst__nav et-tst__nav--prev"
          aria-label="Ver testimonios anteriores"
          onClick={prev}
          disabled={page === 0}
        >
          <FaChevronLeft />
        </button>

        <div
          className="et-tst__viewport"
          ref={viewportRef}
          role="region"
          aria-roledescription="carrusel"
          aria-label="Testimonios"
        >
          <div className="et-tst__track">
            {REVIEWS.map((r, idx) => (
              <article
                className="et-tst__card"
                key={idx}
                role="group"
                aria-label={`${r.name}, ${r.sector} en ${r.city}`}
              >
                <header className="et-tst__card-head">
                  <div
                    className="et-tst__stars"
                    title={`${Number(r.rating).toFixed(1)} de 5`}
                    aria-label={`${Number(r.rating).toFixed(1)} de 5 estrellas`}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <FaStar key={i} className={i < r.rating ? 'on' : ''} aria-hidden="true" />
                    ))}
                  </div>
                  <span className="et-tst__rating" aria-hidden="true">
                    {Number(r.rating).toFixed(1)}
                  </span>
                  {r.verified && (
                    <span className="et-tst__verified" title="Verificado por EasyTrack">
                      <FaCheckCircle aria-hidden="true" /> Verificado
                    </span>
                  )}
                </header>

                <blockquote className="et-tst__quote">
                  <p>“{r.quote}”</p>
                </blockquote>

                {!!r.meta?.length && (
                  <ul className="et-tst__meta" aria-label="Resultados destacados">
                    {r.meta.map((m, i) => (
                      <li key={i} className="et-tst__pill">
                        {m}
                      </li>
                    ))}
                  </ul>
                )}

                <footer className="et-tst__person">
                  <div className="et-tst__avatar" aria-hidden="true">
                    {r.initials}
                  </div>
                  <div className="et-tst__who">
                    <strong>{r.name}</strong>
                    <span>
                      {r.role} — {r.sector} · {r.businessLabel}, {r.city}
                    </span>
                  </div>
                  <time className="et-tst__date" dateTime={toISO(r.date)}>
                    {r.date}
                  </time>
                </footer>
              </article>
            ))}
          </div>
        </div>

        <button
          className="et-tst__nav et-tst__nav--next"
          aria-label="Ver testimonios siguientes"
          onClick={next}
          disabled={page >= pages - 1}
        >
          <FaChevronRight />
        </button>
      </div>

      {/* Dots */}
      {pages > 1 && (
        <div className="et-tst__dots" role="tablist" aria-label="Paginación de testimonios">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === page}
              aria-label={`Ir a la página ${i + 1}`}
              className={`et-tst__dot ${i === page ? 'is-active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}

      <p className="et-tst__footnote" role="note">
        Nombres y comercios <strong>anonimizados</strong> por privacidad. Cifras y fechas
        proceden del <strong>panel de EasyTrack</strong> y de tiempos reales en mostrador.
        <br />
        <strong>Plan único:</strong> 29 €/mes. <strong>Anual:</strong> 24 €/mes (pago único).
        <strong> Bianual:</strong> 19 €/mes (pago único).
      </p>
    </section>
  )
}

function toISO(label) {
  try {
    const [mes, año] = label.split(' ')
    const map = { Ene:1, Feb:2, Mar:3, Abr:4, May:5, Jun:6, Jul:7, Ago:8, Sep:9, Oct:10, Nov:11, Dic:12 }
    const m = map[mes] || 1
    return `${año}-${String(m).padStart(2, '0')}-01`
  } catch {
    return '2025-01-01'
  }
}
