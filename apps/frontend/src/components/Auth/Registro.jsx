import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaGoogle, FaArrowRight, FaBuilding, FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import { supabase } from "../../utils/supabaseClient";

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
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-black italic">E</div>
            <span className="text-2xl font-black text-zinc-950 tracking-tight">EasyTrack</span>
          </Link>
          <h2 className="text-3xl font-black text-zinc-950 mb-2">Empieza gratis</h2>
          <p className="text-zinc-500 font-medium italic">Configura tu local en menos de 1 minuto.</p>
        </div>

        <button onClick={handleGoogleLogin} className="w-full py-4 border border-zinc-200 rounded-2xl font-bold text-zinc-700 hover:bg-zinc-50 transition-all flex items-center justify-center gap-3 mb-8 shadow-sm">
          <FaGoogle className="text-red-500" /> Registrarme con Google
        </button>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-zinc-400"><span className="bg-white px-4">O mediante email</span></div>
        </div>

        <form onSubmit={handleRegistro} className="space-y-4">
          <input required type="text" placeholder="Nombre de tu negocio" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all font-medium" onChange={(e) => setFormData({...formData, nombre_empresa: e.target.value})} />
          <input required type="text" placeholder="Tu nombre completo" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all font-medium" onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} />
          <input required type="email" placeholder="Correo electrónico" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all font-medium" onChange={(e) => setFormData({...formData, email: e.target.value})} />
          <input required type="password" placeholder="Contraseña" minLength={8} className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all font-medium" onChange={(e) => setFormData({...formData, password: e.target.value})} />

          {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">{error}</div>}

          <button disabled={loading} className="w-full py-5 bg-zinc-950 text-white font-black rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 group text-lg shadow-xl shadow-zinc-950/10">
            {loading ? "Preparando panel..." : "Crear mi cuenta"} <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="text-center mt-8 text-sm font-medium text-zinc-500">
          ¿Ya tienes cuenta? <Link to="/login" className="text-brand-600 font-bold hover:underline">Inicia sesión</Link>
        </p>
      </motion.div>
    </div>
  );
}