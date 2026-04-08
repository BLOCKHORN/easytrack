import { useNavigate } from "react-router-dom";

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-zinc-200 shadow-sm rounded-[2rem] p-8 text-center">
        <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <h1 className="text-2xl font-black text-zinc-950 tracking-tight mb-2">Pago cancelado</h1>
        <p className="text-zinc-500 font-medium text-sm mb-8">No se ha realizado ningún cargo en tu tarjeta. Tu suscripción no ha sido modificada.</p>
        
        <button onClick={() => navigate('/dashboard')} className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-xl transition-all shadow-md active:scale-95">
          Volver a mi cuenta
        </button>
      </div>
    </div>
  );
}