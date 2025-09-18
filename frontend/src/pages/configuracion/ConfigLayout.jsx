import { useMemo } from 'react';
import { MdChevronRight } from 'react-icons/md';
import './ConfigLayout.scss';

export default function ConfigLayout({ title = 'Configuración', sections = [], active, onChange, children }) {
  const current = useMemo(() => sections.find(s => s.id === active) || sections[0], [sections, active]);

  return (
    <div className="cfg">
      <header className="cfg__head" role="banner">
        <h2>{title}</h2>
        {current && (
          <div className="cfg__crumb" aria-label="Ruta de navegación">
            <span>Configuración</span> <MdChevronRight aria-hidden />
            <strong aria-current="page">{current.label}</strong>
          </div>
        )}
      </header>

      {/* Tabs móviles */}
      <nav className="cfg__tabs" role="tablist" aria-label="Secciones">
        {sections.map(s => (
          <button
            key={s.id}
            type="button"
            className={`cfg-tab ${s.id === current.id ? 'is-active' : ''}`}
            onClick={() => onChange?.(s.id)}
            role="tab"
            aria-selected={s.id === current.id}
            aria-controls={`panel-${s.id}`}
          >
            <s.icon aria-hidden /> <span>{s.label}</span>
          </button>
        ))}
      </nav>

      <div className="cfg__body">
        {/* Sidebar desktop */}
        <aside className="cfg__side" aria-label="Navegación secundaria">
          <ul className="cfg__nav" role="tablist" aria-orientation="vertical">
            {sections.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`cfg__navbtn ${s.id === current.id ? 'is-active' : ''}`}
                  onClick={() => onChange?.(s.id)}
                  role="tab"
                  aria-selected={s.id === current.id}
                  aria-controls={`panel-${s.id}`}
                >
                  <s.icon aria-hidden />
                  <span>{s.label}</span>
                  {s.badge && <em className="cfg__badge">{s.badge}</em>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main id={`panel-${current?.id ?? 'main'}`} className="cfg__content" role="tabpanel">
          {children}
        </main>
      </div>
    </div>
  );
}
