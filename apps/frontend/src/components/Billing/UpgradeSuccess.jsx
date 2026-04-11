import { useNavigate } from "react-router-dom";

const IconSuccess = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

export default function UpgradeSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-zinc-200 shadow-xl shadow-zinc-200/50 rounded-[2.5rem] p-10 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-100">
          <IconSuccess />
        </div>
        
        <h1 className="text-3xl font-black text-zinc-950 tracking-tight mb-3">¡Pago completado!</h1>
        <p className="text-zinc-500 font-medium text-base mb-10 leading-relaxed">
          Tu plan ha sido actualizado correctamente. Ya puedes disfrutar de las nuevas características en tu panel de control.
        </p>

        <button onClick={() => navigate('/dashboard', { replace: true })} className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-lg rounded-xl transition-all shadow-xl shadow-zinc-950/20 active:scale-95">
          Ir a mi Dashboard
        </button>
      </div>
    </div>
  );
}