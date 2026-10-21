import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation, Outlet } from 'react-router-dom';

import AnalyticsTracker from './components/Routing/AnalyticsTracker'; 

// Eagerly loaded public components (Core Landing)
import LandingPage from './components/Landing/LandingPage';
import Navbar from './components/Landing/Navbar';
import Footer from './components/Landing/Footer';

// Routing Guards
import ProtectedRoute from './components/Routing/ProtectedRoute';
import AdminRoute from './components/Routing/AdminRoute';

// Context
import { useModal } from './context/ModalContext';
import { useTenant } from './context/TenantContext';

// Lazy loaded: Dashboard
const DashboardLayout = lazy(() => import('./components/Dashboard/DashboardLayout'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const AnadirPaquete = lazy(() => import('./components/Dashboard/AnadirPaquete'));
const BuscarPaquete = lazy(() => import('./components/Dashboard/BuscarPaquete'));
const VerEstantes = lazy(() => import('./components/Dashboard/VerEstantes'));
const AreaPersonal = lazy(() => import('./components/Dashboard/AreaPersonal'));
const ConfigPage = lazy(() => import('./components/Configuracion/ConfigPage'));
const PartnerDashboard = lazy(() => import('./components/Dashboard/PartnerDashboard'));
const ReferidosCliente = lazy(() => import('./components/Dashboard/ReferidosCliente'));
const SoporteInterno = lazy(() => import('./components/Support/SupportRouter'));

// Lazy loaded: Auth
const Registro = lazy(() => import('./components/Auth/Registro'));
const AuthCallback = lazy(() => import('./components/Auth/AuthCallback'));
const CrearPassword = lazy(() => import('./components/Auth/CrearPassword'));
const EmailConfirmado = lazy(() => import('./components/Auth/EmailConfirmado'));
const LoginModal = lazy(() => import('./components/Auth/LoginModal'));

// Lazy loaded: Billing
const Billing = lazy(() => import('./components/Billing/Billing'));
const UpgradeSuccess = lazy(() => import('./components/Billing/UpgradeSuccess'));
const CheckoutCancel = lazy(() => import('./components/Billing/CheckoutCancel'));
const SubscriptionGate = lazy(() => import('./components/Billing/SubscriptionGate'));
const PortalBridge = lazy(() => import('./components/Billing/PortalBridge'));

// Lazy loaded: Legal & Support
const Soporte = lazy(() => import('./components/Support/Soporte'));
const Contacto = lazy(() => import('./components/Support/Contacto'));
const Sobre = lazy(() => import('./components/Legal/Sobre'));
const Privacidad = lazy(() => import('./components/Legal/Privacidad'));
const Terminos = lazy(() => import('./components/Legal/Terminos'));
const CookiesPage = lazy(() => import('./components/Legal/Cookies'));
const AvisoLegal = lazy(() => import('./components/Legal/AvisoLegal'));

// Lazy loaded: Admin
const AdminLayout = lazy(() => import('./components/Admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const AdminRadar = lazy(() => import('./components/Admin/AdminRadar'));
const AdminPartners = lazy(() => import('./components/Admin/AdminPartners'));

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

// Sustituto interno para RedirectToMyTenant
function RedirectToDashboard() {
  const navigate = useNavigate();
  const { tenant, loading } = useTenant();

  useEffect(() => {
    if (loading) return;
    if (!tenant?.slug) {
      navigate('/', { replace: true });
    } else {
      navigate(`/${tenant.slug}/dashboard`, { replace: true });
    }
  }, [tenant, loading, navigate]);

  return null;
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
    if (!loading && tenant) {
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

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8">
      <div className="w-7 h-7 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
}

function PublicLayout() {
  const location = useLocation();
  const hideNavRoutes = ['/registro', '/crear-password', '/auth/email-confirmado'];
  const isAuthPage = hideNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900 flex flex-col">
      {!isAuthPage && <Navbar />}
      <main className="flex-1 flex flex-col">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default function App() {
  const { modal, openLogin, closeModal } = useModal();

  useEffect(() => {
    // Control del Modal de Login
    window.__openLoginModal = () => { if (typeof openLogin === 'function') openLogin(); };
    const handler = () => { if (typeof openLogin === 'function') openLogin(); };
    window.addEventListener('login:open', handler);

    // Keepalive global integrado
    const isLocal = /^(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.ngrok-free\.dev|.*\.devtunnels\.ms|.*easytrack\.pro|.*easytrack\.es)$/.test(window.location.hostname);
    const PROD_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
    const API_BASE = isLocal ? '' : PROD_URL;

    const keepAliveId = setInterval(() => {
      fetch(`${API_BASE}/health`, { method: "GET", cache: "no-store" }).catch(() => {});
    }, 4 * 60 * 1000);

    return () => {
      window.removeEventListener('login:open', handler);
      clearInterval(keepAliveId);
    };
  }, [openLogin]);

  return (
    <Router>
      <AnalyticsTracker />
      <ScrollWithHash />
      <Suspense fallback={<PageFallback />}>
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
            <Route path="/legal/cookies" element={<CookiesPage />} />
            <Route path="/legal/aviso-legal" element={<AvisoLegal />} />
            <Route path="/privacidad" element={<Privacidad />} />
            <Route path="/terminos" element={<Terminos />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/aviso-legal" element={<AvisoLegal />} />
            
            <Route path="/crear-password" element={<CrearPassword />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/auth/email-confirmado" element={<EmailConfirmado />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/login" element={<LoginRoute />} />
          </Route>

          {/* ZONA DE ADMINISTRACIÓN (MODO DIOS) */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="negocios" element={<AdminDashboard />} />
              <Route path="radar" element={<AdminRadar />} />
              <Route path="partners" element={<AdminPartners />} />
            </Route>
          </Route>

          {/* STRIPE / BILLING GATES */}
          <Route path="/upgrade/success" element={<UpgradeSuccess />} />
          <Route path="/upgrade/cancel" element={<CheckoutCancel />} />
          <Route path="/gate" element={<SubscriptionGate />} />
          <Route path="/portal" element={<PortalBridge />} />

          {/* SHORTCUT REDIRECTS */}
          <Route path="/dashboard" element={<RedirectToDashboard />} />

          {/* PROTECTED DASHBOARD ROUTES */}
          <Route
            path="/:tenantSlug/dashboard"
            element={
              <ProtectedRoute>
                 <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="anadir" element={<AnadirPaquete />} />
            <Route path="buscar" element={<BuscarPaquete />} />
            <Route path="almacen" element={<VerEstantes />} />
            <Route path="personal" element={<AreaPersonal />} />
            <Route path="referidos" element={<PartnerDashboard />} /> 
            <Route path="invitar" element={<ReferidosCliente />} /> {/* <-- NUEVA RUTA CLIENTE AQUÍ */}
            
            <Route path="facturacion" element={<Billing />} />
            <Route path="configuracion" element={<ConfigPage />} />
            <Route path="soporte" element={<SoporteInterno />} />
          </Route>

          {/* CATCH ALL */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      
      {modal === 'login' && (
        <Suspense fallback={null}>
          <LoginModal onClose={closeModal} />
        </Suspense>
      )}
    </Router>
  );
}