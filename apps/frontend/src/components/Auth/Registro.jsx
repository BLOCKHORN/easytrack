import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { supabase } from "../../utils/supabaseClient";

const TypewriterLogo = ({ size = "text-4xl", dotColor = "text-brand-500", cursorColor = "bg-brand-500", textColor = "text-white" }) => {
  const text = "easytrack";
  return (
    <div className={`flex items-center ${size} font-black tracking-tighter ${textColor} select-none outline-none`}>
      {text.split("").map((char, index) => (
        <motion.span key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.08, duration: 0.1 }}>
          {char}
        </motion.span>
      ))}
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: text.length * 0.08, duration: 0.1 }} className={dotColor}>.</motion.span>
      <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className={`w-1.5 h-8 ${cursorColor} ml-1 inline-block`} />
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18">
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
  const [formData, setFormData] = useState({ nombre_empresa: "", nombre_completo: "", email: "", password: "" });

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
      const { data, error: authErr } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.nombre_completo, nombre_empresa: formData.nombre_empresa },
          emailRedirectTo: `${window.location.origin}/auth/email-confirmado`
        }
      });
      if (authErr) throw authErr;
      if (data.user) navigate("/auth/email-confirmado?mode=check-email");
    } catch (err) { setError(err.message || "Error al crear cuenta"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-5/12 bg-zinc-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-brand-900/30 via-zinc-950 to-zinc-950"></div>
        <div className="relative z-10">
          <Link to="/" className="inline-block outline-none">
            <TypewriterLogo />
          </Link>
        </div>
        <div className="relative z-10 mb-10">
          <h2 className="text-5xl font-black text-white mb-8 leading-tight tracking-tight">Digitaliza tu logística <br/> desde el primer escaneo.</h2>
          <div className="space-y-5">
            <div className="flex items-center gap-4 text-zinc-300 font-medium text-lg"><FaCheckCircle className="text-brand-500" /> Localiza paquetes en segundos.</div>
            <div className="flex items-center gap-4 text-zinc-300 font-medium text-lg"><FaCheckCircle className="text-brand-500" /> Evita pérdidas y reclamaciones.</div>
            <div className="flex items-center gap-4 text-zinc-300 font-medium text-lg"><FaCheckCircle className="text-brand-500" /> Multiplica tus operadoras sin caos.</div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 min-h-screen lg:min-h-0 bg-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[440px]">
          <div className="lg:hidden flex justify-center mb-10">
            <Link to="/" className="outline-none">
              <TypewriterLogo size="text-3xl" textColor="text-zinc-950" />
            </Link>
          </div>
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-4xl font-black text-zinc-950 tracking-tight mb-2">Crear cuenta</h2>
            <p className="text-zinc-500 font-medium text-lg">Configura tu local en menos de 1 minuto.</p>
          </div>
          <button onClick={handleGoogleLogin} className="w-full py-4 bg-white border border-zinc-200 rounded-2xl font-bold text-zinc-700 hover:bg-zinc-50 transition-all flex items-center justify-center gap-3 mb-8 shadow-sm active:scale-95 text-lg">
            <GoogleIcon /> Continuar con Google
          </button>
          <div className="relative mb-8 text-center"><span className="bg-white px-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest relative z-10">O mediante email</span><div className="absolute top-1/2 w-full border-t border-zinc-200"></div></div>
          <form onSubmit={handleRegistro} className="space-y-5">
            <input required type="text" placeholder="Nombre del Negocio" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold" onChange={(e) => setFormData({...formData, nombre_empresa: e.target.value})} />
            <input required type="text" placeholder="Tu Nombre Completo" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold" onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} />
            <input required type="email" placeholder="Correo Electrónico" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold" onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <input required type="password" placeholder="Contraseña" minLength={8} className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold" onChange={(e) => setFormData({...formData, password: e.target.value})} />
            {error && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl text-center">{error}</div>}
            <button disabled={loading} className="w-full py-5 bg-brand-600 text-white font-black rounded-xl hover:bg-brand-500 transition-all flex items-center justify-center gap-3 group text-lg shadow-xl shadow-brand-500/25 active:scale-95">
              {loading ? "Preparando panel..." : "Crear mi cuenta"} <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          <p className="text-center mt-8 text-sm font-bold text-zinc-500">¿Ya tienes cuenta? <Link to="/login" className="text-brand-600 hover:text-brand-500">Inicia sesión aquí</Link></p>
        </motion.div>
      </div>
    </div>
  );
}