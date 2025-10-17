import { useEffect, useMemo, useState, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import '../styles/DashboardLayout.scss';
import {
  FaPlus, FaSearch, FaBoxes, FaChartBar, FaUser, FaHeadset, FaBars, FaTimes
} from 'react-icons/fa';
import { usePasswordFirstGuard } from '../hooks/usePasswordFirstGuard';

// 🔔 Aviso global de soporte
import { hasNotice, subscribeNotice, setNotice, clearNotice } from '../utils/supportNotice';
// 📩 Listado de tickets del cliente
import { listTickets } from '../services/ticketsService';

export default function DashboardLayout() {
  usePasswordFirstGuard();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Estado visual del aviso (badge rojo)
  const [supportNotice, setSupportNotice] = useState(hasNotice());

  // Evitar carreras de estado durante polling
  const pollingRef = useRef(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    const unsub = subscribeNotice(setSupportNotice);
    return unsub;
  }, []);

  // Si entras a /dashboard/soporte limpiamos la notificación
  useEffect(() => {
    const inSupport = location.pathname.includes('/dashboard/soporte');
    if (inSupport && supportNotice) clearNotice();
  }, [location.pathname, supportNotice]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setIsMobileSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 🔁 Polling ligero cada 15s para ver si hay alguna respuesta pendiente de cliente
  useEffect(() => {
    unmountedRef.current = false;

    async function checkSupportNotice() {
      try {
        // Busca tickets en estado "esperando_cliente" (ajusta si tu API usa otro literal)
        const r = await listTickets({ page: 1, pageSize: 1, estado: 'esperando_cliente' });
        const total = Number(r?.total ?? 0);
        // Si hay alguno, encendemos el aviso. Si no, lo apagamos.
        if (!location.pathname.includes('/dashboard/soporte')) {
          // solo marcar si no estás ya dentro de soporte
          setNotice(total > 0);
        } else {
          clearNotice();
        }
      } catch {
        // Silenciar errores de red; no romper UI
      }
    }

    // Primera comprobación inmediata
    checkSupportNotice();

    // Intervalo
    pollingRef.current = setInterval(checkSupportNotice, 15000);

    return () => {
      unmountedRef.current = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [location.pathname]);

  const sidebarItems = useMemo(() => ([
    { icon: <FaPlus />, label: 'Añadir paquete', path: 'anadir' },
    { icon: <FaSearch />, label: 'Buscar paquete', path: 'buscar' },
    { icon: <FaBoxes />, label: 'Ver estantes', path: 'almacen' },
  ]), []);

  const subNavbarItems = useMemo(() => ([
    { label: 'Dashboard', path: '.', icon: <FaChartBar />, end: true },
    { label: 'Área personal', path: 'personal', icon: <FaUser /> },
    { label: 'Soporte', path: 'soporte', icon: <FaHeadset />, key: 'soporte' },
  ]), []);

  const isSubnavActive = (basePath) => {
    if (basePath === '.')
      return location.pathname.endsWith('/dashboard') || location.pathname.endsWith('/dashboard/');
    return location.pathname.includes(`/dashboard/${basePath}`);
  };

  // ✅ Bottom-nav reestructurada: metemos "Área personal" y quitamos "Inicio"
  const bottomNavItems = useMemo(() => ([
    { key: 'buscar', label: 'Buscar',   path: 'buscar',   icon: <FaSearch /> },
    { key: 'almacen', label: 'Estantes', path: 'almacen',  icon: <FaBoxes /> },
        { key: 'anadir',  label: '',         path: 'anadir',   icon: <FaPlus />, primary: true },

    { key: 'soporte', label: 'Soporte',  path: 'soporte',  icon: <FaHeadset /> },
    { key: 'personal',label: 'Personal', path: 'personal', icon: <FaUser /> },
  ]), []);

  return (
    <div className="layout-dashboard">
      <aside className={`ld-sidebar ${isMobileSidebarOpen ? 'ld-open' : ''}`} aria-label="Menú lateral">
        <div className="ld-sidebar__header">
          <button className="ld-sidebar__close" onClick={() => setIsMobileSidebarOpen(false)} type="button">
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

      {isMobileSidebarOpen && (
        <button
          className="ld-sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setIsMobileSidebarOpen(false)}
          type="button"
        />
      )}

      <main className="ld-contenido">
        <div className="ld-topbar">
          <button className="ld-menu-btn" onClick={() => setIsMobileSidebarOpen(true)} type="button">
            <FaBars />
          </button>

          <div className="ld-subnavbar" role="tablist" aria-label="Secciones del panel">
            {subNavbarItems.map((item) => {
              const active = isSubnavActive(item.path);
              const isSupport = item.key === 'soporte';
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={() => `ld-subnav-item ${active ? 'ld-activo' : ''}`}
                  role="tab"
                  aria-selected={active}
                  onClick={() => { if (isSupport) clearNotice(); }}
                >
                  <div className="ld-icon">
                    {item.icon}
                    {isSupport && supportNotice && <span className="ld-bubble" aria-label="Nuevo mensaje de soporte" />}
                  </div>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        <div className="ld-vista ld-fade-in">
          <Outlet />
        </div>
      </main>

      <nav className="ld-bottomnav" aria-label="Navegación inferior">
        <ul className="ld-bottomnav__list">
          {bottomNavItems.map((item) => {
            const isSupport = item.key === 'soporte';
            return (
              <li key={item.key} className={`ld-bottomnav__li ${item.primary ? 'ld-primary-slot' : ''}`}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    ['ld-bottomnav__item', item.primary ? 'ld-primary' : '', isActive ? 'ld-activo' : ''].join(' ')
                  }
                  aria-label={item.label || 'Añadir'}
                  onClick={() => { if (isSupport) clearNotice(); }}
                >
                  <span className="ld-bottomnav__icon">
                    {item.icon}
                    {isSupport && supportNotice && <span className="ld-dot" aria-hidden="true" />}
                  </span>
                  {item.label && <span className="ld-bottomnav__label">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
        <div className="ld-bottomnav__safearea" />
      </nav>
    </div>
  );
}
