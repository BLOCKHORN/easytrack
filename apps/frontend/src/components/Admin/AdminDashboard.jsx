import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconTerminal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconBoxIn = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/><path d="M12 8v4"/><path d="M8 4l8 4"/></svg>;
const IconBack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IconSave = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconRefresh = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const IconBuilding = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;
const IconAlert = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconWhatsapp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133-.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>;
const IconStar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;

const formatEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n || 0);
const formatMicroEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 4, maximumFractionDigits: 6 }).format(n || 0);

const timeAgo = (dateString) => {
  if (!dateString) return 'Sin actividad';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + 'd';
  interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + 'h';
  interval = seconds / 60; if (interval > 1) return Math.floor(interval) + 'm';
  return 'Ahora';
};

const getAiCost = (pTokens, cTokens) => {
  const p = (Number(pTokens) || 0) / 1000000 * 0.075;
  const c = (Number(cTokens) || 0) / 1000000 * 0.30;
  return p + c;
};

const analyzeNegotiationOpportunities = (statsArray, timeRange, tenant) => {
  if (timeRange === 'today' || timeRange === 'week') return [];

  const creationDate = tenant?.fecha_creacion ? new Date(tenant.fecha_creacion) : new Date();
  const daysActive = (new Date() - creationDate) / (1000 * 60 * 60 * 24);
  const monthsActive = Math.max(1, daysActive / 30.44);

  const TIERS = {
    VOLUMEN: ['Amazon Logistics', 'InPost', 'Mondial Relay', 'Punto Pack', 'Celeritas', 'Packlink'],
    PREMIUM: ['DHL', 'UPS', 'FedEx', 'TNT']
  };

  return statsArray.map(c => {
    const vol = Number(c.volumen) || 0;
    const currentTicket = Number(c.ticket_medio) || 0;
    const monthlyVol = timeRange === 'all' ? (vol / monthsActive) : vol;

    let targetTicket = 0;
    const emp = c.empresa_transporte;

    if (TIERS.VOLUMEN.includes(emp)) {
      if (monthlyVol >= 1500) targetTicket = 0.35;
      else if (monthlyVol >= 800) targetTicket = 0.25;
    } else if (TIERS.PREMIUM.includes(emp)) {
      if (monthlyVol >= 150) targetTicket = 0.60;
      else if (monthlyVol >= 50) targetTicket = 0.50; 
    } else {
      if (monthlyVol >= 800) targetTicket = 0.60;
      else if (monthlyVol >= 400) targetTicket = 0.50;
      else if (monthlyVol >= 200) targetTicket = 0.40; 
    }
    
    if (targetTicket > 0 && currentTicket < targetTicket) {
      const diff = targetTicket - currentTicket;
      return {
        empresa: emp,
        volumenTotal: vol,
        volumenMensual: Math.round(monthlyVol),
        ticketActual: currentTicket,
        ticketObjetivo: targetTicket,
        fugaMensual: monthlyVol * diff,
        fugaAnual: (monthlyVol * diff) * 12,
        fugaHistorica: timeRange === 'all' ? (vol * diff) : null
      };
    }
    return null;
  }).filter(Boolean);
};

