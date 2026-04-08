import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { verifyPin, getPinStatus } from "../../services/pinService";

const IconLock = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconUnlock = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;

export default function PinGate({ children, tenantSlug }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    let cancel = false;
    
    const checkStatus = async () => {
      // 1. Mirar si ya lo desbloqueamos en esta sesión
      const stored = sessionStorage.getItem(`et_pin_${tenantSlug}`);
      if (stored === "unlocked") {
        if (!cancel) { setUnlocked(true); setCheckingStatus(false); }
        return;
      }

      // 2. Comprobar si el PIN realmente está activado en la base de datos
      try {
        const status = await getPinStatus(tenantSlug);
        if (!status.enabled) {
          // Si está desactivado, pasamos directamente
          if (!cancel) setUnlocked(true);
        }
      } catch (err) {
        console.error("Error comprobando estado del PIN:", err);
      } finally {
        if (!cancel) setCheckingStatus(false);
      }
    };

    if (tenantSlug) checkStatus();

    return () => { cancel = true; };
  }, [tenantSlug]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (pin.length < 4) return;
    setLoading(true);
    setError(false);
    
    try {
      const isValid = await verifyPin(tenantSlug, pin);
      if (isValid) {
        sessionStorage.setItem(`et_pin_${tenantSlug}`, "unlocked");
        setUnlocked(true);
      } else {
        setError(true);
        setPin("");
      }
    } catch (err) {
      setError(true);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit al llegar a 6 dígitos
  useEffect(() => {
    if (pin.length === 6) handleSubmit();
  }, [pin]);

  // Pantalla de carga mientras comprueba la BBDD
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Si está desbloqueado (o desactivado), renderiza el contenido
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 selection:bg-brand-500 selection:text-white">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl border border-zinc-200 overflow-hidden"
      >
        <div className="bg-zinc-950 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-brand-500/30 blur-3xl rounded-full pointer-events-none" />
          
          <motion.div 
            animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg relative z-10 transition-colors duration-300 ${error ? 'bg-red-500 text-white' : 'bg-white/10 text-white border border-white/20'}`}
          >
            {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : (error ? <IconUnlock /> : <IconLock />)}
          </motion.div>
          <h2 className="text-2xl font-black text-white tracking-tight relative z-10">Área Protegida</h2>
          <p className="text-zinc-400 text-sm mt-2 font-medium relative z-10">Introduce tu PIN de seguridad</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setError(false);
                  setPin(e.target.value.replace(/\D/g, ""));
                }}
                className={`w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-zinc-50 border-2 rounded-2xl focus:outline-none transition-all ${
                  error ? 'border-red-400 text-red-600 bg-red-50/50' : 'border-zinc-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-zinc-900'
                }`}
              />
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-sm font-bold text-center mt-4">
                  PIN incorrecto. Inténtalo de nuevo.
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={loading || pin.length < 4}
              className="w-full mt-6 py-4 bg-zinc-950 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-zinc-950/20"
            >
              {loading ? "Verificando..." : "Desbloquear"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}