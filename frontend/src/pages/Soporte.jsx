import { useMemo, useRef, useState } from 'react'
import {
  FiHelpCircle, FiMail, FiLifeBuoy, FiSearch, FiX, FiChevronRight
} from 'react-icons/fi'
import '../styles/Soporte.scss'

export default function Soporte() {
  /* ===================== Datos del FAQ ===================== */
  const FAQ = useMemo(() => ([
    // Primeros pasos
    {
      id: 'setup-shelves',
      cat: 'Primeros pasos',
      q: '¿Cómo configuro estantes y baldas?',
      a: (
        <>
          Ve a <em>Configuración → Almacén</em> y define el número de estantes y baldas por estante.
          Guarda y revisa <em>Dashboard → Ver estantes</em> para ver el mapa y la ocupación.
        </>
      ),
      keywords: 'configuración almacen estantes baldas mapa ocupación layout',
      followups: ['bulk-import', 'roles', 'multi-sede']
    },
    {
      id: 'bulk-import',
      cat: 'Primeros pasos',
      q: '¿Puedo importar paquetes desde Excel/CSV?',
      a: (
        <>
          Sí. Usa <em>Paquetes → Importar</em>. Columnas recomendadas: <code>codigo</code>, <code>cliente</code>, <code>compania</code>,
          <code>estante</code>, <code>balda</code>, <code>estado</code>. Si necesitas una plantilla, escríbenos a
          <a href="mailto:support@easytrack.pro"> support@easytrack.pro</a>.
        </>
      ),
      keywords: 'importar excel csv plantilla columnas código cliente compañía',
      followups: ['barcode', 'export-data']
    },
    {
      id: 'demo-onboarding',
      cat: 'Primeros pasos',
      q: '¿Tenéis onboarding o una demo guiada?',
      a: (
        <>
          Te guiamos en la puesta en marcha (30–45 min). Coordinamos por correo en
          <a href="mailto:support@easytrack.pro"> support@easytrack.pro</a>.
        </>
      ),
      keywords: 'demo onboarding sesión acompañamiento formación training',
      followups: ['roles', 'pricing']
    },

    // Operación diaria
    {
      id: 'barcode',
      cat: 'Operación diaria',
      q: '¿Funciona con lectores de códigos de barras?',
      a: (
        <>
          Sí, con lectores que emulan teclado (HID/USB/Bluetooth). Coloca el foco en el campo de
          búsqueda y escanea: el código se introduce automáticamente. Para modelos especiales, contáctanos.
        </>
      ),
      keywords: 'lector scanner escáner código de barras hid usb bluetooth',
      followups: ['label-printers', 'search-speed']
    },
    {
      id: 'label-printers',
      cat: 'Operación diaria',
      q: '¿Puedo imprimir etiquetas para ubicar paquetes?',
      a: (
        <>
          Puedes imprimir etiquetas desde el navegador (PDF) en cualquier impresora estándar.
          Integración directa con impresoras térmicas está en el roadmap; si la necesitas, avísanos.
        </>
      ),
      keywords: 'impresora etiqueta térmica pdf zebra brother dymo',
      followups: ['barcode', 'multi-sede']
    },
    {
      id: 'notifications',
      cat: 'Operación diaria',
      q: '¿Hay avisos al cliente (email/SMS) cuando llega un paquete?',
      a: (
        <>
          Notificaciones por email están disponibles según configuración del negocio.
          SMS/WhatsApp son opcionales según país/proveedor (consulta condiciones).
        </>
      ),
      keywords: 'notificaciones email sms whatsapp aviso llegada',
      followups: ['privacy', 'export-data']
    },
    {
      id: 'search-speed',
      cat: 'Operación diaria',
      q: '¿La búsqueda es rápida con muchos paquetes?',
      a: (
        <>
          Sí. Usamos consultas indexadas y paginación. Sugerencia: evita nombres muy genéricos y
          añade filtros por compañía/estante para acelerar aún más.
        </>
      ),
      keywords: 'rendimiento performance búsqueda rápida índices',
      followups: ['bulk-import']
    },

    // Cuenta y facturación
    {
      id: 'pricing',
      cat: 'Cuenta y facturación',
      q: '¿Cómo funcionan los planes, pagos y cancelación?',
      a: (
        <>
          Facturación con Stripe. Puedes cambiar de plan o cancelar desde <em>Ajustes → Facturación</em>.
          La cancelación es inmediata para el próximo ciclo; mantienes acceso hasta el fin del periodo pagado.
        </>
      ),
      keywords: 'precios planes suscripción stripe cancelar reembolso facturas',
      followups: ['invoice', 'export-data']
    },
    {
      id: 'invoice',
      cat: 'Cuenta y facturación',
      q: '¿Puedo descargar facturas y cambiar datos de facturación?',
      a: (
        <>
          Sí. En <em>Ajustes → Facturación</em> puedes editar datos fiscales y descargar facturas anteriores.
        </>
      ),
      keywords: 'facturas descargar iva nif datos facturación',
      followups: ['pricing']
    },
    {
      id: 'roles',
      cat: 'Cuenta y facturación',
      q: '¿Hay roles y permisos para mi equipo?',
      a: (
        <>
          Sí. Invita usuarios y asígnales permisos desde <em>Ajustes → Equipo</em> (gestión, operario, lectura).
          Los permisos limitan acceso a secciones sensibles.
        </>
      ),
      keywords: 'usuarios equipo permisos roles invitaciones',
      followups: ['audit-log', 'privacy']
    },

    // Seguridad y datos
    {
      id: 'privacy',
      cat: 'Seguridad y datos',
      q: '¿Cómo protegéis los datos? ¿Cumple RGPD?',
      a: (
        <>
          Separación multi-tenant con políticas RLS y mínimos privilegios. Cifrado en tránsito (HTTPS/TLS).
          Consulta la <a href="/legal/privacidad">Política de Privacidad</a> para detalle y derechos RGPD.
        </>
      ),
      keywords: 'seguridad rgpd privacidad rls cifrado',
      followups: ['export-data', 'dpa', 'uptime']
    },
    {
      id: 'export-data',
      cat: 'Seguridad y datos',
      q: '¿Puedo exportar mis datos si decido irme?',
      a: (
        <>
          Sí. Desde <em>Paquetes → Exportar</em> puedes descargar CSV/ZIP. Si necesitas un volcado completo,
          escríbenos y lo coordinamos contigo de forma segura.
        </>
      ),
      keywords: 'exportar datos csv backup copia seguridad salida vendor lock-in',
      followups: ['privacy']
    },
    {
      id: 'dpa',
      cat: 'Seguridad y datos',
      q: '¿Disponéis de Acuerdo de Encargado (DPA)?',
      a: (
        <>
          Sí. Podemos firmar un DPA estándar alineado con RGPD y los subencargados críticos (p. ej., Stripe,
          proveedores cloud). Solicítalo por correo.
        </>
      ),
      keywords: 'dpa acuerdo encargado tratamiento rgpd subencargados',
      followups: ['privacy']
    },
    {
      id: 'uptime',
      cat: 'Seguridad y datos',
      q: '¿Qué disponibilidad y copias de seguridad tenéis?',
      a: (
        <>
          Objetivo 99,9% con mantenimiento programado cuando aplique. Copias de seguridad gestionadas por el
          proveedor y restauraciones ante incidencias críticas.
        </>
      ),
      keywords: 'uptime disponibilidad backup copias mantenimiento',
      followups: ['privacy']
    },
    {
      id: 'audit-log',
      cat: 'Seguridad y datos',
      q: '¿Existe registro de actividad (auditoría)?',
      a: (
        <>
          Registramos eventos clave para diagnóstico y seguridad. Para requisitos avanzados de auditoría,
          cuéntanos tu caso de uso.
        </>
      ),
      keywords: 'auditoría logs actividad eventos quién hizo qué',
      followups: ['roles']
    },

    // Integraciones y hardware
    {
      id: 'api-webhooks',
      cat: 'Integraciones y hardware',
      q: '¿Hay API o webhooks para integrarme con otros sistemas?',
      a: (
        <>
          Ofrecemos endpoints para operaciones habituales y webhooks bajo petición. Si necesitas una integración,
          indícanos los casos y te damos acceso.
        </>
      ),
      keywords: 'api webhook integración erp ecommerce',
      followups: ['bulk-import', 'export-data']
    },
    {
      id: 'multi-sede',
      cat: 'Integraciones y hardware',
      q: '¿Puedo gestionar varias sedes o almacenes?',
      a: (
        <>
          Sí. Puedes crear y alternar sedes dentro del mismo negocio, con métricas por ubicación.
        </>
      ),
      keywords: 'multi sede almacenes ubicaciones locales',
      followups: ['roles', 'search-speed']
    },
    {
      id: 'mobile',
      cat: 'Integraciones y hardware',
      q: '¿Funciona en móvil o tablets?',
      a: (
        <>
          Sí. La interfaz está optimizada para móvil/tablet (PWA). En Android, con un lector Bluetooth se
          escanea igual de rápido que en escritorio.
        </>
      ),
      keywords: 'móvil tablet pwa android ios responsive',
      followups: ['barcode', 'label-printers']
    },
    {
      id: 'offline',
      cat: 'Integraciones y hardware',
      q: '¿Puedo trabajar sin conexión?',
      a: (
        <>
          Recomendamos conexión estable para registrar entradas/salidas. La app mantiene ciertos datos en caché
          del navegador, pero la escritura requiere conexión para evitar inconsistencias.
        </>
      ),
      keywords: 'offline sin conexión caché pwa',
      followups: ['mobile']
    },
  ]), [])

  /* ===================== Estado UI ===================== */
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(null) // para “sugerencias relacionadas”
  const detailsRefs = useRef({})

  const byCategory = useMemo(() => {
    const map = new Map()
    FAQ.forEach(item => {
      if (!map.has(item.cat)) map.set(item.cat, [])
      map.get(item.cat).push(item)
    })
    // ordena alfabéticamente dentro de categoría
    map.forEach(list => list.sort((a,b) => a.q.localeCompare(b.q)))
    return map
  }, [FAQ])

  const normalizedQuery = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!normalizedQuery) return null
    return FAQ.filter(item =>
      (item.q + ' ' + item.keywords).toLowerCase().includes(normalizedQuery)
    )
  }, [normalizedQuery, FAQ])

  const openById = (id) => {
    const el = detailsRefs.current[id]
    if (el) {
      // cierra otros
      Object.values(detailsRefs.current).forEach(d => { if (d && d !== el) d.open = false })
      el.open = true
      setActiveId(id)
      // scroll suave al abrir
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const related = useMemo(() => {
    if (!activeId) return []
    const current = FAQ.find(f => f.id === activeId)
    return (current?.followups || [])
      .map(id => FAQ.find(f => f.id === id))
      .filter(Boolean)
  }, [activeId, FAQ])

  /* ===================== Render ===================== */
  return (
    <main className="soporte">
      {/* Hero */}
      <header className="soporte__hero">
        <h1>Soporte & Ayuda</h1>
        <p>Resuelve dudas rápidas con el centro de ayuda o contáctanos.</p>
      </header>

      {/* Accesos rápidos */}
      <section className="soporte__quick">
        <article className="soporte__quick-card">
          <div className="ico"><FiHelpCircle /></div>
          <h3>FAQ</h3>
          <p>Guías rápidas y procedimientos comunes.</p>
          <a className="btn" href="#faq">Ver preguntas</a>
        </article>
        <article className="soporte__quick-card">
          <div className="ico"><FiMail /></div>
          <h3>Contactar</h3>
          <p>Respuesta en horario laboral.</p>
          <a className="btn" href="#contacto">Abrir contacto</a>
        </article>
        <article className="soporte__quick-card">
          <div className="ico"><FiLifeBuoy /></div>
          <h3>Estado del servicio</h3>
          <p>Disponibilidad e incidencias programadas.</p>
          <a className="btn ghost" href="/soporte#contacto">Solicitar acceso</a>
        </article>
      </section>

      {/* Buscador */}
      <section className="faq__search">
        <div className="faq__searchbox">
          <FiSearch />
          <input
            type="search"
            placeholder="Busca: CSV, impresora, roles, auditoría…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Buscar en el centro de ayuda"
          />
          {query && <button className="clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><FiX /></button>}
        </div>
        {results && (
          <p className="faq__resultnote">
            {results.length} resultado{results.length !== 1 ? 's' : ''} para “{query}”
          </p>
        )}
      </section>

      {/* FAQ */}
      <section id="faq" className="soporte__faq">
        <h2>Preguntas frecuentes</h2>

        {/* Con búsqueda: lista simple */}
        {results ? (
          <div className="faq__list">
            {results.map(item => (
              <details
                key={item.id}
                ref={el => detailsRefs.current[item.id] = el}
                onToggle={e => e.target.open && setActiveId(item.id)}
              >
                <summary>{item.q}</summary>
                <div className="answer">
                  <p>{item.a}</p>
                  {item.followups?.length > 0 && (
                    <div className="related">
                      <span>También te puede interesar:</span>
                      <div className="chips">
                        {item.followups.map(fid => {
                          const target = FAQ.find(f => f.id === fid)
                          if (!target) return null
                          return (
                            <button key={fid} className="chip" onClick={() => openById(fid)}>
                              {target.q} <FiChevronRight />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        ) : (
          /* Sin búsqueda: agrupado por categorías */
          Array.from(byCategory.entries()).map(([cat, items]) => (
            <div key={cat} className="faq__group">
              <h3>{cat}</h3>
              <div className="faq__list">
                {items.map(item => (
                  <details
                    key={item.id}
                    ref={el => detailsRefs.current[item.id] = el}
                    onToggle={e => e.target.open && setActiveId(item.id)}
                  >
                    <summary>{item.q}</summary>
                    <div className="answer">
                      <p>{item.a}</p>
                      {item.followups?.length > 0 && (
                        <div className="related">
                          <span>También te puede interesar:</span>
                          <div className="chips">
                            {item.followups.map(fid => {
                              const target = FAQ.find(f => f.id === fid)
                              if (!target) return null
                              return (
                                <button key={fid} className="chip" onClick={() => openById(fid)}>
                                  {target.q} <FiChevronRight />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Sugerencias relacionadas globales tipo “People also ask” */}
        {related.length > 0 && (
          <aside className="faq__suggestions" aria-label="Sugerencias relacionadas">
            <h4>Preguntas relacionadas</h4>
            <div className="chips">
              {related.map(r => (
                <button key={r.id} className="chip" onClick={() => openById(r.id)}>
                  {r.q} <FiChevronRight />
                </button>
              ))}
            </div>
          </aside>
        )}
      </section>

      {/* Contacto */}
      <section id="contacto" className="soporte__contact">
        <div className="soporte__contact-card">
          <h2>Contacta con soporte</h2>
          <p>Correo recomendado:</p>
          <p className="lead"><a href="mailto:support@easytrack.pro">support@easytrack.pro</a></p>
          <ul>
            <li>Lun–Vie · 9:00–18:00 CET</li>
            <li>Tiempo medio de respuesta: 1–6 h</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
