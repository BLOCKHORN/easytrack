// src/components/superadmin/SuperAdminNavbar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Icon from './Icon.jsx';
import '../../styles/SuperAdminNavbar.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

// keys para “último visto” (las seguimos usando para soporte; para demo ya no hacen falta)
const LAST_SEEN_DEMO    = 'sa_demo_last_seen';
const LAST_SEEN_SUPPORT = 'sa_support_last_seen';

export default function SuperAdminNavbar() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [authReady, setAuthReady] = useState(false);

  // Burbujas
  const [demoUnread, setDemoUnread] = useState(0);     // ← “Solicitudes” (total pendientes)
  const [supportUnread, setSupportUnread] = useState(0); // ← “Soporte”

  const navigate = useNavigate();
  const userBtnRef = useRef(null);

  // --------- Sesión / email visible ----------
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data?.user?.email || '');
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthReady(!!data?.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthReady(!!session);
      setEmail(session?.user?.email || '');
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // --------- Resize ----------
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  // --------- Cerrar dropdown al click fuera ----------
  useEffect(() => {
    const onDoc = (e) => {
      if (!userBtnRef.current) return;
      const menu = document.querySelector('.sa-nav__user-menu');
      const inside = userBtnRef.current.contains(e.target) || menu?.contains(e.target);
      if (!inside) setUserOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // --------- Lock scroll cuando el drawer está abierto ----------
  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [drawerOpen]);

  // --------- Helper fetch con token ----------
  async function authed(path) {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      await new Promise(r => setTimeout(r, 80));
      ({ data: { session } } = await supabase.auth.getSession());
    }
    const token = session?.access_token;
    if (!token) throw new Error('NO_AUTH_TOKEN');

    const res = await fetch(`${API}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`[SuperAdminNavbar] ${path} failed`, { status: res.status, body: json });
      throw new Error(json?.error || json?.code || `HTTP ${res.status}`);
    }
    return json;
  }

  // --------- Poll contadores cada 30s ----------
  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;
    let timer;

    const load = async () => {
      try {
        // --- DEMO / Formularios ---
        // Simplificamos: siempre mostramos el total de pendientes.
        // (así no dependemos de 'since' y la burbuja se ve en el dashboard)
        {
          const j = await authed(`/admin/demo-requests/counters`);
          const value = typeof j?.pending_total === 'number' ? j.pending_total : 0;
          if (!cancelled) setDemoUnread(value);
        }

        // --- SOPORTE ---
        {
          const raw = Number(localStorage.getItem(LAST_SEEN_SUPPORT) || 0);
          const since = raw ? raw - 2000 : undefined;
          const qs = since ? `?since=${encodeURIComponent(new Date(since).toISOString())}` : '';
          const j = await authed(`/admin/support/counters${qs}`);

          let value = 0;
          if (typeof j?.unread_since === 'number' && j.unread_since > 0) value = j.unread_since;
          else if (!since && typeof j?.unread_total === 'number' && j.unread_total > 0) value = j.unread_total;
          else if (since && j?.latest_message_at) value = new Date(j.latest_message_at).getTime() > since ? 1 : 0;

          if (!cancelled) setSupportUnread(value);
        }
      } catch (_e) {
        if (!cancelled) {
          setDemoUnread(0);
          setSupportUnread(0);
        }
      }
    };

    load();
    timer = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [authReady]);

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

        {/* Center: main tabs (desktop/tablet) */}
        <nav className="sa-nav__tabs" aria-label="Navegación principal">
          <NavLink to="/superadmin/home" className={({isActive}) => 'tab' + (isActive ? ' is-active' : '')}>
            <span>Inicio</span>
          </NavLink>

          <NavLink to="/superadmin/tenants" className={({isActive}) => 'tab' + (isActive ? ' is-active' : '')}>
            <span>Tenants</span>
          </NavLink>

          <NavLink
            to="/superadmin/requests"
            className={({isActive}) => 'tab' + (isActive ? ' is-active' : '')}
            onClick={() => { localStorage.setItem(LAST_SEEN_DEMO, String(Date.now())); setDemoUnread(0); }}
          >
            <span>Solicitudes</span>
            {demoUnread > 0 && (
              <span className="badge" aria-label="Solicitudes pendientes">{demoUnread > 99 ? '99+' : demoUnread}</span>
            )}
          </NavLink>

          <NavLink
            to="/superadmin/support"
            className={({isActive}) => 'tab' + (isActive ? ' is-active' : '')}
            onClick={() => { localStorage.setItem(LAST_SEEN_SUPPORT, String(Date.now())); setSupportUnread(0); }}
          >
            <span>Soporte</span>
            {supportUnread > 0 && (
              <span className="badge" aria-label="Mensajes de soporte sin leer">{supportUnread > 99 ? '99+' : supportUnread}</span>
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
              <button
                className="um__item"
                onClick={() => {
                  localStorage.setItem(LAST_SEEN_DEMO, String(Date.now()));
                  setDemoUnread(0);
                  setUserOpen(false);
                  navigate('/superadmin/requests');
                }}
                role="menuitem"
              >
                <Icon name="list" /> Revisar Solicitudes
                {demoUnread > 0 && <span className="badge ml8">{demoUnread > 99 ? '99+' : demoUnread}</span>}
              </button>
              <button
                className="um__item"
                onClick={() => {
                  localStorage.setItem(LAST_SEEN_SUPPORT, String(Date.now()));
                  setSupportUnread(0);
                  setUserOpen(false);
                  navigate('/superadmin/support');
                }}
                role="menuitem"
              >
                <Icon name="chat" /> Soporte
                {supportUnread > 0 && <span className="badge ml8">{supportUnread > 99 ? '99+' : supportUnread}</span>}
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
              <div className="drawer__email" title={email}>
                <Icon name="user" /> {email}
              </div>
            </div>

            <nav className="drawer__nav">
              <NavLink to="/superadmin/home" onClick={() => setDrawerOpen(false)} className="drawer__link">Inicio</NavLink>
              <NavLink to="/superadmin/tenants" onClick={() => setDrawerOpen(false)} className="drawer__link">Tenants</NavLink>
              <NavLink
                to="/superadmin/requests"
                onClick={() => {
                  localStorage.setItem(LAST_SEEN_DEMO, String(Date.now()));
                  setDemoUnread(0);
                  setDrawerOpen(false);
                }}
                className="drawer__link"
              >
                Solicitudes {demoUnread > 0 && <span className="badge ml8">{demoUnread > 99 ? '99+' : demoUnread}</span>}
              </NavLink>
              <NavLink
                to="/superadmin/support"
                onClick={() => {
                  localStorage.setItem(LAST_SEEN_SUPPORT, String(Date.now()));
                  setSupportUnread(0);
                  setDrawerOpen(false);
                }}
                className="drawer__link"
              >
                Soporte {supportUnread > 0 && <span className="badge ml8">{supportUnread > 99 ? '99+' : supportUnread}</span>}
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
