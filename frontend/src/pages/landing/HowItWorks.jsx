// src/components/HowItWorks.jsx
import { useNavigate } from 'react-router-dom'
import { FaClock, FaClipboardCheck, FaStore, FaTruck, FaCheckCircle } from 'react-icons/fa'
import './HowItWorks.scss'

export default function HowItWorks({ onOpenDemo }) {
  const navigate = useNavigate()

  const startNow = () => {
    navigate('/precios?cta=hiw', { replace: false }) // /planes -> redirige a /precios
  }

  const openDemo = () => {
    // 1) Si el padre nos pasó un handler, úsalo
    if (typeof onOpenDemo === 'function') onOpenDemo()

    // 2) Evento global (por si el padre escucha esto)
    try { window.dispatchEvent(new CustomEvent('et:open-demo')) } catch {}

    // 3) Handler global opcional
    try { typeof window.__ET_OPEN_DEMO === 'function' && window.__ET_OPEN_DEMO() } catch {}

    // 4) Fallback por querystring, por si tu modal abre leyendo ?demo=1
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('demo') !== '1') {
        params.set('demo', '1')
        navigate({ search: `?${params.toString()}` }, { replace: false })
      }
    } catch {}
  }

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
      title: 'Configura tu almacén',
      time: '5 min',
      tasks: ['Estantes y baldas', 'Capacidad por zona'],
      tip: 'Lo tendrás listo para empezar a operar.'
    },
    {
      id: 3,
      title: 'Empieza a operar',
      time: 'Ahora',
      tasks: [
        'Alta en segundos con ubicación',
        'Entrega con verificación',
        'Recordatorios y WhatsApp en un clic'
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
                    <button className="ep-hiw__btn ep-hiw__btn--primary" onClick={startNow}>
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

        {/* Panel lateral */}
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
                <span className="ep-hiw__k">Estantes</span>
                <span className="ep-hiw__v">A, B, C, D</span>
              </div>
              <div className="ep-hiw__row">
                <span className="ep-hiw__k">Baldas por estante</span>
                <span className="ep-hiw__v">4</span>
              </div>
              <div className="ep-hiw__row">
                <span className="ep-hiw__k">Empresas de transporte</span>
                <span className="ep-hiw__v"><FaTruck /> InPost · SEUR · GLS</span>
              </div>

              <div className="ep-hiw__divider" />

              <ul className="ep-hiw__progress" role="list" aria-label="Progreso de activación">
                <li className="ep-hiw__state ep-hiw__state--done">
                  <FaCheckCircle aria-hidden="true" />
                  Cuenta creada
                </li>
                <li className="ep-hiw__state ep-hiw__state--current">Configurar almacén</li>
                <li className="ep-hiw__state ep-hiw__state--next">Empezar a operar</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
