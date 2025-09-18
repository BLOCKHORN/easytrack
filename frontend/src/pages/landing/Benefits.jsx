// src/components/Benefits.jsx
import {
  FaClock,
  FaClipboardCheck,
  FaWhatsapp,
  FaBell,
  FaSearch,
  FaEdit,
  FaCheckCircle,
  FaBoxOpen,
  FaTrashAlt
} from 'react-icons/fa'
import './Benefits.scss'

// Demo de resultados de búsqueda
const resultadosDemo = [
  { id: 'PK-1023', cliente: 'Ana Martínez',  empresa: 'InPost', est: 'B', balda: '3', estado: 'pendiente', dias: 2, tel: '600123123' },
  { id: 'PK-1024', cliente: 'Carlos García', empresa: 'SEUR',   est: 'A', balda: '1', estado: 'pendiente', dias: 6, tel: '600456456' },
  { id: 'PK-1025', cliente: 'Lucía Pérez',   empresa: 'GLS',    est: 'C', balda: '2', estado: 'entregado', dias: 0, tel: '600789789' }
]

const buildWaURL = (tel, texto) =>
  `https://wa.me/34${(tel || '').replace(/\D/g,'') || '600000000'}?text=${encodeURIComponent(texto)}`

const NEGOCIO = 'tu negocio'

