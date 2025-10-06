// src/components/Benefits.jsx
import { useMemo, useState } from 'react'
import {
  FaClock,
  FaClipboardCheck,
  FaSearch,
  FaEdit,
  FaCheckCircle,
  FaBoxOpen,
  FaTrashAlt,
  FaCubes,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa'
import './Benefits.scss'

// === Datos demo coherentes con tu app (B1, B2, B3...) ===
const COMPANIAS = ['SEUR', 'Correos', 'GLS', 'InPost']

// Resultados de ejemplo (pendientes/entregados) con ubicación B#
const resultadosDemo = [
  { id: 'PK-1023', cliente: 'ANA MARTINEZ',  compania: 'InPost',  ubic: 'B5',  estado: 'pendiente',  dias: 2 },
  { id: 'PK-1024', cliente: 'CARLOS GARCIA', compania: 'SEUR',    ubic: 'B1',  estado: 'pendiente',  dias: 6 },
  { id: 'PK-1025', cliente: 'LUCIA PEREZ',   compania: 'GLS',     ubic: 'B11', estado: 'entregado',  dias: 0 },
  { id: 'PK-1026', cliente: 'ANA MARTINEZ',  compania: 'Correos', ubic: 'B5',  estado: 'pendiente',  dias: 1 }
]

// Ocupación de ejemplo para pintar B1..B12
const SLOTS = Array.from({ length: 12 }, (_, i) => `B${i + 1}`)

// Helpers
const toUpperVis = (s='') => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
const countByUbic = (list) => {
  const map = new Map()
  for (const r of list) {
    if (r.estado !== 'entregado') map.set(r.ubic, (map.get(r.ubic) || 0) + 1)
  }
  return map
}
const padB = (label) => {
  const m = /^B(\d+)$/i.exec(label || '')
  if (!m) return label || ''
  const n = parseInt(m[1], 10)
  return n < 10 ? `B0${n}` : `B${n}`
}

// Sugerencia simple: si el cliente ya tiene pendiente, proponemos esa B; si no, la menos cargada
const sugerirUbic = (cliente, resultados, slots) => {
  const up = toUpperVis(cliente)
  if (up) {
    const pendientesCliente = resultados.filter(r => r.estado !== 'entregado' && toUpperVis(r.cliente) === up)
    if (pendientesCliente.length) return pendientesCliente[0].ubic
  }
  const occ = countByUbic(resultados)
  const ordenadas = [...slots].sort((a, b) => (occ.get(a) || 0) - (occ.get(b) || 0))
  return ordenadas[0] || slots[0]
}

export default function Benefits() {
  // Alta (mini formulario)
  const [cliente, setCliente] = useState('ANA MARTINEZ')
  const [compania, setCompania] = useState(COMPANIAS[0])
  const [selB, setSelB] = useState('B5')
  const sugerida = useMemo(() => sugerirUbic(cliente, resultadosDemo, SLOTS), [cliente])

  // Búsqueda demo
  const [reveal, setReveal] = useState(false)

  // Ocupación
  const occMap = useMemo(() => countByUbic(resultadosDemo), [])

  return (
    <section className="ep-bnf" id="beneficios" aria-labelledby="benefits-title">
      <header className="ep-bnf__head">
        <h2 id="benefits-title">
          <span className="ep-bnf__gradient">¿Por qué elegir EasyTrack?</span>
        </h2>
        <p>Vista previa real del flujo: alta en segundos, búsqueda clara y control de ocupación.</p>
      </header>

      {/* 1) Alta simple con ubicación B# */}
      <article className="ep-bnf__row ep-bnf__animated">
        <div className="ep-bnf__copy">
          <div className="ep-bnf__eyebrow">Operativa más rápida</div>
          <h3>Alta en segundos</h3>
          <ul className="ep-bnf__points">
            <li>Escribe el <strong>cliente</strong>, elige <strong>compañía</strong> y confirma la <strong>Ubicacion</strong>.</li>
            <li>Te sugerimos la ubicación <strong>que ya usa el cliente</strong> o la <strong>más libre</strong>.</li>
            <li>Diseñado para que cualquier miembro del equipo lo haga bien a la primera.</li>
          </ul>
          <div className="ep-bnf__chips">
            <span className="ep-bnf__pill ep-bnf__pill--ok"><FaClock /> ~30 seg/paquete</span>
            <span className="ep-bnf__pill"><FaClipboardCheck /> Menos errores</span>
          </div>
        </div>

        <div className="ep-bnf__demo">
          <div className="ep-bnf__ui">
            <div className="ep-bnf__ui-row">
              <div className="ep-bnf__ui-field">
                <span>Cliente</span>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e)=> setCliente(toUpperVis(e.target.value))}
                  placeholder="Nombre del cliente"
                  aria-label="Cliente"
                />
              </div>
              <div className="ep-bnf__ui-field">
                <span>Compañía</span>
                <select value={compania} onChange={(e)=> setCompania(e.target.value)} aria-label="Empresa de transporte">
                  {COMPANIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="ep-bnf__loc-code">
              <span className="ep-bnf__label">Sugerida</span>
              <span className="ep-bnf__badge ep-bnf__badge--code">{padB(sugerida)}</span>
              <span className="ep-bnf__label">Seleccionada</span>
              <span className="ep-bnf__badge ep-bnf__badge--code">{padB(selB)}</span>
            </div>

            <div className="ep-bnf__gridB" role="group" aria-label="Selecciona una ubicación">
              {SLOTS.map((slot) => {
                const count = occMap.get(slot) || 0
                const cls = count === 0 ? 'free' : count <= 4 ? 'low' : count < 10 ? 'mid' : 'high'
                const active = selB === slot
                const suggested = sugerida === slot
                return (
                  <button
                    type="button"
                    key={slot}
                    className={[
                      'ep-bnf__gridB-cell',
                      `ep-bnf__gridB--${cls}`,
                      active ? 'is-active' : '',
                      suggested ? 'is-suggested' : ''
                    ].join(' ')}
                    onClick={()=> setSelB(slot)}
                    aria-pressed={active}
                    title={`${slot} · ${count} paquete${count!==1?'s':''}`}
                  >
                    {padB(slot)}
                  </button>
                )
              })}
            </div>

            <div className="ep-bnf__actions">
              <button className="ep-bnf__btn ep-bnf__btn--primary ep-bnf__btn--sm">
                <FaClipboardCheck /> Guardar (demo)
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* 2) Búsqueda y acciones rápidas (lista demo) */}
      <article className="ep-bnf__row ep-bnf__animated ep-bnf__animated--d1">
        <div className="ep-bnf__copy">
          <div className="ep-bnf__eyebrow">Control al instante</div>
          <h3>Búsqueda clara con acciones</h3>
          <ul className="ep-bnf__points">
            <li>Localiza por <strong>cliente</strong>, <strong>compañía</strong>, <strong>B</strong> o <strong>estado</strong>.</li>
            <li>Acciones habituales: <strong>Entregar</strong>, <strong>Editar</strong>, <strong>Eliminar</strong>.</li>
            <li>Diseño que se entiende a la primera en escritorio y móvil.</li>
          </ul>
          <div className="ep-bnf__chips">
            <span className="ep-bnf__pill"><FaSearch /> Búsqueda potente</span>
            <button className="ep-bnf__pill" onClick={()=> setReveal(r => !r)}>
              {reveal ? <><FaEyeSlash /> Ocultar nombres</> : <><FaEye /> Mostrar nombres</>}
            </button>
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
                      <FaBoxOpen />{' '}
                      <strong className={reveal ? '' : 'is-blur'}>{r.cliente}</strong> — {r.compania}
                    </div>
                    <div className="ep-bnf__res-badges">
                      <span className="ep-bnf__badge ep-bnf__badge--code">{padB(r.ubic)}</span>
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

      {/* 3) Ocupación simple */}
      <article className="ep-bnf__row ep-bnf__animated ep-bnf__animated--d2">
        <div className="ep-bnf__copy">
          <div className="ep-bnf__eyebrow">Más paquetes, menos tiempo</div>
          <h3>Ocupación por ubicaciones</h3>
          <ul className="ep-bnf__points">
            <li>Colores según carga: <strong>baja</strong>, <strong>media</strong>, <strong>alta</strong>.</li>
            <li>Detecta huecos libres al instante.</li>
            <li>En la app real, se actualiza con tus datos en tiempo real.</li>
          </ul>
        </div>

        <div className="ep-bnf__demo">
          <div className="ep-bnf__gridB ep-bnf__gridB--compact">
            {SLOTS.map((slot) => {
              const count = occMap.get(slot) || 0
              const cls = count === 0 ? 'free' : count <= 4 ? 'low' : count < 10 ? 'mid' : 'high'
              return (
                <div key={slot} className={`ep-bnf__gridB-cell ${`ep-bnf__gridB--${cls}`}`} title={`${slot} · ${count} paquete${count!==1?'s':''}`}>
                  <div className="cell-top">{padB(slot)}</div>
                  <div className="cell-sub">{count}</div>
                </div>
              )
            })}
          </div>
        </div>
      </article>
    </section>
  )
}
