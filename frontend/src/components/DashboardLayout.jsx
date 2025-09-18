import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import '../styles/DashboardLayout.scss';
import {
  FaPlus, FaSearch, FaBoxes, FaChartBar, FaUser, FaBars, FaTimes
} from 'react-icons/fa';

export default function DashboardLayout() {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setIsMobileSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ====== Navegación lateral (desktop) ======
  const sidebarItems = useMemo(() => ([
    { icon: <FaPlus />,   label: 'Añadir paquete', path: 'anadir' },
    { icon: <FaSearch />, label: 'Buscar paquete', path: 'buscar' },
    { icon: <FaBoxes />,  label: 'Ver estantes',   path: 'almacen' },
  ]), []);

  // ====== Subnavbar superior (desktop) ======
  const subNavbarItems = useMemo(() => ([
    { label: 'Dashboard',     path: '.',        icon: <FaChartBar />, end: true },
    { label: 'Área personal', path: 'personal', icon: <FaUser /> },
  ]), []);

  const isSubnavActive = (basePath) => {
    if (basePath === '.')
      return location.pathname.endsWith('/dashboard') || location.pathname.endsWith('/dashboard/');
    return location.pathname.includes(`/dashboard/${basePath}`);
  };

  // ====== Bottom nav (móvil / tablet) ======
  const bottomNavItems = useMemo(() => ([
    { key: 'home',    label: 'Inicio',   path: '.',        icon: <FaChartBar />, end: true },
    { key: 'buscar',  label: 'Buscar',   path: 'buscar',   icon: <FaSearch /> },
    { key: 'anadir',  label: '',   path: 'anadir',   icon: <FaPlus />,     primary: true },
    { key: 'almacen', label: 'Estantes', path: 'almacen',  icon: <FaBoxes /> },
    { key: 'perfil',  label: 'Perfil',   path: 'personal', icon: <FaUser /> },
  ]), []);

  return (
    <div className="layout-dashboard">
      {/* Sidebar (desktop + mobile drawer) */}
      <aside className={`ld-sidebar ${isMobileSidebarOpen ? 'ld-open' : ''}`} aria-label="Menú lateral">
        <div className="ld-sidebar__header">
          <button
            className="ld-sidebar__close"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Cerrar menú"
            type="button"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="ld-sidebar__nav">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `ld-nav-item ${isActive ? 'ld-activo' : ''}`}
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <div className="ld-icon">{item.icon}</div>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Backdrop móvil */}
      {isMobileSidebarOpen && (
        <button
          className="ld-sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setIsMobileSidebarOpen(false)}
          type="button"
        />
      )}

      {/* Contenido */}
      <main className="ld-contenido">
        {/* Topbar solo desktop */}
        <div className="ld-topbar">
          <button
            className="ld-menu-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Abrir menú"
            type="button"
          >
            <FaBars />
          </button>

          <div className="ld-subnavbar" role="tablist" aria-label="Secciones del panel">
            {subNavbarItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={() => `ld-subnav-item ${isSubnavActive(item.path) ? 'ld-activo' : ''}`}
                role="tab"
                aria-selected={isSubnavActive(item.path)}
              >
                <div className="ld-icon">{item.icon}</div>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="ld-vista ld-fade-in">
          <Outlet />
        </div>
      </main>

      {/* ===== Bottom Navigation (móvil/tablet) ===== */}
      <nav className="ld-bottomnav" aria-label="Navegación inferior">
        <ul className="ld-bottomnav__list">
          {bottomNavItems.map((item) => (
            <li key={item.key} className={`ld-bottomnav__li ${item.primary ? 'ld-primary-slot' : ''}`}>
              <NavLink
                to={item.path}
                end={item.end}
                className={({ isActive }) => [
                  'ld-bottomnav__item',
                  item.primary ? 'ld-primary' : '',
                  isActive ? 'ld-activo' : ''
                ].join(' ')}
                aria-label={item.label}
              >
                <span className="ld-bottomnav__icon">{item.icon}</span>
                <span className="ld-bottomnav__label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="ld-bottomnav__safearea" />
      </nav>
    </div>
  );
}
