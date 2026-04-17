import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { verifyPin, getPinStatus } from "../../services/pinService";

const IconLock = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconUnlock = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;
const IconShieldAlert = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

export default function PinGate({ children, tenantSlug }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  // --- SISTEMA ANTI-FUERZA BRUTA ---
  const [intentos, setIntentos] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    let cancel = false;
    const checkStatus = async () => {
      const stored = sessionStorage.getItem(`et_pin_${tenantSlug}`);
      if (stored === "unlocked") {
        if (!cancel) { setUnlocked(true); setCheckingStatus(false); }
        return;
      }
      try {
        const status = await getPinStatus(tenantSlug);
        if (!status.enabled && !cancel) setUnlocked(true);
      } catch (err) {
        console.error("Error comprobando estado del PIN");
      } finally {
        if (!cancel) setCheckingStatus(false);
      }
    };
    if (tenantSlug) checkStatus();
    return () => { cancel = true; };
  }, [tenantSlug]);

  // Gestor del temporizador de bloqueo
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    } else if (lockoutTime === 0 && intentos >= 3) {
      // Reseteamos intentos tras el castigo
      setIntentos(0); 
      setError(false);
    }
  }, [lockoutTime, intentos]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (pin.length < 4 || lockoutTime > 0) return;
    
    setLoading(true);
    setError(false);
    
    try {
      const isValid = await verifyPin(tenantSlug, pin);
      if (isValid) {
        sessionStorage.setItem(`et_pin_${tenantSlug}`, "unlocked");
        setIntentos(0);
        setUnlocked(true);
      } else {
        const nuevosIntentos = intentos + 1;
        setIntentos(nuevosIntentos);
        setError(true);
        setPin("");
        
        // Bloqueo progresivo
        if (nuevosIntentos >= 3) {
          setLockoutTime(30); // 30 segundos de castigo
        }
      }
    } catch (err) {
      setError(true);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pin.length === 6) handleSubmit();
  }, [pin]);

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  const isLockedOut = lockoutTime > 0;

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 selection:bg-brand-500 selection:text-white">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl border border-zinc-200 overflow-hidden"
      >
        <div className={`p-10 text-center relative overflow-hidden transition-colors duration-500 ${isLockedOut ? 'bg-red-950' : 'bg-zinc-950'}`}>
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 blur-3xl rounded-full pointer-events-none ${isLockedOut ? 'bg-red-500/30' : 'bg-brand-500/30'}`} />
          
          <motion.div 
            animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg relative z-10 transition-colors duration-300 ${isLockedOut ? 'bg-red-500 text-white' : (error ? 'bg-amber-500 text-white' : 'bg-white/10 text-white border border-white/20')}`}
          >
            {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : (isLockedOut ? <IconShieldAlert /> : (error ? <IconUnlock /> : <IconLock />))}
          </motion.div>
          <h2 className="text-2xl font-black text-white tracking-tight relative z-10">
            {isLockedOut ? 'Acceso Bloqueado' : 'Área Protegida'}
          </h2>
          <p className={`text-sm mt-2 font-medium relative z-10 ${isLockedOut ? 'text-red-300' : 'text-zinc-400'}`}>
            {isLockedOut ? `Por seguridad, espera ${lockoutTime}s` : 'Introduce tu PIN de seguridad'}
          </p>
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
                disabled={isLockedOut || loading}
                onChange={(e) => {
                  setError(false);
                  setPin(e.target.value.replace(/\D/g, ""));
                }}
                className={`w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-zinc-50 border-2 rounded-2xl focus:outline-none transition-all ${
                  isLockedOut ? 'border-red-200 bg-red-50/30 text-red-400 cursor-not-allowed' :
                  (error ? 'border-amber-400 text-amber-600 bg-amber-50/50' : 'border-zinc-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-zinc-900')
                }`}
              />
            </div>
            
            <AnimatePresence mode="wait">
              {isLockedOut ? (
                <motion.div key="locked" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-600 text-xs font-black uppercase tracking-widest text-center mt-4">
                  Demasiados intentos fallidos
                </motion.div>
              ) : error ? (
                <motion.div key="error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-amber-600 text-sm font-bold text-center mt-4">
                  PIN incorrecto. Intentos restantes: {3 - intentos}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <button
              disabled={loading || pin.length < 4 || isLockedOut}
              className={`w-full mt-6 py-4 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                isLockedOut ? 'bg-red-950 shadow-none' : 'bg-zinc-950 hover:bg-zinc-800 shadow-zinc-950/20'
              }`}
            >
              {loading ? "Verificando..." : (isLockedOut ? "Sistema bloqueado" : "Desbloquear")}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}