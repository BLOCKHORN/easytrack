import { useNavigate } from "react-router-dom";

const IconSuccess = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

export default function UpgradeSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans antialiased text-zinc-900">
      <div className="w-full max-w-md bg-white border border-zinc-200/80 shadow-sm rounded-2xl p-8 sm:p-10 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-6 border border-emerald-100/80">
          <IconSuccess />
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight mb-2 text-balance">
          ¡Suscripción Activada!
        </h1>
        <p className="text-zinc-500 font-normal text-sm mb-8 leading-relaxed text-pretty">
          Tu cuenta ha sido actualizada al plan seleccionado. Ya puedes gestionar inventario ilimitado en tu panel de control.
        </p>

        <button 
          onClick={() => navigate('/dashboard', { replace: true })} 
          className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-[0.97] min-h-[44px]"
        >
          Ir a mi panel de control
        </button>
      </div>
    </div>
  );
}