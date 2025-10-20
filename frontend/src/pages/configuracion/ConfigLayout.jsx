import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  MdChevronRight,
  MdMenuOpen,
  MdMenu,
  MdFullscreen,
  MdFullscreenExit,
} from 'react-icons/md';
import './ConfigLayout.scss';

export default function ConfigLayout({
  title = 'Configuración',
  sections = [],
  active,
  onChange,
  renderSection,
  children,
}) {
  const hasOwnContent = useMemo(
    () => sections.some(s => s.content) || typeof renderSection === 'function',
    [sections, renderSection]
  );

  const [currentId, setCurrentId] = useState(active || sections[0]?.id);
  useEffect(() => { if (active && active !== currentId) setCurrentId(active); }, [active]); // eslint-disable-line

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cfg:collapsed') === '1');
  const [focus, setFocus]         = useState(() => localStorage.getItem('cfg:focus') === '1');
  useEffect(() => { localStorage.setItem('cfg:collapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { localStorage.setItem('cfg:focus',     focus ? '1' : '0');     }, [focus]);

  // medir header para fijar offset sticky (con raf para evitar micro saltos)
  const rootRef  = useRef(null);
  const headRef  = useRef(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const head = headRef.current;
    if (!root || !head) return;

    let raf = 0;
    const setTop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = head.offsetHeight || 0;
        root.style.setProperty('--sticky-top', `${h + 12}px`);
      });
    };

    setTop();
    const ro = new ResizeObserver(setTop);
    ro.observe(head);
    window.addEventListener('resize', setTop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', setTop);
    };
  }, []);

  // refs + scroll-spy
  const sectionRefs = useRef({});
  const setRef = useCallback((id) => (el) => { if (el) sectionRefs.current[id] = el; }, []);

  // reduced motion
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // tabs container para autoscroll en móvil
  const tabsRef = useRef(null);

  // ⚠️ Sustituyo scrollIntoView por cálculo manual de scrollLeft (no afecta al scroll vertical)
  const scrollActiveTabIntoView = useCallback((id) => {
    const wrap = tabsRef.current;
    if (!wrap) return;
    const btn = wrap.querySelector(`[data-tab="${id}"]`);
    if (!btn) return;

    const btnLeft = btn.offsetLeft;
    const btnWidth = btn.offsetWidth;
    const target = Math.max(0, btnLeft - (wrap.clientWidth - btnWidth) / 2);
    const behavior = prefersReduced.current ? 'auto' : 'smooth';
    wrap.scrollTo({ left: target, behavior });
  }, []);

  // scroll suave con offset real del sticky-top (en vez de scrollIntoView)
  const smoothScrollToEl = useCallback((el) => {
    if (!el) return;
    const root = rootRef.current;
    const cs = root ? getComputedStyle(root) : null;
    const stickyVar = cs ? parseFloat(cs.getPropertyValue('--sticky-top')) : 0;
    const offset = Number.isFinite(stickyVar) ? stickyVar : 76; // fallback

    const targetY = el.getBoundingClientRect().top + window.scrollY - offset;
    const nowY = window.scrollY;

    if (Math.abs(nowY - targetY) < 2) return; // ya estamos ahí
    const behavior = prefersReduced.current ? 'auto' : 'smooth';
    window.scrollTo({ top: Math.max(0, targetY), behavior });
  }, []);

  const go = useCallback((id) => {
    const el = sectionRefs.current[id];
    if (!el) return;

    setCurrentId(id);
    onChange?.(id);

    // Actualiza hash sin provocar scroll automático del navegador
    const url = new URL(window.location.href);
    url.hash = `#${id}`;
    window.history.replaceState({}, '', url);

    // Scroll controlado con offset
    smoothScrollToEl(el);

    // centra el tab activo en móvil
    scrollActiveTabIntoView(id);
  }, [onChange, smoothScrollToEl, scrollActiveTabIntoView]);

  useEffect(() => {
    if (!hasOwnContent) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = visible.target.getAttribute('data-sid');
          if (id && id !== currentId) {
            setCurrentId(id);
            onChange?.(id);
            scrollActiveTabIntoView(id); // solo horizontal, no toca el page scroll
          }
        }
      },
      { root: null, rootMargin: '-20% 0px -60% 0px', threshold: [0.15,0.35,0.55,0.75] }
    );
    sections.forEach(s => { const el = sectionRefs.current[s.id]; if (el) io.observe(el); });
    return () => io.disconnect();
  }, [sections, hasOwnContent, currentId, onChange, scrollActiveTabIntoView]);

  useEffect(() => {
    const fromHash = (window.location.hash || '').replace('#','');
    if (fromHash && sections.some(s => s.id === fromHash) && fromHash !== currentId) {
      setTimeout(() => go(fromHash), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, go]);

  const current = useMemo(
    () => sections.find(s => s.id === currentId) || sections[0],
    [sections, currentId]
  );

  return (
    <div ref={rootRef} className={`cfg ${collapsed ? 'is-collapsed' : ''} ${focus ? 'is-focus' : ''}`}>
      <header ref={headRef} className="cfg__head" role="banner">
        <div className="cfg__headrow">
          <div className="cfg__titlegrp">
            <h2>{title}</h2>
            {current && (
              <div className="cfg__crumb" aria-label="Ruta de navegación">
                <span>Configuración</span> <MdChevronRight aria-hidden />
                <strong aria-current="true">{current.label}</strong>
              </div>
            )}
          </div>

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

      {/* Tabs móviles (con autoscroll del activo) */}
      <nav ref={tabsRef} className="cfg__tabs" role="tablist" aria-label="Secciones">
        {sections.map(s => (
          <button
            key={s.id}
            type="button"
            className={`cfg-tab ${s.id === currentId ? 'is-active' : ''}`}
            onClick={() => go(s.id)}
            role="tab"
            aria-selected={s.id === currentId}
            aria-controls={`panel-${s.id}`}
            data-tab={s.id}
          >
            <s.icon aria-hidden /> <span>{s.label}</span>
            {s.badge && <em className="cfg__pill">{s.badge}</em>}
          </button>
        ))}
      </nav>

      <div className="cfg__body">
        {/* Contenido a la izquierda */}
        <main className="cfg__content">
          {hasOwnContent ? (
            sections.map(s => (
              <section
                key={s.id}
                id={s.id}
                data-sid={s.id}
                ref={setRef(s.id)}
                className="cfg__section"
                aria-labelledby={`h-${s.id}`}
              >
                <header className="cfg__secthead">
                  <div className="cfg__secticon"><s.icon aria-hidden /></div>
                  <h3 id={`h-${s.id}`}>{s.label}</h3>
                  {s.badge && <span className="cfg__badge">{s.badge}</span>}
                </header>

                <div id={`panel-${s.id}`} className="cfg__sectbody" role="tabpanel">
                  {s.content ?? (renderSection ? renderSection(s) : null)}
                </div>
              </section>
            ))
          ) : (
            <div className="cfg__single">{children}</div>
          )}
        </main>

        {/* Sidebar sticky a la derecha */}
        <aside className="cfg__side" aria-label="Navegación secundaria">
          <ul className="cfg__nav" role="tablist" aria-orientation="vertical">
            {sections.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`cfg__navbtn ${s.id === currentId ? 'is-active' : ''}`}
                  onClick={() => go(s.id)}
                  role="tab"
                  aria-selected={s.id === currentId}
                  aria-controls={`panel-${s.id}`}
                  title={s.label}
                >
                  <s.icon aria-hidden />
                  <span>{s.label}</span>
                  {s.badge && <em className="cfg__badge">{s.badge}</em>}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
