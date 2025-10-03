// src/App.jsx
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

import LandingPage from './pages/landing/LandingPage';
import DashboardLayout from './components/DashboardLayout';
import AnadirPaquete from './pages/AnadirPaquete';
import BuscarPaquete from './pages/BuscarPaquete';
import VerEstantes from './pages/VerEstantes';
import ConfigPage from './pages/configuracion/ConfigPage';
import Dashboard from './pages/Dashboard';
import AreaPersonal from './pages/AreaPersonal';
import Registro from './pages/Registro';
import UpgradeSuccess from './pages/UpgradeSuccess';

import Navbar from './components/navbar/Navbar';
import Footer from './components/Footer';

import { useModal } from './context/ModalContext';
import LoginModal from './components/LoginModal';

import Sobre from './pages/Sobre';
import Soporte from './pages/Soporte';
import Contacto from './pages/Contacto';
import Privacidad from './pages/Privacidad';
import Terminos from './pages/Terminos';
import CookiesPage from './pages/Cookies';
import AutoUpgrade from './components/billing/AutoUpgrade';
import PortalSuscripcion from './pages/PortalSuscripcion';
import CrearPassword from './pages/CrearPassword';
import EmailConfirmado from './pages/EmailConfirmado';

import RequireActive from './components/RequireActive';
import SubscriptionGate from './pages/SubscriptionGate';
import PortalBridge from './pages/PortalBridge';
import { supabase } from './utils/supabaseClient';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

function ScrollWithHash() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.hash]);
  return null;
}

function LandingSection({ sectionId }) {
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [sectionId]);
  return <LandingPage />;
}

function Redirect({ to }) {
  const navigate = useNavigate();
  useEffect(() => { navigate(to, { replace: true }); }, [navigate, to]);
  return null;
}

function RedirectPreserveHash({ to }) {
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    navigate(`${to}${loc.search || ''}${loc.hash || ''}`, { replace: true });
  }, [navigate, to, loc.search, loc.hash]);
  return null;
}

