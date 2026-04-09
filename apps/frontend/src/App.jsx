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

import UpgradeSuccess from './components/Billing/UpgradeSuccess';
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

function RedirectShortToSlug({ subpath }) {
  const navigate = useNavigate();
  const { tenant, loading } = useTenant();

  useEffect(() => {
    if (loading) return;
    if (!tenant?.slug) {
      navigate('/', { replace: true });
      return;
    }
    navigate(`/${tenant.slug}${subpath}`, { replace: true });
  }, [tenant, loading, navigate, subpath]);

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
    <section className="max-w-xl mx-auto mt-20 p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-slate-500 mb-8">Página no encontrada.</p>
      <a className="px-6 py-3 bg-brand-600 text-white font-bold rounded-lg" href="/">Ir al inicio</a>
    </section>
  );
}

function LoginRoute() {
  const { modal, openLogin } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    if (!armed) return;
    if (location.pathname !== '/login') return;
    if (modal !== 'login') {
      if (window.history.length > 1) navigate(-1);
      else navigate('/', { replace: true });
    }
  }, [modal, armed, navigate, location.pathname]);

  return null;
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const { modal, openLogin, closeModal } = useModal();

  useEffect(() => {
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
      
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/caracteristicas" element={<LandingSection sectionId="features" />} />
          <Route path="/como-funciona" element={<LandingSection sectionId="como-funciona" />} />
          <Route path="/sobre-nosotros" element={<Sobre />} />
          <Route path="/soporte" element={<Soporte />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/legal/privacidad" element={<Privacidad />} />
          <Route path="/legal/terminos" element={<Terminos />} />
          <Route path="/legal/cookies" element={<CookiesPage />} />
          
          <Route path="/upgrade/success" element={<UpgradeSuccess />} />
          <Route path="/billing/success" element={<UpgradeSuccess />} />
          <Route path="/checkout/success" element={<UpgradeSuccess />} />
          
          <Route path="/crear-password" element={<CrearPassword />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/auth/email-confirmado" element={<EmailConfirmado />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/reactivar" element={<SubscriptionGate />} />
          
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/create-password" element={<RedirectPreserveHash to="/crear-password" />} />
        <Route path="/sobre" element={<Redirect to="/sobre-nosotros" />} />
        <Route path="/privacidad" element={<Redirect to="/legal/privacidad" />} />
        <Route path="/terminos" element={<Redirect to="/legal/terminos" />} />
        <Route path="/docs" element={<Redirect to="/soporte#faq" />} />
        <Route path="/changelog" element={<Redirect to="/soporte#faq" />} />
        <Route path="/blog" element={<Redirect to="/soporte" />} />
        
        <Route path="/portal" element={<PortalBridge />} />
        <Route path="/:tenantSlug/portal" element={<ProtectedRoute><PortalBridge /></ProtectedRoute>} />
        <Route path="/dashboard" element={<RedirectToMyTenant />} />
        <Route path="/personal" element={<RedirectToMyTenant />} />
        <Route path="/almacen" element={<RedirectToMyTenant />} />
        <Route path="/configuracion" element={<RedirectShortToSlug subpath="/dashboard/configuracion" />} />

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
          <Route path="soporte" element={<SoporteInterno />} />
        </Route>
      </Routes>

      {modal === 'login' && <LoginModal onClose={closeModal} />}
    </Router>
  );
}