const TenantInspector = ({ tenant, onBack, onUpdate }) => {
  const [statsData, setStatsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quotaInput, setQuotaInput] = useState(tenant.trial_quota !== null ? tenant.trial_quota : -1);
  const [aiActive, setAiActive] = useState(tenant.is_ai_active);
  const [saving, setSaving] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); 

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('admin_get_tenant_stats', { 
          p_tenant_id: tenant.id, 
          p_time_range: timeRange 
        });
        if (error) throw error;
        setStatsData(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [tenant.id, timeRange]);

  const handleSaveLimits = async () => {
    setSaving(true);
    try {
      const parsedQuota = parseInt(quotaInput, 10);
      const finalQuota = isNaN(parsedQuota) || parsedQuota < 0 ? null : parsedQuota;
      
      const { error } = await supabase.from('tenants').update({
        trial_quota: finalQuota,
        is_ai_active: aiActive
      }).eq('id', tenant.id);
      
      if (error) throw error;
      onUpdate(); 
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    return statsData.reduce((acc, curr) => {
      acc.revenue += Number(curr.ingreso_total) || 0;
      acc.volume += Number(curr.volumen) || 0;
      return acc;
    }, { revenue: 0, volume: 0 });
  }, [statsData]);

  const opportunities = useMemo(() => {
    return analyzeNegotiationOpportunities(statsData, timeRange, tenant);
  }, [statsData, timeRange, tenant]);

  const quotaPercentage = tenant.trial_quota > 0 ? Math.min((tenant.trial_used / tenant.trial_quota) * 100, 100) : 0;
  const isQuotaExhausted = tenant.trial_quota > 0 && tenant.trial_used >= tenant.trial_quota;

  const promptCost = (tenant.ai_prompt_tokens || 0) / 1000000 * 0.075;
  const compCost = (tenant.ai_completion_tokens || 0) / 1000000 * 0.30;
  const totalCost = promptCost + compCost;
  const costPerScan = tenant.ai_scans_count > 0 ? (totalCost / tenant.ai_scans_count) : 0;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
          <IconBack /> Volver al listado
        </button>
        <button 
          onClick={() => window.open(`/${tenant.slug}/dashboard`, '_blank')}
          className="flex items-center gap-2 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg border border-brand-200 transition-all"
        >
          <IconTerminal /> Acceder como Root
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-zinc-950">{tenant.nombre_empresa || 'Sin Configurar'}</h2>
              {tenant.plan_id === 'pro' && <span className="bg-zinc-100 text-zinc-800 border border-zinc-200 text-[10px] px-2 py-0.5 rounded font-bold shrink-0">PRO</span>}
            </div>
            <p className="text-sm text-zinc-500 mb-6">{tenant.email}</p>
            
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-zinc-500">Último acceso</span>
                <span className="font-mono text-zinc-900">{timeAgo(tenant.ultima_actividad)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-zinc-500">Fecha de alta</span>
                <span className="font-mono text-zinc-900">{new Date(tenant.fecha_creacion).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-zinc-500">Volumen histórico</span>
                <span className="font-mono font-bold text-zinc-900">{Number(tenant.total_paquetes || 0).toLocaleString()} paq.</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <IconTerminal />
              <h3 className="text-sm font-bold text-zinc-900">Control de Cuotas</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-semibold text-zinc-500 block">Límite de paquetes</label>
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    {tenant.trial_used} / {tenant.trial_quota || '∞'}
                  </span>
                </div>
                {tenant.trial_quota > 0 && (
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden mb-4 border border-zinc-200">
                    <div 
                      className={`h-full transition-all duration-500 ${isQuotaExhausted ? 'bg-red-500' : 'bg-brand-500'}`} 
                      style={{ width: `${quotaPercentage}%` }} 
                    />
                  </div>
                )}
                
                <input 
                  type="number" 
                  value={quotaInput} 
                  onChange={e => setQuotaInput(e.target.value)} 
                  placeholder="-1 para infinito"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2 text-zinc-900 font-mono text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-4 rounded-lg">
                <span className="text-sm font-medium text-zinc-700">Acceso a IA</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={aiActive} onChange={e => setAiActive(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>

              <div className="flex justify-between items-center text-sm border-t border-zinc-100 pt-4 mt-2">
                <span className="font-medium text-zinc-600">Gasto de infraestructura IA</span>
                <div className="text-right">
                  <p className="font-mono font-bold text-zinc-900">{tenant.ai_scans_count || 0} oper.</p>
                  <p className="text-xs font-mono text-zinc-500">
                     Total: {formatMicroEUR(totalCost)}
                  </p>
                </div>
              </div>

              <button 
                onClick={handleSaveLimits} disabled={saving}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors font-bold text-sm flex items-center justify-center gap-2"
              >
                {saving ? 'Guardando...' : <><IconSave /> Guardar Configuración</>}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {opportunities.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-red-700 mb-4">
                <IconAlert />
                <h3 className="text-sm font-bold">Fuga de rentabilidad detectada</h3>
              </div>
              
              <div className="space-y-3">
                {opportunities.map((opp, idx) => {
                  const mensajeWa = encodeURIComponent(`Hola, analizando tu negocio en EasyTrack hemos detectado que mueves una media de ${opp.volumenMensual} paquetes/mes con ${opp.empresa}. Actualmente te pagan ${formatEUR(opp.ticketActual)}, pero con tu volumen puedes exigir ${formatEUR(opp.ticketObjetivo)} a tu gestor. Estás perdiendo ${formatEUR(opp.fugaAnual)} al año. ¡Usa tus informes de la App para reclamarlo!`);
                  const tlf = tenant.phone ? tenant.phone.replace(/\D/g,'') : '';

                  return (
                    <div key={idx} className="bg-white border border-red-100 rounded-lg p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div>
                        <p className="text-zinc-900 font-bold text-sm mb-1">{opp.empresa} <span className="text-zinc-500 font-normal">({opp.volumenMensual} paq/mes)</span></p>
                        <p className="text-sm text-zinc-600">
                          Cobro actual: <span className="font-mono text-zinc-900">{formatEUR(opp.ticketActual)}</span> <span className="mx-2">→</span> Justo: <span className="font-mono font-bold text-emerald-600">{formatEUR(opp.ticketObjetivo)}</span>
                        </p>
                        <p className="text-sm font-semibold text-red-600 mt-1">
                          {opp.fugaHistorica !== null ? (
                            <>Impacto anualizado: {formatEUR(opp.fugaAnual)}</>
                          ) : (
                            <>Impacto anualizado: {formatEUR(opp.fugaAnual)}</>
                          )}
                        </p>
                      </div>
                      <a 
                        href={tlf ? `https://wa.me/34${tlf}?text=${mensajeWa}` : '#'} 
                        target={tlf ? "_blank" : "_self"}
                        onClick={(e) => { if(!tlf) { e.preventDefault(); alert("Cliente sin teléfono registrado."); }}}
                        className="shrink-0 flex items-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        <IconWhatsapp /> Notificar cliente
                      </a>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col min-h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h3 className="text-lg font-bold text-zinc-950">Desglose de Operaciones</h3>
              <select 
                value={timeRange} 
                onChange={e => setTimeRange(e.target.value)} 
                className="bg-zinc-50 border border-zinc-200 text-sm font-medium text-zinc-700 px-3 py-2 rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                <option value="today">Generado Hoy</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mes</option>
                <option value="all">Histórico Completo</option>
              </select>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-sm">Procesando datos...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Facturación del local</p>
                    <p className="text-3xl font-mono font-black text-zinc-900">{formatEUR(totals.revenue)}</p>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Volumen gestionado</p>
                    <p className="text-3xl font-mono font-black text-zinc-900">{totals.volume.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                    <table className="w-full text-left whitespace-nowrap text-sm">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500">
                          <th className="py-3 px-4">Operador Logístico</th>
                          <th className="py-3 px-4 text-right">Paquetes</th>
                          <th className="py-3 px-4 text-right">Promedio/Paquete</th>
                          <th className="py-3 px-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {statsData.length === 0 ? (
                          <tr><td colSpan="4" className="py-8 text-center text-zinc-500 text-sm">No hay registros en este periodo.</td></tr>
                        ) : (
                          statsData.map(c => (
                            <tr key={c.empresa_transporte} className="hover:bg-zinc-50 transition-colors">
                              <td className="py-3 px-4 font-semibold text-zinc-900">{c.empresa_transporte}</td>
                              <td className="py-3 px-4 text-right font-mono text-zinc-600">{Number(c.volumen).toLocaleString()}</td>
                              <td className="py-3 px-4 text-right font-mono text-zinc-600">{formatEUR(c.ticket_medio)}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">{formatEUR(c.ingreso_total)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};


export default function AdminDashboard() {
  const [tenants, setTenants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [adminReviews, setAdminReviews] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortKey, setSortKey] = useState('total_paquetes');
  const [sortDir, setSortDir] = useState('desc');

  const [inspectingTenant, setInspectingTenant] = useState(null);
  const [globalTimeFilter, setGlobalTimeFilter] = useState('all');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resT, resL, resR] = await Promise.all([
        supabase.rpc('admin_get_all_tenants'),
        supabase.rpc('admin_get_global_carrier_stats', { p_time_range: globalTimeFilter }),
        supabase.from('reviews').select('id, rating, comentario, status, created_at, tenants(nombre_empresa)').order('created_at', { ascending: false })
      ]);
      
      if (resT.error) throw resT.error;
      if (resL.error) throw resL.error;
      if (resR.error) throw resR.error;

      const tenantsWithCost = (resT.data || []).map(t => ({
        ...t,
        ai_cost: getAiCost(t.ai_prompt_tokens, t.ai_completion_tokens)
      }));

      setTenants(tenantsWithCost);
      setLeaderboard(resL.data || []);
      setAdminReviews(resR.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, [globalTimeFilter]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleReviewAction = async (reviewId, newStatus) => {
    try {
      const { error } = await supabase.from('reviews').update({ status: newStatus }).eq('id', reviewId);
      if (error) throw error;
      setAdminReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
    } catch (error) {
      alert("Error en la base de datos: " + error.message);
    }
  };

  const processedTenants = useMemo(() => {
    let filtered = tenants.filter(t => 
      t.nombre_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let valA = a[sortKey]; let valB = b[sortKey];
      if (['total_paquetes', 'ingresos_mes', 'paquetes_hoy', 'top_ticket_medio', 'ai_cost'].includes(sortKey)) {
         valA = Number(valA) || 0; valB = Number(valB) || 0;
         return sortDir === 'asc' ? valA - valB : valB - valA;
      } else {
         valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase();
         if (valA < valB) return sortDir === 'asc' ? -1 : 1;
         if (valA > valB) return sortDir === 'asc' ? 1 : -1;
         return 0;
      }
    });
  }, [tenants, searchTerm, sortKey, sortDir]);

  const globalMetrics = useMemo(() => {
    return {
      total: tenants.length,
      ingresosMesGlobal: tenants.reduce((acc, t) => acc + (Number(t.ingresos_mes) || 0), 0),
      inToday: tenants.reduce((acc, t) => acc + (Number(t.paquetes_hoy) || 0), 0),
      totalFlow: tenants.reduce((acc, t) => acc + (Number(t.total_paquetes) || 0), 0),
      proCount: tenants.filter(t => t.plan_id === 'pro').length,
      totalAiCost: tenants.reduce((acc, t) => acc + t.ai_cost, 0)
    };
  }, [tenants]);

  const networkRevenue = useMemo(() => leaderboard.reduce((acc, c) => acc + (Number(c.ingreso_total) || 0), 0), [leaderboard]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 font-sans">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950 flex items-center gap-4">
            Operaciones Globales
            <button onClick={fetchAllData} className="text-zinc-400 hover:text-zinc-900 transition-colors p-2 rounded-lg hover:bg-zinc-100" title="Refrescar">
               <IconRefresh />
            </button>
          </h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full xl:w-auto">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm min-w-[140px]">
            <p className="text-xs font-semibold text-zinc-500 mb-1">Ingresos MRR</p>
            <p className="text-2xl font-mono font-black text-brand-600">{formatEUR(globalMetrics.proCount * 29)}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm min-w-[140px]">
            <p className="text-xs font-semibold text-zinc-500 mb-1">Volumen € Movido</p>
            <p className="text-2xl font-mono font-black text-zinc-900">{formatEUR(networkRevenue)}</p>
          </div>
          <div className="bg-white border border-red-100 rounded-xl p-5 shadow-sm min-w-[140px]">
            <p className="text-xs font-semibold text-red-500 mb-1">Gasto Infraestructura</p>
            <p className="text-2xl font-mono font-black text-red-600">{formatMicroEUR(globalMetrics.totalAiCost)}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm min-w-[140px]">
            <p className="text-xs font-semibold text-zinc-500 mb-1">Tráfico Global</p>
            <p className="text-2xl font-mono font-black text-zinc-900">{globalMetrics.totalFlow.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm min-w-[140px]">
            <p className="text-xs font-semibold text-zinc-500 mb-1">Clientes Activos</p>
            <p className="text-2xl font-mono font-black text-zinc-900">{globalMetrics.total}</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {inspectingTenant ? (
          <TenantInspector 
            key="inspector" 
            tenant={inspectingTenant} 
            onBack={() => { setInspectingTenant(null); fetchAllData(); }} 
            onUpdate={fetchAllData} 
          />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            
            {adminReviews.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-bold text-zinc-900">Control de Calidad (Reseñas)</h3>
                  <span className="bg-zinc-100 text-zinc-600 text-xs font-bold px-2 py-0.5 rounded-full">{adminReviews.length}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                  {adminReviews.map(rev => (
                    <div 
                      key={rev.id} 
                      className={`border rounded-lg p-4 flex flex-col justify-between transition-all ${
                        rev.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 
                        rev.status === 'rejected' ? 'bg-zinc-50 border-zinc-200 opacity-70' : 
                        'bg-white border-zinc-200'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 text-sm">{rev.tenants?.nombre_empresa}</span>
                            {rev.status === 'approved' && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">Verificada</span>}
                            {rev.status === 'pending' && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded">Pendiente</span>}
                            {rev.status === 'rejected' && <span className="bg-zinc-200 text-zinc-600 text-[10px] font-bold px-2 py-0.5 rounded">Descartada</span>}
                          </div>
                          <div className="flex text-amber-500">
                             {[...Array(5)].map((_, i) => (
                               <div key={i} className={i < rev.rating ? 'opacity-100' : 'opacity-20'}><IconStar /></div>
                             ))}
                          </div>
                        </div>
                        <p className="text-zinc-600 text-sm mb-4">"{rev.comentario}"</p>
                      </div>
                      
                      {rev.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleReviewAction(rev.id, 'approved')} className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-900 font-bold text-xs py-2 rounded-lg transition-colors">
                            Aprobar publicación
                          </button>
                          <button onClick={() => handleReviewAction(rev.id, 'rejected')} className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs py-2 rounded-lg transition-colors">
                            Ocultar
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end pt-3 border-t border-black/5 mt-2">
                          <button 
                            onClick={() => handleReviewAction(rev.id, rev.status === 'approved' ? 'rejected' : 'approved')} 
                            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                          >
                            {rev.status === 'approved' ? 'Revocar visibilidad' : 'Restaurar y aprobar'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <IconBuilding /> Dominancia Logística Nacional
                </h3>
                <select 
                  value={globalTimeFilter} 
                  onChange={e => setGlobalTimeFilter(e.target.value)} 
                  className="bg-white border border-zinc-300 text-sm font-medium text-zinc-700 px-3 py-2 rounded-lg outline-none cursor-pointer focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="today">Dato de hoy</option>
                  <option value="week">Semana actual</option>
                  <option value="month">Mes en curso</option>
                  <option value="all">Historico total</option>
                </select>
              </div>

              <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500">
                      <th className="py-3 px-4">Operador</th>
                      <th className="py-3 px-4 text-right">Volumen</th>
                      <th className="py-3 px-4 text-right">TKT Promedio</th>
                      <th className="py-3 px-4 text-right">Inyección Económica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono">
                    {loading ? (
                      <tr><td colSpan="4" className="py-8 text-center text-zinc-400 font-sans text-sm">Sincronizando...</td></tr>
                    ) : leaderboard.length === 0 ? (
                      <tr><td colSpan="4" className="py-8 text-center text-zinc-500 font-sans text-sm">Sin movimiento logístico.</td></tr>
                    ) : (
                      leaderboard.slice(0, 6).map((c, i) => (
                        <tr key={c.empresa_transporte} className="hover:bg-zinc-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-zinc-900 font-sans flex items-center gap-2">
                            <span className="text-zinc-400 text-xs">{i+1}.</span> 
                            {c.empresa_transporte}
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-600">{Number(c.volumen).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-zinc-600">{formatEUR(c.ticket_medio)}</td>
                          <td className="py-3 px-4 text-right font-bold text-zinc-900">{formatEUR(c.ingreso_total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <IconSearch />
                </div>
                <input
                  type="text"
                  placeholder="Localizar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500 select-none">
                      <th className="px-6 py-4 cursor-pointer hover:text-zinc-800" onClick={() => handleSort('nombre_empresa')}>Empresa {sortKey==='nombre_empresa' && (sortDir==='asc'?'↑':'↓')}</th>
                      <th className="px-6 py-4 cursor-pointer hover:text-zinc-800" onClick={() => handleSort('total_paquetes')}>Límites / Tráfico {sortKey==='total_paquetes' && (sortDir==='asc'?'↑':'↓')}</th>
                      <th className="px-6 py-4 cursor-pointer hover:text-zinc-800" onClick={() => handleSort('ingresos_mes')}>Cashflow Local {sortKey==='ingresos_mes' && (sortDir==='asc'?'↑':'↓')}</th>
                      <th className="px-6 py-4 cursor-pointer hover:text-zinc-800" onClick={() => handleSort('ai_cost')}>Carga Servidor {sortKey==='ai_cost' && (sortDir==='asc'?'↑':'↓')}</th>
                      <th className="px-6 py-4 cursor-pointer hover:text-zinc-800" onClick={() => handleSort('ultima_actividad')}>Ping {sortKey==='ultima_actividad' && (sortDir==='asc'?'↑':'↓')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-16 text-center text-zinc-500">
                          Extrayendo base de datos...
                        </td>
                      </tr>
                    ) : processedTenants.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-16 text-center text-zinc-500">
                          Directorio vacío o sin resultados para la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      processedTenants.map((t, i) => {
                        const isPro = t.plan_id === 'pro';
                        const isBlocked = t.status !== 'active';
                        const hoursSinceActive = t.ultima_actividad ? (new Date() - new Date(t.ultima_actividad)) / 3600000 : 999;
                        const pingColor = hoursSinceActive < 1 ? 'bg-emerald-500' : (hoursSinceActive < 24 ? 'bg-brand-500' : 'bg-zinc-300');

                        return (
                          <motion.tr 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
                            key={t.id} 
                            className="hover:bg-zinc-50 transition-colors cursor-pointer"
                            onClick={() => setInspectingTenant(t)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-zinc-900 text-base">{t.nombre_empresa || 'S/N'}</span>
                                  {isPro && <span className="bg-zinc-100 text-zinc-800 border border-zinc-200 text-[10px] px-1.5 py-0.5 rounded font-bold">PRO</span>}
                                  {isBlocked && <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] px-1.5 py-0.5 rounded font-bold">SUSPENDIDO</span>}
                                </div>
                                <span className="text-xs text-zinc-500">{t.email}</span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex flex-col w-full max-w-[140px]">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-mono font-medium text-zinc-700 text-sm">
                                    {t.trial_used} <span className="text-zinc-400 text-xs">/ {t.trial_quota || '∞'}</span>
                                  </span>
                                  <span className="font-mono font-bold text-brand-600 text-xs">+{t.paquetes_hoy || 0}</span>
                                </div>
                                {t.trial_quota > 0 && (
                                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                                    <div 
                                      className={`h-full ${t.trial_used >= t.trial_quota ? 'bg-red-500' : 'bg-zinc-800'}`} 
                                      style={{ width: `${Math.min((t.trial_used / t.trial_quota) * 100, 100)}%` }} 
                                    />
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-zinc-900 text-sm">{formatEUR(t.ingresos_mes)}</span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-zinc-900 text-sm">{formatMicroEUR(t.ai_cost)}</span>
                                <span className="text-xs text-zinc-500">{t.ai_scans_count || 0} requ.</span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${pingColor}`} />
                                <span className="text-sm font-medium text-zinc-600">
                                  {timeAgo(t.ultima_actividad)}
                                </span>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}