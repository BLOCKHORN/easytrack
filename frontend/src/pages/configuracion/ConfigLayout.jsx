import { useEffect, useMemo, useState } from 'react';
import { MdChevronRight, MdMenuOpen, MdMenu, MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import './ConfigLayout.scss';

export default function ConfigLayout({ title = 'Configuración', sections = [], active, onChange, children }) {
  const current = useMemo(() => sections.find(s => s.id === active) || sections[0], [sections, active]);

  // Preferencias persistentes
  const [collapsed, setCollapsed] = useState(() => (localStorage.getItem('cfg:collapsed') === '1'));
  const [focus, setFocus] = useState(() => (localStorage.getItem('cfg:focus') === '1'));

  useEffect(() => { localStorage.setItem('cfg:collapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { localStorage.setItem('cfg:focus', focus ? '1' : '0'); }, [focus]);

  return (
    <div className={`cfg ${collapsed ? 'is-collapsed' : ''} ${focus ? 'is-focus' : ''}`}>
      <header className="cfg__head" role="banner">
        <div className="cfg__headrow">
          <div className="cfg__titlegrp">
            <h2>{title}</h2>
            {current && (
              <div className="cfg__crumb" aria-label="Ruta de navegación">
                <span>Configuración</span> <MdChevronRight aria-hidden />
                <strong aria-current="page">{current.label}</strong>
              </div>
            )}
          </div>

          {/* Acciones de layout (desktop) */}
          <div className="cfg__actions" role="group" aria-label="Opciones de diseño">
            <button
              type="button"
              className="cfg__iconbtn"
              onClick={() => setCollapsed(v => !v)}
              aria-pressed={collapsed}
              aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
              title={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
            >
              {collapsed ? <MdMenu /> : <MdMenuOpen />}
            </button>
            <button
              type="button"
              className="cfg__iconbtn"
              onClick={() => setFocus(v => !v)}
              aria-pressed={focus}
              aria-label={focus ? 'Salir de modo enfoque' : 'Modo enfoque'}
              title={focus ? 'Salir de modo enfoque' : 'Modo enfoque'}
            >
              {focus ? <MdFullscreenExit /> : <MdFullscreen />}
            </button>
          </div>
        </div>
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
                  title={s.label} // tooltip útil cuando está colapsado
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
