import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { supabase } from "../../utils/supabaseClient";

const IconLogoRoute = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="18" r="3"/>
    <circle cx="19" cy="6" r="3"/>
    <path d="M5 15v-4a4 4 0 0 1 4-4h6a4 4 0 0 0 4-4V6"/>
  </svg>
);

export default function CrearPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (location.hash.includes("type=recovery")) {
      setMode("update");
    }
  }, [location]);

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/crear-password`,
    });

    if (err) setError(err.message);
    else setMessage("Revisa tu correo para continuar.");
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const { error: err } = await supabase.auth.updateUser({ password });
    
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setMessage("Contraseña actualizada con éxito.");
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 pt-24 md:pt-0">
      
      <Link to="/" className="inline-flex items-center gap-2 group outline-none mb-10">
        <div className="text-brand-500">
          <IconLogoRoute />
        </div>
        <span className="text-2xl font-black tracking-tighter lowercase select-none">
          <span className="text-zinc-900">easy</span>
          <span className="text-zinc-950">track</span>
        </span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 p-8 md:p-10"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black text-zinc-950 mb-2 tracking-tight">
            {mode === "request" ? "Recuperar acceso" : "Nueva contraseña"}
          </h2>
          <p className="text-zinc-500 font-medium text-sm">
            {mode === "request" 
              ? "Te enviaremos un enlace seguro a tu correo." 
              : "Introduce tu nueva contraseña."}
          </p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 font-bold text-sm rounded-xl text-center">{error}</div>}
        {message && <div className="mb-6 p-4 bg-brand-50 border border-brand-100 text-brand-700 font-bold text-sm rounded-xl text-center">{message}</div>}

        {mode === "request" ? (
          <form onSubmit={handleRequest} className="space-y-5">
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-bold text-zinc-900 placeholder:text-zinc-300 placeholder:font-medium"
                placeholder="Email de tu cuenta"
              />
            </div>
            <button
              disabled={loading}
              className="w-full py-4 bg-zinc-950 text-white font-black rounded-xl hover:bg-zinc-800 shadow-lg shadow-zinc-950/20 transition-all flex items-center justify-center gap-2 disabled:bg-zinc-300 disabled:shadow-none active:scale-95"
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-bold text-zinc-900 placeholder:text-zinc-300 placeholder:font-medium"
                placeholder="Nueva contraseña"
              />
            </div>
            <button
              disabled={loading}
              className="w-full py-4 bg-brand-600 text-white font-black rounded-xl hover:bg-brand-500 shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:bg-zinc-300 disabled:shadow-none active:scale-95"
            >
              {loading ? "Actualizando..." : "Guardar contraseña"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <button onClick={() => navigate("/")} className="text-sm font-bold text-zinc-500 hover:text-brand-600 transition-colors">
            Volver al inicio
          </button>
        </div>
      </motion.div>
    </div>
  );
}