import {
  FaClock,
  FaClipboardCheck,
  FaBell,
  FaSearch,
  FaEdit,
  FaCheckCircle,
  FaBoxOpen,
  FaTrashAlt,
  FaCubes
} from 'react-icons/fa'
import './Benefits.scss'

// Demo de resultados de búsqueda (mock UI)
const resultadosDemo = [
  { id: 'PK-1023', cliente: 'Ana Martínez',  empresa: 'InPost', est: 'B', balda: '3', estado: 'pendiente', dias: 2 },
  { id: 'PK-1024', cliente: 'Carlos García', empresa: 'SEUR',   est: 'A', balda: '1', estado: 'pendiente', dias: 6 },
  { id: 'PK-1025', cliente: 'Lucía Pérez',   empresa: 'GLS',    est: 'C', balda: '2', estado: 'entregado', dias: 0 }
]

export default function Benefits() {
  return (
    <section className="ep-bnf" id="beneficios" aria-labelledby="benefits-title">
      <header className="ep-bnf__head">
        <h2 id="benefits-title">
          <span className="ep-bnf__gradient">¿Por qué elegir EasyTrack?</span>
        </h2>
        <p>Beneficios reales desde el día uno: menos esperas, menos errores y más rotación.</p>
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
            <span className="ep-bnf__pill"><FaClipboardCheck /> Menos errores</span>
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
            <span className="ep-bnf__pill ep-bnf__pill--ok"><FaCheckCircle /> Menos incidencias</span>
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

      {/* 3. Visor de ocupación y seguimiento simple (sin WhatsApp ni recordatorios automáticos) */}
      <article className="ep-bnf__row ep-bnf__animated ep-bnf__animated--d2">
        <div className="ep-bnf__copy">
          <div className="ep-bnf__eyebrow">Más paquetes, menos tiempo</div>
          <h3>Visor de ocupación y reubicación guiada</h3>
          <ul className="ep-bnf__points">
            <li><strong>Mapa de ocupación</strong> por carril/estante para liberar espacio rápido.</li>
            <li><strong>Seguimiento</strong> desde el panel (día/semana) sin hojas de cálculo.</li>
            <li>Conciliación básica con <strong>transportistas</strong> sin usar Excel.</li>
          </ul>
          <div className="ep-bnf__chips">
            <span className="ep-bnf__pill ep-bnf__pill--ok"><FaBell /> Menos olvidos</span>
            <span className="ep-bnf__pill"><FaCubes /> Balanceo de carga</span>
          </div>
        </div>

        <div className="ep-bnf__demo">
          <div className="ep-bnf__channels">
            <div className="ep-bnf__ch">
              <div className="ep-bnf__ch-icon"><FaCubes /></div>
              <div className="ep-bnf__ch-body"><strong>Mapa de ocupación</strong><span>Detecta huecos y zona caliente.</span></div>
              <div className="ep-bnf__ch-state ep-bnf__ch-state--on">Activo</div>
            </div>
            <div className="ep-bnf__ch">
              <div className="ep-bnf__ch-icon"><FaSearch /></div>
              <div className="ep-bnf__ch-body"><strong>Resumen en panel</strong><span>Visión del día y semana.</span></div>
              <div className="ep-bnf__ch-state ep-bnf__ch-state--on">Activo</div>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}
