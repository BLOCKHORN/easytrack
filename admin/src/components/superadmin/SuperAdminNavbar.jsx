import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Icon from './Icon.jsx';
import '../../styles/SuperAdminNavbar.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');

export default function SuperAdminNavbar() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pendingUnseen, setPendingUnseen] = useState(0); // <-- NUEVO
  const navigate = useNavigate();
  const userBtnRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || ''));
  }, []);

  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const onDoc = (e) => {
      if (!userBtnRef.current) return;
      if (!userBtnRef.current.closest) return;
      const menu = document.querySelector('.sa-nav__user-menu');
      const clickedInside = userBtnRef.current.contains(e.target) || menu?.contains(e.target);
      if (!clickedInside) setUserOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  async function authed(path) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    const res = await fetch(`${API}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  // Poll contadores cada 30s (y al montar)
  useEffect(() => {
    let timer;
    const load = async () => {
      try {
        const j = await authed('/admin/demo-requests/counters');
        setPendingUnseen(Number(j?.pending_unseen || 0));
      } catch { /* noop */ }
    };
    load();
    timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  async function onLogout() {
    try { await supabase.auth.signOut(); }
    finally { navigate('/'); }
  }

  return (
    <header className="sa-nav">
      <div className="sa-nav__inner">
        {/* Left: brand + hamburger */}
        <div className="sa-nav__left">
          {isMobile && (
            <button
              className="icon-btn"
              onClick={() => setDrawerOpen(v => !v)}
              aria-label="Abrir menú"
            >
              <Icon name="menu" />
            </button>
          )}

          <button
            className="brand"
            onClick={() => navigate('/superadmin/home')}
            aria-label="Ir al inicio"
          >
            <Icon name="dot" className="brand-dot" />
            <span className="brand__name">EasyTrack</span>
            <span className="brand__sep">—</span>
            <span className="brand__area">Superadmin</span>
          </button>
        </div>

        {/* Center: main tabs (solo desktop/tablet) */}
        <nav className="sa-nav__tabs" aria-label="Navegación principal">
          <NavLink to="/superadmin/home" className={({isActive}) => 'tab' + (isActive ? ' is-active' : '')}>
            <span>Inicio</span>
          </NavLink>
          <NavLink to="/superadmin/tenants" className={({isActive}) => 'tab' + (isActive ? ' is-active' : '')}>
            <span>Tenants</span>
          </NavLink>
          <NavLink to="/superadmin/requests" className={({isActive}) => 'tab' + (isActive ? ' is-active' : '')}>
            <span>Solicitudes</span>
            {pendingUnseen > 0 && (
              <span className="badge badge--warn" aria-label="Solicitudes pendientes sin revisar">
                {pendingUnseen}
              </span>
            )}
          </NavLink>
        </nav>

        {/* Right: user */}
        <div className="sa-nav__right">
          <button
            ref={userBtnRef}
            className={`userbtn ${userOpen ? 'is-open' : ''}`}
            onClick={() => setUserOpen(v => !v)}
            aria-expanded={userOpen ? 'true' : 'false'}
            aria-haspopup="menu"
            title={email || 'Cuenta'}
          >
            <span className="userbtn__avatar"><Icon name="user" /></span>
            <span className="userbtn__email">{email}</span>
          </button>

          {userOpen && (
            <div className="sa-nav__user-menu" role="menu">
              <div className="um__email">{email}</div>
              <hr />
              <button className="um__item" onClick={() => { setUserOpen(false); navigate('/superadmin/home'); }} role="menuitem">
                <Icon name="gauge" /> Inicio
              </button>
              <button className="um__item" onClick={() => { setUserOpen(false); navigate('/superadmin/tenants'); }} role="menuitem">
                <Icon name="db" /> Gestionar Tenants
              </button>
              <button className="um__item" onClick={() => { setUserOpen(false); navigate('/superadmin/requests'); }} role="menuitem">
                <Icon name="list" /> Revisar Solicitudes
                {pendingUnseen > 0 && <span className="badge badge--warn ml8">{pendingUnseen}</span>}
              </button>
              <hr />
              <button className="um__item um__item--danger" onClick={onLogout} role="menuitem">
                <Icon name="logout" /> Salir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawer móvil */}
      {isMobile && drawerOpen && (
        <div
          className="sa-nav__drawer"
          onClick={() => setDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="sa-nav__drawer-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer__head">
              <div className="brand brand--drawer">
                <Icon name="dot" className="brand-dot" />
                <span className="brand__name">EasyTrack</span>
                <span className="brand__sep">—</span>
                <span className="brand__area">Superadmin</span>
              </div>
              <div className="drawer__email">
                <Icon name="user" /> {email}
              </div>
            </div>

            <nav className="drawer__nav">
              <NavLink to="/superadmin/home" onClick={() => setDrawerOpen(false)} className="drawer__link">Inicio</NavLink>
              <NavLink to="/superadmin/tenants" onClick={() => setDrawerOpen(false)} className="drawer__link">Tenants</NavLink>
              <NavLink to="/superadmin/requests" onClick={() => setDrawerOpen(false)} className="drawer__link">
                Solicitudes {pendingUnseen > 0 && <span className="badge badge--warn ml8">{pendingUnseen}</span>}
              </NavLink>
            </nav>

            <div className="drawer__foot">
              <button className="btn btn--danger" onClick={onLogout}>
                <Icon name="logout" /> Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
