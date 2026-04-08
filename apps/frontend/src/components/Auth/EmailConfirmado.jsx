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
    const checkSession = async () => {
      const mode = searchParams.get("mode");
      if (mode === "check-email") {
        setStatus("check-email");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 3000);
      } else {
        const { data } = supabase.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_IN") {
            setStatus("success");
            setTimeout(() => navigate("/dashboard"), 3000);
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-xl border border-slate-100 p-10 text-center"
      >
        {status === "loading" && (
          <div className="flex flex-col items-center animate-fade-in">
            <FaSpinner className="text-5xl text-brand-600 animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verificando...</h2>
            <p className="text-slate-500">Estamos confirmando tu acceso.</p>
          </div>
        )}

        {status === "check-email" && (
          <div className="flex flex-col items-center animate-fade-in">
            <FaEnvelope className="text-6xl text-slate-300 mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Revisa tu correo</h2>
            <p className="text-slate-500 mb-8">Te hemos enviado un enlace para confirmar tu cuenta.</p>
            <button onClick={() => navigate("/")} className="w-full py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors">
              Volver al inicio
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center animate-fade-in">
            <FaCheckCircle className="text-6xl text-emerald-500 mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Email Confirmado!</h2>
            <p className="text-slate-500 mb-8">Tu cuenta está lista. Redirigiendo a tu panel...</p>
            <button onClick={() => navigate("/dashboard")} className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 shadow-md transition-colors">
              Ir al Panel
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center animate-fade-in">
            <FaExclamationTriangle className="text-6xl text-red-500 mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Enlace inválido</h2>
            <p className="text-slate-500 mb-8">El enlace ha caducado o ya fue utilizado.</p>
            <button onClick={() => navigate("/login")} className="w-full py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors">
              Ir a iniciar sesión
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}