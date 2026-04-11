import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';

import LandingPage from './components/Landing/LandingPage';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import Dashboard from './components/Dashboard/Dashboard';
import AnadirPaquete from './components/Dashboard/AnadirPaquete';
import BuscarPaquete from './components/Dashboard/BuscarPaquete';
import VerEstantes from './components/Dashboard/VerEstantes';
import AreaPersonal from './components/Dashboard/AreaPersonal';
import ConfigPage from './components/Configuracion/ConfigPage';

import Registro from './components/Auth/Registro';
import CrearPassword from './components/Auth/CrearPassword';
import EmailConfirmado from './components/Auth/EmailConfirmado';
import LoginModal from './components/Auth/LoginModal';

// --- MÓDULO BILLING ---
import Billing from './components/Billing/Billing';
import UpgradeSuccess from './components/Billing/UpgradeSuccess';
import CheckoutCancel from './components/Billing/CheckoutCancel';
import SubscriptionGate from './components/Billing/SubscriptionGate';
import PortalBridge from './components/Billing/PortalBridge';

import Soporte from './components/Support/Soporte';
import Contacto from './components/Support/Contacto';
import SoporteInterno from './components/Support/SupportRouter';
import Sobre from './components/Legal/Sobre';
import Privacidad from './components/Legal/Privacidad';
import Terminos from './components/Legal/Terminos';
import CookiesPage from './components/Legal/Cookies';

import Navbar from './components/Layout/Navbar/Navbar';
import Footer from './components/Layout/Footer';

import RequireActive from './components/Routing/RequireActive';
import { useModal } from './context/ModalContext';
import { useTenant } from './context/TenantContext';

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

function RedirectToMyTenant() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { tenant, loading } = useTenant();

  useEffect(() => {
    if (loading) return;
    if (!tenant?.slug) {
      navigate('/', { replace: true });
      return;
    }
    navigate(`/${tenant.slug}/dashboard${loc.search || ''}${loc.hash || ''}`, { replace: true });
  }, [tenant, loading, navigate, loc.search, loc.hash]);

  return null;
}

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { tenant, loading } = useTenant();

  useEffect(() => {
    if (loading) return;
    if (!tenant?.slug) {
      navigate('/', { replace: true });
      return;
    }
    if (!tenantSlug || tenantSlug !== tenant.slug) {
      const tail = location.pathname.replace(/^\/[^/]+/, '');
      const cleanTail = tail.startsWith('/') ? tail : '/' + tail;
      navigate(`/${tenant.slug}${cleanTail}`, { replace: true });
    }
  }, [tenant, loading, tenantSlug, navigate, location.pathname]);

  if (loading || !tenant) return null;
  return children;
}

function NotFound() {
  return (
    <section className="max-w-xl mx-auto mt-20 p-8 text-center font-sans">
      <h1 className="text-5xl font-black text-zinc-950 mb-4">404</h1>
      <p className="text-zinc-500 font-bold mb-8 text-lg">Página no encontrada.</p>
      <a className="px-6 py-3.5 bg-zinc-950 hover:bg-zinc-800 transition-colors text-white font-black rounded-xl shadow-lg" href="/">Volver al inicio</a>
    </section>
  );
}

function LoginRoute() {
  const { openLogin } = useModal();
  const navigate = useNavigate();
  const { tenant, loading } = useTenant();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (tenant) {
      navigate(`/${tenant.slug}/dashboard`, { replace: true });
      return;
    }
    if (!armed) {
      if (typeof openLogin === 'function') openLogin();
      setArmed(true);
    }
  }, [tenant, loading, openLogin, navigate, armed]);

  return null;
}

function PublicLayout() {
  const location = useLocation();
  const hideNavRoutes = ['/registro', '/crear-password', '/auth/email-confirmado'];
  const isAuthPage = hideNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900 flex flex-col">
      {!isAuthPage && <Navbar />}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

function RedirectShortToSlug({ subpath }) {
  const navigate = useNavigate();
  const { tenant, loading } = useTenant();
  useEffect(() => {
    if (loading) return;
    if (!tenant?.slug) { navigate('/', { replace: true }); return; }
    navigate(`/${tenant.slug}${subpath}`, { replace: true });
  }, [tenant, loading, navigate, subpath]);
  return null;
}

export default function App() {
  const { modal, openLogin, closeModal } = useModal();

  useEffect(() => {
    window.__openLoginModal = () => { if (typeof openLogin === 'function') openLogin(); };
    const handler = () => { if (typeof openLogin === 'function') openLogin(); };
    window.addEventListener('login:open', handler);
    return () => window.removeEventListener('login:open', handler);
  }, [openLogin]);

  return (
    <Router>
      <ScrollWithHash />
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/caracteristicas" element={<LandingSection sectionId="features" />} />
          <Route path="/sobre-nosotros" element={<Sobre />} />
          <Route path="/soporte" element={<Soporte />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/legal/privacidad" element={<Privacidad />} />
          <Route path="/legal/terminos" element={<Terminos />} />
          
          <Route path="/crear-password" element={<CrearPassword />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/auth/email-confirmado" element={<EmailConfirmado />} />
          <Route path="/login" element={<LoginRoute />} />
        </Route>

        {/* STRIPE / BILLING GATES (No llevan el layout del dashboard) */}
        <Route path="/upgrade/success" element={<UpgradeSuccess />} />
        <Route path="/upgrade/cancel" element={<CheckoutCancel />} />
        <Route path="/gate" element={<SubscriptionGate />} />
        <Route path="/portal" element={<PortalBridge />} />

        {/* SHORTCUT REDIRECTS */}
        <Route path="/dashboard" element={<RedirectToMyTenant />} />
        <Route path="/configuracion" element={<RedirectShortToSlug subpath="/dashboard/configuracion" />} />

        {/* PROTECTED DASHBOARD ROUTES */}
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
          
          <Route path="facturacion" element={<Billing />} /> {/* NUEVO MÓDULO */}
          <Route path="configuracion" element={<ConfigPage />} />
          <Route path="soporte" element={<SoporteInterno />} />
        </Route>

        {/* CATCH ALL */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {modal === 'login' && <LoginModal onClose={closeModal} />}
    </Router>
  );
}