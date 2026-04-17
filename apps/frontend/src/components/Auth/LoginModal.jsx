import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.61z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.85.85-3.04.85-2.34 0-4.32-1.58-5.03-3.71H.95v2.3C2.43 15.89 5.5 18 9 18z"/>
    <path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5H.95C.35 6.2 0 7.57 0 9s.35 2.8 1 4l2.97-2.3z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.47C13.47.98 11.43 0 9 0 5.5 0 2.43 2.11.95 5.1L3.97 7.4c.71-2.13 2.69-3.72 5.03-3.72z"/>
  </svg>
);

const IconShieldAlert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export default function LoginModal({ onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- SISTEMA ANTI-FUERZA BRUTA ---
  const [intentos, setIntentos] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => setLockoutTime(p => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (lockoutTime === 0 && intentos >= 3) {
      setIntentos(0);
      setError("");
    }
  }, [lockoutTime, intentos]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutTime > 0) return;
    
    setLoading(true);
    setError("");

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authErr) {
      const nuevosIntentos = intentos + 1;
      setIntentos(nuevosIntentos);
      
      if (nuevosIntentos >= 3) {
        setLockoutTime(30);
        setError("Demasiados intentos fallidos. Sistema bloqueado temporalmente.");
      } else {
        setError(`Credenciales incorrectas. Intentos restantes: ${3 - nuevosIntentos}`);
      }
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

  const isLockedOut = lockoutTime > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-zinc-950/70" 
        onClick={() => !isLockedOut && onClose()} 
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`relative w-full max-w-[420px] rounded-3xl shadow-2xl overflow-hidden border will-change-transform transition-colors duration-500 ${isLockedOut ? 'bg-red-50 border-red-200' : 'bg-white border-zinc-100'}`}
      >
        <div className="p-8 md:p-10">
          <div className="mb-8">
            <h2 className={`text-2xl font-black tracking-tight mb-1 ${isLockedOut ? 'text-red-950' : 'text-zinc-950'}`}>
              {isLockedOut ? 'Acceso Bloqueado' : 'Inicia sesión'}
            </h2>
            {isLockedOut && (
              <p className="text-red-600 font-bold text-sm flex items-center gap-1.5 mt-2">
                <IconShieldAlert /> Por seguridad, espera {lockoutTime}s
              </p>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">Correo electrónico</label>
              <input 
                required 
                type="email" 
                disabled={isLockedOut}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-zinc-950 font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-zinc-700">Contraseña</label>
                <button type="button" onClick={goToRecovery} disabled={isLockedOut} className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">¿Olvidaste la contraseña?</button>
              </div>
              <input 
                required 
                type="password" 
                disabled={isLockedOut}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-zinc-950 font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`p-4 text-sm font-bold rounded-xl border ${isLockedOut ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button disabled={loading || isLockedOut} className={`w-full py-3.5 mt-2 text-white font-black text-lg rounded-xl transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 ${isLockedOut ? 'bg-red-950' : 'bg-zinc-950 hover:bg-zinc-800 shadow-zinc-950/10'}`}>
              {loading ? "Iniciando sesión..." : (isLockedOut ? "Bloqueado" : "Iniciar sesión")}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isLockedOut ? 'border-red-200' : 'border-zinc-200'}`}></div></div>
            <div className={`relative flex justify-center text-xs font-black uppercase tracking-widest ${isLockedOut ? 'text-red-400' : 'text-zinc-400'}`}>
              <span className={isLockedOut ? 'bg-red-50 px-4' : 'bg-white px-4'}>O continuar con</span>
            </div>
          </div>

          <button onClick={handleGoogle} disabled={isLockedOut} className="w-full py-3.5 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100">
            <GoogleIcon /> Google
          </button>
        </div>

        <div className={`text-center p-6 border-t transition-colors ${isLockedOut ? 'bg-red-100/50 border-red-200' : 'bg-zinc-50 border-zinc-100'}`}>
          <p className={`text-sm font-medium ${isLockedOut ? 'text-red-700' : 'text-zinc-500'}`}>
            ¿Eres nuevo en EasyTrack? <button disabled={isLockedOut} onClick={() => { onClose(); navigate('/registro'); }} className={`font-black transition-colors disabled:cursor-not-allowed ${isLockedOut ? 'text-red-950' : 'text-zinc-950 hover:text-brand-600'}`}>Crea una cuenta</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}