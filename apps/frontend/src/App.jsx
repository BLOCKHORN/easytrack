import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';

import AnalyticsTracker from './components/Routing/AnalyticsTracker'; 

import LandingPage from './components/Landing/LandingPage';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import Dashboard from './components/Dashboard/Dashboard';
import AnadirPaquete from './components/Dashboard/AnadirPaquete';
import BuscarPaquete from './components/Dashboard/BuscarPaquete';
import VerEstantes from './components/Dashboard/VerEstantes';
import AreaPersonal from './components/Dashboard/AreaPersonal';
import ConfigPage from './components/Configuracion/ConfigPage';
import PartnerDashboard from './components/Dashboard/PartnerDashboard'; // <-- IMPORTACIÓN NUEVA

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

import Navbar from './components/Landing/Navbar';
import Footer from './components/Landing/Footer';

// --- RUTAS Y GUARDIANES ---
import ProtectedRoute from './components/Routing/ProtectedRoute';
import AdminRoute from './components/Routing/AdminRoute';

// --- MODO ADMIN (DIOS) ---
import AdminLayout from './components/Admin/AdminLayout';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminRadar from './components/Admin/AdminRadar';
import AdminPartners from './components/Admin/AdminPartners';

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

export default function App() {
  const { modal, openLogin, closeModal } = useModal();

  useEffect(() => {
    // Control del Modal de Login
    window.__openLoginModal = () => { if (typeof openLogin === 'function') openLogin(); };
    const handler = () => { if (typeof openLogin === 'function') openLogin(); };
    window.addEventListener('login:open', handler);

    // Keepalive global integrado
    const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
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
          <Route path="referidos" element={<PartnerDashboard />} /> {/* <-- NUEVA RUTA AQUÍ */}
          
          <Route path="facturacion" element={<Billing />} />
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