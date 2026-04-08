import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyCheckout } from "../../services/billingService";

const IconSuccess = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconError = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", { year: "numeric", month: "short", day: "2-digit" });
  } catch { return iso; }
}

export default function UpgradeSuccess() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [planCode, setPlan] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr("");
        const sid = sp.get("session_id");
        if (!sid) throw new Error("Falta el session_id de Stripe.");
        
        const d = await verifyCheckout(sid);
        setOk(true);
        setPlan(d?.planCode || "");
        setPeriodEnd(d?.currentPeriodEnd || "");
      } catch (e) {
        setErr(e.message || "No se pudo verificar el pago.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sp]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 border-4 border-zinc-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-xl font-black text-zinc-900">Procesando pago...</h1>
          <p className="text-zinc-500 mt-2">Verificando tu suscripción de forma segura.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-zinc-200 shadow-xl rounded-[2rem] p-8 text-center relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-2 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
        
        <div className="flex justify-center mb-6">{ok ? <IconSuccess /> : <IconError />}</div>
        
        <h1 className="text-2xl font-black text-zinc-950 tracking-tight mb-2">
          {ok ? "¡Suscripción Activada!" : "Algo no fue bien"}
        </h1>

        {ok ? (
          <>
            <p className="text-zinc-500 font-medium text-sm mb-8">Gracias por confiar en EasyTrack. Tu cuenta ya está operando sin límites.</p>
            
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 mb-8 text-left space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-200/60 pb-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Plan Contratado</span>
                <span className="text-sm font-black text-zinc-900">{planCode === 'annual' ? 'Premium Anual' : 'Premium Mensual'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Próxima Factura</span>
                <span className="text-sm font-bold text-zinc-900">{fmtDate(periodEnd)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button onClick={() => navigate('/dashboard', { replace: true })} className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white font-black rounded-xl transition-all shadow-md active:scale-95">
                Ir al Dashboard
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-red-600 font-medium text-sm bg-red-50 p-4 rounded-xl border border-red-200 mb-8">{err}</p>
            <button onClick={() => navigate('/', { replace: true })} className="w-full py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl transition-colors">
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}