import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.61z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.85.85-3.04.85-2.34 0-4.32-1.58-5.03-3.71H.95v2.3C2.43 15.89 5.5 18 9 18z"/>
    <path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5H.95C.35 6.2 0 7.57 0 9s.35 2.8 1 4l2.97-2.3z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.47C13.47.98 11.43 0 9 0 5.5 0 2.43 2.11.95 5.1L3.97 7.4c.71-2.13 2.69-3.72 5.03-3.72z"/>
  </svg>
);

export default function LoginModal({ onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authErr) {
      setError("Credenciales incorrectas. Por favor, inténtalo de nuevo.");
      setLoading(false);
    } else {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
        const r = await fetch(`${API_BASE}/api/tenants/me`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` }
        });
        if (r.ok) {
          const tData = await r.json();
          if (tData?.tenant?.slug) {
            onClose();
            navigate(`/${tData.tenant.slug}/dashboard`);
            return;
          }
        }
      } catch (err) {}
      
      onClose();
      navigate("/dashboard");
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` }
    });
  };

  const goToRecovery = () => {
    onClose();
    navigate('/crear-password');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative bg-white w-full max-w-[420px] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden p-8 md:p-10"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Inicia sesión en tu cuenta</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo electrónico</label>
            <input 
              required 
              type="email" 
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-slate-900 shadow-sm" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-slate-700">Contraseña</label>
              <button type="button" onClick={goToRecovery} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">¿No recuerdas la contraseña?</button>
            </div>
            <input 
              required 
              type="password" 
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-slate-900 shadow-sm" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">{error}</div>}

          <button disabled={loading} className="w-full py-2.5 mt-2 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-all shadow-sm disabled:bg-slate-300 active:scale-[0.98]">
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-xs font-medium text-slate-500"><span className="bg-white px-4">O iniciar sesión con</span></div>
        </div>

        <button onClick={handleGoogle} className="w-full py-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]">
          <GoogleIcon /> Google
        </button>

        <div className="mt-8 text-center bg-slate-50 -mx-8 -mb-10 p-6 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            ¿Eres nuevo en EasyTrack? <button onClick={() => { onClose(); navigate('/registro'); }} className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">Crea una cuenta</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}