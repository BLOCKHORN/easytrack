import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCheckCircle, FaSpinner, FaExclamationTriangle, FaEnvelope } from "react-icons/fa";
import { supabase } from "../../utils/supabaseClient";

export default function EmailConfirmado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const redirectUser = async (session) => {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
        const r = await fetch(`${API_BASE}/api/tenants/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (r.ok) {
          const tData = await r.json();
          if (tData?.tenant?.slug) {
            navigate(`/${tData.tenant.slug}/dashboard`);
            return;
          }
        }
      } catch (err) {}
      navigate("/");
    };

    const checkSession = async () => {
      const mode = searchParams.get("mode");
      if (mode === "check-email") {
        setStatus("check-email");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("success");
        setTimeout(() => redirectUser(session), 2500);
      } else {
        const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === "SIGNED_IN" && newSession) {
            setStatus("success");
            setTimeout(() => redirectUser(newSession), 2500);
          }
        });
        
        setTimeout(() => {
          setStatus((current) => current === "loading" ? "error" : current);
        }, 5000);

        return () => data?.subscription?.unsubscribe();
      }
    };
    
    checkSession();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 pt-24 md:pt-0">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 p-10 text-center"
      >
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <FaSpinner className="text-5xl text-brand-500 animate-spin mb-6" />
            <h2 className="text-2xl font-black text-zinc-950 mb-2 tracking-tight">Verificando...</h2>
            <p className="text-zinc-500 font-medium">Estamos confirmando tu acceso.</p>
          </div>
        )}

        {status === "check-email" && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-6">
              <FaEnvelope className="text-4xl text-brand-500" />
            </div>
            <h2 className="text-2xl font-black text-zinc-950 mb-3 tracking-tight">Revisa tu correo</h2>
            <p className="text-zinc-500 font-medium mb-8 leading-relaxed">Te hemos enviado un enlace de confirmación seguro. Haz clic en él para activar tu cuenta.</p>
            <button onClick={() => navigate("/")} className="w-full py-4 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors active:scale-95">
              Volver al inicio
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
              <FaCheckCircle className="text-4xl text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-zinc-950 mb-3 tracking-tight">¡Email Confirmado!</h2>
            <p className="text-zinc-500 font-medium mb-8">Tu infraestructura está lista. Entrando al panel...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <FaExclamationTriangle className="text-4xl text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-zinc-950 mb-3 tracking-tight">Enlace inválido</h2>
            <p className="text-zinc-500 font-medium mb-8 leading-relaxed">El enlace de seguridad ha caducado o ya fue utilizado anteriormente.</p>
            <button onClick={() => navigate("/login")} className="w-full py-4 bg-zinc-950 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-950/20 active:scale-95">
              Ir a iniciar sesión
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}