function RedirectToMyTenant() {
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/', { replace: true });

      const r = await fetch(`${API}/api/tenants/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (r.status === 402) return navigate('/reactivar?reason=inactive', { replace: true });
      if (!r.ok) return navigate('/', { replace: true });

      const { tenant } = await r.json();
      if (!tenant?.slug) return navigate('/', { replace: true });

      navigate(`/${tenant.slug}/dashboard${loc.search || ''}${loc.hash || ''}`, { replace: true });
    })();
  }, [navigate, loc.search, loc.hash]);
  return null;
}

function RedirectShortToSlug({ subpath }) {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/', { replace: true });

      const r = await fetch(`${API}/api/tenants/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (r.status === 402) return navigate('/reactivar?reason=inactive', { replace: true });
      if (!r.ok) return navigate('/', { replace: true });

      const { tenant } = await r.json();
      if (!tenant?.slug) return navigate('/', { replace: true });

      navigate(`/${tenant.slug}${subpath}`, { replace: true });
    })();
  }, [navigate, subpath]);
  return null;
}

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const location = useLocation();

  useEffect(() => {
    let unsub;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/', { replace: true });

      const r = await fetch(`${API}/api/tenants/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (r.status === 402) return navigate('/reactivar?reason=inactive', { replace: true });
      if (!r.ok) return navigate('/', { replace: true });

      const { tenant } = await r.json();
      if (!tenant?.slug) return navigate('/', { replace: true });

      if (!tenantSlug || tenantSlug !== tenant.slug) {
        const tail = location.pathname.replace(/^\/[^/]+/, '');
        return navigate(`/${tenant.slug}${tail || '/dashboard'}`, { replace: true });
      }
    })();

    const s = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/', { replace: true });
    });
    unsub = s?.data?.subscription?.unsubscribe;

    return () => unsub && unsub();
  }, [tenantSlug, navigate, location.pathname]);

  return children;
}

function NotFound() {
  return (
    <section style={{ maxWidth: 560, margin: '56px auto', padding: 24 }}>
      <h1>404</h1>
      <p>Página no encontrada.</p>
      <a className="btn ghost" href="/">Ir al inicio</a>
    </section>
  );
}

/* -------------------- FIX: /login abre/espera/cierra bien el modal -------------------- */
function LoginRoute() {
  const { modal, openLogin } = useModal(); // ← usamos openLogin del contexto
  const navigate = useNavigate();
  const location = useLocation();
  const [armed, setArmed] = useState(false); // sólo reaccionar al cierre después de abrir

  // Si ya hay sesión → dashboard. Si no, abre el modal (una sola vez).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        navigate('/dashboard', { replace: true });
        return;
      }
      if (!armed) {
        // abrir login modal de forma canónica
        if (typeof openLogin === 'function') openLogin();
        setArmed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [openLogin, navigate, armed]);

  // Cerrar la ruta SOLO cuando:
  // 1) ya intentamos abrir (armed === true)
  // 2) el modal ya no está abierto
  // 3) seguimos en /login (evita interferir con otras rutas)
  useEffect(() => {
    if (!armed) return;
    if (location.pathname !== '/login') return;
    if (modal !== 'login') {
      if (window.history.length > 1) navigate(-1);
      else navigate('/', { replace: true });
    }
  }, [modal, armed, navigate, location.pathname]);

  return null; // El modal se renderiza globalmente en <App/>
}
/* ------------------------------------------------------------------------------------- */

export default function App() {
  // NOTA: el contexto expone openLogin/closeModal. No todos los contextos exponen openModal(string).
  const { modal, openLogin, closeModal } = useModal();

  // ➜ Exponer un hook global para abrir el login modal desde cualquier sitio
  useEffect(() => {
    // Si el contexto cambia de API, aquí siempre usamos openLogin()
    window.__openLoginModal = () => {
      if (typeof openLogin === 'function') openLogin();
    };
    const handler = () => {
      if (typeof openLogin === 'function') openLogin();
    };
    window.addEventListener('login:open', handler);
    return () => window.removeEventListener('login:open', handler);
  }, [openLogin]);

  return (
    <Router>
      <ScrollWithHash />
      <Navbar />

      {/* Escucha de intents (upgrade) ya logueado */}
      <AutoUpgrade />

      <Routes>
        {/* Público */}
        <Route path="/" element={<LandingPage />} />

        {/* Aliases SEO */}
        <Route path="/caracteristicas" element={<LandingSection sectionId="features" />} />
        <Route path="/como-funciona" element={<LandingSection sectionId="como-funciona" />} />

        {/* Páginas estáticas */}
        <Route path="/sobre-nosotros" element={<Sobre />} />
        <Route path="/soporte" element={<Soporte />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/legal/privacidad" element={<Privacidad />} />
        <Route path="/legal/terminos" element={<Terminos />} />
        <Route path="/legal/cookies" element={<CookiesPage />} />

        {/* Back-compat */}
        <Route path="/sobre" element={<Redirect to="/sobre-nosotros" />} />
        {/* <Route path="/planes" element={<Redirect to="/precios" />} /> */}
        <Route path="/privacidad" element={<Redirect to="/legal/privacidad" />} />
        <Route path="/terminos" element={<Redirect to="/legal/terminos" />} />
        <Route path="/docs" element={<Redirect to="/soporte#faq" />} />
        <Route path="/changelog" element={<Redirect to="/soporte#faq" />} />
        <Route path="/blog" element={<Redirect to="/soporte" />} />

        {/* Upgrade success */}
        <Route path="/upgrade/success" element={<UpgradeSuccess />} />
        <Route path="/billing/success" element={<UpgradeSuccess />} />
        <Route path="/checkout/success" element={<UpgradeSuccess />} />

        {/* Auth */}
        <Route path="/crear-password" element={<CrearPassword />} />
        <Route path="/create-password" element={<RedirectPreserveHash to="/crear-password" />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/auth/email-confirmado" element={<EmailConfirmado />} />

        {/* NUEVO: ruta profunda que abre el modal de login */}
        <Route path="/login" element={<LoginRoute />} />

        {/* Reactivación */}
        <Route path="/reactivar" element={<SubscriptionGate />} />

        {/* Portal */}
        <Route path="/portal" element={<PortalBridge />} />
        <Route
          path="/:tenantSlug/portal"
          element={
            <ProtectedRoute>
              <PortalBridge />
            </ProtectedRoute>
          }
        />

        {/* Rutas cortas → slug */}
        <Route path="/dashboard" element={<RedirectToMyTenant />} />
        <Route path="/personal" element={<RedirectToMyTenant />} />
        <Route path="/almacen" element={<RedirectToMyTenant />} />
        <Route path="/configuracion" element={<RedirectShortToSlug subpath="/dashboard/configuracion" />} />

        {/* Privado con slug */}
        <Route
          path="/:tenantSlug/dashboard"
          element={
            <ProtectedRoute>
              <RequireActive>
                <DashboardLayout />
              </RequireActive>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="anadir" element={<AnadirPaquete />} />
          <Route path="buscar" element={<BuscarPaquete />} />
          <Route path="almacen" element={<VerEstantes />} />
          <Route path="personal" element={<AreaPersonal />} />
          <Route path="configuracion" element={<ConfigPage />} />
        </Route>

        {/* Legacy opcional */}
        <Route
          path="/:tenantSlug/portal-legacy"
          element={
            <ProtectedRoute>
              <RequireActive>
                <PortalSuscripcion />
              </RequireActive>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* El modal se pinta globalmente */}
      {modal === 'login' && <LoginModal onClose={closeModal} />}

      <Footer />
    </Router>
  );
}
