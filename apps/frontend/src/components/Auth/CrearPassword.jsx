import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { supabase } from "../../utils/supabaseClient";

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-xl border border-slate-100 p-10"
      >
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
            {mode === "request" ? "Recuperar acceso" : "Nueva contraseña"}
          </h2>
          <p className="text-slate-500 font-medium">
            {mode === "request" 
              ? "Te enviaremos un enlace seguro a tu correo." 
              : "Introduce tu nueva contraseña."}
          </p>
        </div>

        {error && <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 font-medium text-sm rounded-xl text-center">{error}</div>}
        {message && <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 font-medium text-sm rounded-xl text-center">{message}</div>}

        {mode === "request" ? (
          <form onSubmit={handleRequest} className="space-y-5">
            <div className="relative">
              <FaEnvelope className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-50 focus:border-brand-600 transition-all outline-none"
                placeholder="Email de tu cuenta"
              />
            </div>
            <button
              disabled={loading}
              className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="relative">
              <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-50 focus:border-brand-600 transition-all outline-none"
                placeholder="Nueva contraseña"
              />
            </div>
            <button
              disabled={loading}
              className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Guardar contraseña"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <button onClick={() => navigate("/")} className="text-sm font-bold text-slate-400 hover:text-brand-600 transition-colors">
            Volver al inicio
          </button>
        </div>
      </motion.div>
    </div>
  );
}