import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaTimes, FaEnvelope, FaLock, FaGoogle, FaArrowRight } from "react-icons/fa";
import { supabase } from "../../utils/supabaseClient";

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

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authErr) {
      setError("Credenciales incorrectas");
      setLoading(false);
    } else {
      onClose();
      navigate("/dashboard");
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 md:p-12"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-950 transition-colors"><FaTimes size={24}/></button>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-zinc-950 mb-2">Bienvenido</h2>
          <p className="text-zinc-500 font-medium">Entra en tu centro de mando.</p>
        </div>

        <button onClick={handleGoogle} className="w-full py-4 border border-zinc-200 rounded-2xl font-bold text-zinc-700 hover:bg-zinc-50 transition-all flex items-center justify-center gap-3 mb-6">
          <FaGoogle className="text-red-500" /> Entrar con Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-zinc-400"><span className="bg-white px-4">O con tu email</span></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <FaEnvelope className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input required type="email" placeholder="Email" className="w-full pl-12 pr-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all font-medium" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="relative">
            <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input required type="password" placeholder="Contraseña" className="w-full pl-12 pr-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all font-medium" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

          <button disabled={loading} className="w-full py-5 bg-zinc-950 text-white font-black rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 group text-lg">
            {loading ? "Entrando..." : "Acceder ahora"} <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => { onClose(); navigate('/registro'); }} className="text-sm font-bold text-zinc-400 hover:text-brand-600 transition-colors">¿No tienes cuenta? Regístrate</button>
        </div>
      </motion.div>
    </div>
  );
}