export default function Benefits() {
  const ejemploTextoWA = (r) =>
    `Hola ${r.cliente}, tu paquete (${r.empresa}, ref. ${r.id}) está listo para recoger en ${NEGOCIO}. Gracias.`

  return (
    <section className="ep-bnf" id="beneficios" aria-labelledby="benefits-title">
      <header className="ep-bnf__head">
        <h2 id="benefits-title">
          <span className="ep-bnf__gradient">¿Por qué elegir EasyTrack?</span>
        </h2>
        <p>Beneficios reales, sin humo. Lo que ves es lo que tendrás desde el día uno.</p>
      </header>

      {/* 1. Alta y entrega sin fricción */}
      <article className="ep-bnf__row ep-bnf__animated">
        <div className="ep-bnf__copy">
          <div className="ep-bnf__eyebrow">Operativa más rápida</div>
          <h3>Alta y entrega sin fricción</h3>
          <ul className="ep-bnf__points">
            <li>Da de alta en <strong>segundos</strong> con ubicación (estante y balda).</li>
            <li>Entrega segura con <strong>verificación básica</strong> (nombre/DNI/código corto).</li>
            <li>Flujo claro para que <strong>cualquiera</strong> del equipo lo haga bien.</li>
          </ul>
          <div className="ep-bnf__chips">
            <span className="ep-bnf__pill ep-bnf__pill--ok"><FaClock /> ~30 seg/paquete</span>
            <span className="ep-bnf__pill"><FaClipboardCheck /> Flujo simple</span>
          </div>
        </div>

        <div className="ep-bnf__demo">
          <div className="ep-bnf__ui">
            <div className="ep-bnf__ui-row">
              <div className="ep-bnf__ui-field"><span>Cliente</span><i className="ep-bnf__shimmer">Ana Martínez</i></div>
              <div className="ep-bnf__ui-field"><span>Empresa</span><i className="ep-bnf__shimmer">InPost</i></div>
            </div>
            <div className="ep-bnf__ui-row">
              <div className="ep-bnf__ui-field"><span>Estante</span><i className="ep-bnf__shimmer">B</i></div>
              <div className="ep-bnf__ui-field"><span>Balda</span><i className="ep-bnf__shimmer">3</i></div>
              <div className="ep-bnf__ui-field"><span>Caduca</span><i className="ep-bnf__shimmer">10 días</i></div>
            </div>
            <div className="ep-bnf__actions">
              <button className="ep-bnf__btn ep-bnf__btn--primary ep-bnf__btn--sm">
                <FaClipboardCheck /> Guardar
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* 2. Búsqueda y acciones */}
      <article className="ep-bnf__row ep-bnf__animated ep-bnf__animated--d1">
        <div className="ep-bnf__copy">
          <div className="ep-bnf__eyebrow">Control al instante</div>
          <h3>Búsqueda y acciones rápidas</h3>
          <ul className="ep-bnf__points">
            <li>Filtra por <strong>cliente</strong>, <strong>empresa</strong>, <strong>estante/balda</strong> o <strong>estado</strong>.</li>
            <li>Acciones directas: <strong>entregar</strong>, <strong>editar</strong>, <strong>mover</strong>.</li>
            <li>Vista clara para que <strong>todo el equipo</strong> lo entienda a la primera.</li>
          </ul>
          <div className="ep-bnf__chips">
            <span className="ep-bnf__pill"><FaSearch /> Búsqueda potente</span>
            <span className="ep-bnf__pill ep-bnf__pill--ok"><FaCheckCircle /> Menos errores</span>
          </div>
        </div>

        <div className="ep-bnf__demo">
          <div className="ep-bnf__results">
            {resultadosDemo.map((r) => {
              const pendiente = r.estado !== 'entregado'
              return (
                <div className="ep-bnf__res" key={r.id}>
                  <div className="ep-bnf__res-main">
                    <div className="ep-bnf__res-title">
                      <FaBoxOpen /> <strong>{r.cliente}</strong> — {r.empresa}
                    </div>
                    <div className="ep-bnf__res-badges">
                      <span className="ep-bnf__badge">{r.est}-{r.balda}</span>
                      <span className={`ep-bnf__badge ${pendiente ? 'ep-bnf__badge--warn' : 'ep-bnf__badge--ok'}`}>
                        {pendiente ? `Pendiente · ${r.dias} días` : 'Entregado'}
                      </span>
                    </div>
                  </div>

                  <div className="ep-bnf__res-actions">
                    {pendiente ? (
                      <>
                        <button className="ep-bnf__btn ep-bnf__btn--primary ep-bnf__btn--xs">
                          <FaCheckCircle /> Entregar
                        </button>
                        <button className="ep-bnf__btn ep-bnf__btn--ghost ep-bnf__btn--xs">
                          <FaEdit /> Editar
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="ep-bnf__btn ep-bnf__btn--primary ep-bnf__btn--xs">
                          <FaTrashAlt /> Eliminar
                        </button>
                        <button className="ep-bnf__btn ep-bnf__btn--ghost ep-bnf__btn--xs">
                          <FaEdit /> Editar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </article>

      {/* 3. Recordatorios prácticos (sin email) */}
      <article className="ep-bnf__row ep-bnf__animated ep-bnf__animated--d2">
        <div className="ep-bnf__copy">
          <div className="ep-bnf__eyebrow">Seguimiento simple</div>
          <h3>Recordatorios prácticos y WhatsApp en un clic</h3>
          <ul className="ep-bnf__points">
            <li><strong>Alertas internas</strong> de paquetes próximos a caducar.</li>
            <li>Plantilla de <strong>WhatsApp</strong> para avisar al cliente desde tu número.</li>
            <li>Resumen claro en el <strong>panel</strong> (día/semana).</li>
          </ul>
          <div className="ep-bnf__chips">
            <span className="ep-bnf__pill ep-bnf__pill--ok"><FaBell /> Menos olvidos</span>
            <span className="ep-bnf__pill"><FaWhatsapp /> Comunicación directa</span>
          </div>
        </div>

        <div className="ep-bnf__demo">
          <div className="ep-bnf__channels">
            <div className="ep-bnf__ch">
              <div className="ep-bnf__ch-icon"><FaBell /></div>
              <div className="ep-bnf__ch-body"><strong>Alertas internas</strong><span>Paquetes próximos a caducar.</span></div>
              <div className="ep-bnf__ch-state ep-bnf__ch-state--on">Activo</div>
            </div>
            <div className="ep-bnf__ch">
              <div className="ep-bnf__ch-icon"><FaWhatsapp /></div>
              <div className="ep-bnf__ch-body">
                <strong>Plantilla WhatsApp</strong>
                <span>Envía el aviso desde tu número en un toque.</span>
              </div>
              <div className="ep-bnf__ch-state">Manual</div>
            </div>
            <div className="ep-bnf__ch">
              <div className="ep-bnf__ch-icon"><FaSearch /></div>
              <div className="ep-bnf__ch-body"><strong>Resumen en panel</strong><span>Visión del día y semana.</span></div>
              <div className="ep-bnf__ch-state ep-bnf__ch-state--on">Activo</div>
            </div>
          </div>

          <div className="ep-bnf__wa">
            <div className="ep-bnf__wa-title">Mensaje de WhatsApp (ejemplo)</div>
            <div className="ep-bnf__wa-list">
              {resultadosDemo.slice(0,2).map((r) => (
                <div className="ep-bnf__wa-line" key={r.id}>
                  <div className="ep-bnf__wa-text">{ejemploTextoWA(r)}</div>
                  <a
                    className="ep-bnf__btn ep-bnf__btn--primary ep-bnf__btn--xs"
                    href={buildWaURL(r.tel, ejemploTextoWA(r))}
                    target="_blank" rel="noreferrer"
                    aria-label={`Abrir WhatsApp para ${r.cliente}`}
                  >
                    <FaWhatsapp /> Abrir en WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}
