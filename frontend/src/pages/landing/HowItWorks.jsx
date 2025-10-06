// src/components/HowItWorks.jsx
import { useNavigate } from 'react-router-dom'
import { FaClock, FaClipboardCheck, FaStore, FaTruck, FaCheckCircle } from 'react-icons/fa'
import './HowItWorks.scss'

export default function HowItWorks({ onOpenDemo }) {
  const navigate = useNavigate()

  const startNow = () => {
    navigate('/precios?cta=hiw', { replace: false })
  }

  const openDemo = () => {
    if (typeof onOpenDemo === 'function') onOpenDemo()
    try { window.dispatchEvent(new CustomEvent('et:open-demo')) } catch {}
    try { typeof window.__ET_OPEN_DEMO === 'function' && window.__ET_OPEN_DEMO() } catch {}
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('demo') !== '1') {
        params.set('demo', '1')
        navigate({ search: `?${params.toString()}` }, { replace: false })
      }
    } catch {}
  }

  // Pasos adaptados al sistema de ubicaciones lineales B#
  const steps = [
    {
      id: 1,
      title: 'Crea tu cuenta',
      time: '2 min',
      tasks: ['Nombre del negocio y usuarios', 'Logo (opcional)'],
      tip: 'Primer mes gratuito. Sin permanencia.'
    },
    {
      id: 2,
      title: 'Activa tus ubicaciones',
      time: '3–5 min',
      tasks: [
        'Define el rango inicial (p. ej., B1–B120)',
        'Opcional: bloquea B reservadas'
      ],
      tip: 'Lo dejas listo para operar hoy.'
    },
    {
      id: 3,
      title: 'Empieza a operar',
      time: 'Ahora',
      tasks: [
        'Alta en segundos con B sugerida',
        'Entrega con verificación',
        'Seguimiento en panel (día/semana)'
      ],
      cta: true
    }
  ]

  return (
    <section className="ep-hiw" id="como-funciona" aria-labelledby="howitworks-title">
      <div className="ep-hiw__head">
        <h2 id="howitworks-title">Así de fácil</h2>
        <p>Te guiamos paso a paso. Sin configuraciones raras.</p>
      </div>

      <div className="ep-hiw__grid">
        {/* Timeline */}
        <ol className="ep-hiw__timeline" role="list">
          {steps.map((s) => (
            <li className="ep-hiw__step ep-hiw__reveal" key={s.id}>
              <div className="ep-hiw__dot" aria-hidden="true">{s.id}</div>

              <div className="ep-hiw__content">
                <div className="ep-hiw__step-head">
                  <h3>{s.title}</h3>
                  <span className="ep-hiw__time" aria-label={`Tiempo estimado: ${s.time}`}>
                    <FaClock /> {s.time}
                  </span>
                </div>

                <ul className="ep-hiw__tasks">
                  {s.tasks.map((t, idx) => (
                    <li key={idx}>
                      <FaClipboardCheck aria-hidden="true" /> {t}
                    </li>
                  ))}
                </ul>

                {s.tip && <div className="ep-hiw__tip">{s.tip}</div>}

                {s.cta && (
                  <div className="ep-hiw__actions" role="group" aria-label="Acciones finales">
                    <button type="button" className="ep-hiw__btn ep-hiw__btn--primary" onClick={startNow}>
                      Probar ahora
                    </button>
                    <button type="button" className="ep-hiw__btn ep-hiw__btn--ghost" onClick={openDemo}>
                      Ver demo
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* Panel lateral: preview del onboarding con ubicaciones B */}
        <aside className="ep-hiw__preview">
          <div className="ep-hiw__assistant ep-hiw__reveal">
            <div className="ep-hiw__assistant-head">
              <FaStore /> Asistente de activación
            </div>

            <div className="ep-hiw__assistant-body">
              <div className="ep-hiw__row">
                <span className="ep-hiw__k">Sucursal</span>
                <span className="ep-hiw__v">Centro Urbano</span>
              </div>
              <div className="ep-hiw__row">
                <span className="ep-hiw__k">Ubicaciones activas</span>
                <span className="ep-hiw__v">B1–B120</span>
              </div>
              <div className="ep-hiw__row">
                <span className="ep-hiw__k">Sugerencia de B</span>
                <span className="ep-hiw__v">Cliente existente o B más libre</span>
              </div>
              <div className="ep-hiw__row">
                <span className="ep-hiw__k">Transportistas</span>
                <span className="ep-hiw__v"><FaTruck /> InPost · SEUR · GLS</span>
              </div>

              <div className="ep-hiw__divider" />

              <ul className="ep-hiw__progress" role="list" aria-label="Progreso de activación">
                <li className="ep-hiw__state ep-hiw__state--done">
                  <FaCheckCircle aria-hidden="true" />
                  Cuenta creada
                </li>
                <li className="ep-hiw__state ep-hiw__state--current">Activar ubicaciones B</li>
                <li className="ep-hiw__state ep-hiw__state--next">Empezar a operar</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
