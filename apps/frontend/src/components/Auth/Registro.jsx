import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";
import { supabase } from "../../utils/supabaseClient";

const IconLogoRoute = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="18" r="3"/>
    <circle cx="19" cy="6" r="3"/>
    <path d="M5 15v-4a4 4 0 0 1 4-4h6a4 4 0 0 0 4-4V6"/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.61z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.85.85-3.04.85-2.34 0-4.32-1.58-5.03-3.71H.95v2.3C2.43 15.89 5.5 18 9 18z"/>
    <path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5H.95C.35 6.2 0 7.57 0 9s.35 2.8 1 4l2.97-2.3z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.47C13.47.98 11.43 0 9 0 5.5 0 2.43 2.11.95 5.1L3.97 7.4c.71-2.13 2.69-3.72 5.03-3.72z"/>
  </svg>
);

export default function Registro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    nombre_empresa: "",
    nombre_completo: "",
    email: "",
    password: "",
  });

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` }
    });
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.nombre_completo,
            nombre_empresa: formData.nombre_empresa,
            plan_inicial: 'free'
          },
          emailRedirectTo: `${window.location.origin}/auth/email-confirmado`
        }
      });
      if (authErr) throw authErr;
      if (authData.user) navigate("/auth/email-confirmado?mode=check-email");
    } catch (err) {
      setError(err.message || "Error al crear cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-200/60">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-8 group">
  
            </Link>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight mb-2">Crear cuenta</h2>
            <p className="text-slate-500 font-medium italic">Configura tu local en menos de 1 minuto.</p>
          </div>

          <button 
            onClick={handleGoogleLogin} 
            className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 mb-8 shadow-sm"
          >
            <GoogleIcon /> Continuar con Google
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-slate-400">
              <span className="bg-white px-4">O mediante email</span>
            </div>
          </div>

          <form onSubmit={handleRegistro} className="space-y-4">
            <div className="space-y-4">
              <input required type="text" placeholder="Nombre de tu negocio" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" onChange={(e) => setFormData({...formData, nombre_empresa: e.target.value})} />
              <input required type="text" placeholder="Tu nombre completo" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} />
              <input required type="email" placeholder="Correo electrónico" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input required type="password" placeholder="Contraseña" minLength={8} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl text-center border border-red-100">{error}</div>}

            <button disabled={loading} className="w-full py-5 bg-slate-950 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group text-lg shadow-xl shadow-slate-950/20 disabled:bg-slate-400">
              {loading ? "Preparando panel..." : "Empezar ahora"} <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm font-bold text-slate-500">
          ¿Ya tienes cuenta? <Link to="/login" className="text-brand-600 hover:text-brand-700 hover:underline">Inicia sesión</Link>
        </p>
      </motion.div>
    </div>
  );
}