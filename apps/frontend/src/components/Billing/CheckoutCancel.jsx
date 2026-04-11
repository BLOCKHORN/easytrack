import { useNavigate } from "react-router-dom";

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-zinc-200 shadow-xl shadow-zinc-200/50 rounded-[2.5rem] p-10 text-center">
        <div className="w-20 h-20 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <h1 className="text-3xl font-black text-zinc-950 tracking-tight mb-3">Pago cancelado</h1>
        <p className="text-zinc-500 font-medium text-base mb-10 leading-relaxed">
          El proceso ha sido interrumpido y no se ha realizado ningún cargo en tu tarjeta. Tu plan actual se mantiene sin cambios.
        </p>
        
        <button onClick={() => navigate('/dashboard', { replace: true })} className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-lg rounded-xl transition-all shadow-xl shadow-zinc-950/20 active:scale-95">
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
}