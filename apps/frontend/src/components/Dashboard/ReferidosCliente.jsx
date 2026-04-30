import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabaseClient';

const IconGift = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>;
const IconCopy = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconClock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

const formatEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

export default function ReferidosCliente() {
  const [data, setData] = useState({ slug: '', referrals: [] });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${API_BASE}/api/billing/referrals/stats`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const json = await res.json();
        
        if (json.ok) {
          setData({ slug: json.slug, referrals: json.referrals });
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchStats();
  }, []);

  const stats = useMemo(() => {
    const active = data.referrals.filter(r => r.status === 'active').length;
    const pending = data.referrals.filter(r => r.status === 'pending').length;
    const discount = Math.min(active * 5, 29.90); 
    const isFree = active >= 6;
    const progress = Math.min((active / 6) * 100, 100);

    return { active, pending, discount, isFree, progress };
  }, [data.referrals]);

  const handleCopy = () => {
    const url = `${window.location.origin}/registro?ref=${data.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8 animate-pulse bg-zinc-50 min-h-screen" />;

  return (
    <main className="max-w-5xl mx-auto p-6 lg:p-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-950 tracking-tight flex items-center gap-3">
          Invita y Gana
        </h1>
        <p className="text-zinc-500 font-medium mt-1">Consigue tu suscripción completamente gratis recomendando el software.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-zinc-950 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
            <svg width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>
          </div>
          
          <h3 className="text-xl font-black mb-2 relative z-10">Tu enlace de invitación</h3>
          <p className="text-zinc-400 text-sm mb-6 relative z-10">
            Regala a tus amigos <strong>1 mes al 50% de descuento</strong>. Por cada uno que active su plan, tú recibes <strong>-5,00€ de saldo</strong> mensual.
          </p>

          <div className="flex items-center gap-2 relative z-10">
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}/registro?ref=${data.slug}`}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-300 font-mono text-sm outline-none"
            />
            <button 
              onClick={handleCopy}
              className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-3.5 rounded-xl font-bold transition-colors flex items-center gap-2 shrink-0"
            >
              {copied ? <IconCheck /> : <IconCopy />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Descuento Próxima Factura</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">
                {stats.isFree ? 'SaaS 100% Gratis' : `${stats.active} / 6 Activos`}
              </span>
            </div>
            <p className="text-5xl font-black tracking-tighter text-zinc-950 mb-1">
              -{formatEUR(stats.discount)}
            </p>
            <p className="text-sm font-medium text-zinc-500">
              Saldo Stripe a tu favor aplicado automáticamente.
            </p>
          </div>

          <div className="mt-8">
            <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
              <div className="h-full bg-brand-500 transition-all duration-1000" style={{ width: `${stats.progress}%` }} />
            </div>
            <div className="flex justify-between mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <span>0€</span>
              <span>¡GRATIS!</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-black text-zinc-950 text-lg flex items-center gap-2">
            <IconUsers /> Historial de Invitados
          </h3>
          <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">{data.referrals.length} registros</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest select-none">
                <th className="px-6 py-4">Negocio</th>
                <th className="px-6 py-4">Fecha de Registro</th>
                <th className="px-6 py-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 text-sm">
              {data.referrals.length === 0 ? (
                <tr><td colSpan="3" className="px-6 py-12 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">Aún no has invitado a nadie.</td></tr>
              ) : (
                data.referrals.map(r => (
                  <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-zinc-900">{r.nombre_empresa}</td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {r.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest">
                          <IconCheck /> Generando Saldo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest">
                          <IconClock /> Pendiente de pago
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}