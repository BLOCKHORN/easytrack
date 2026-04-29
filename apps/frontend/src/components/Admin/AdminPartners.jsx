'use strict';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconRefresh = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;

const formatEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n || 0);

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session ? `Bearer ${session.access_token}` : ''
  };
};

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');

export default function AdminPartners() {
  const [partners, setPartners] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comerciales');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [newPartner, setNewPartner] = useState({ email: '', nombre: '', empresa_reparto: '', telefono: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/partners/admin`, { headers });
      const data = await res.json();
      
      if (!data.ok) throw new Error(data.error);

      setPartners(data.partners || []);
      setTenants(data.tenants || []);
      setPayouts(data.payouts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const calculatePartnerStats = (partnerId) => {
    const activeClients = tenants
      .filter(t => t.partner_id === partnerId && t.status === 'active')
      .sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));

    let monthlyTotal = 0;
    activeClients.forEach((_, index) => {
      const position = index + 1;
      if (position <= 10) monthlyTotal += 5;
      else if (position <= 50) monthlyTotal += 7.5;
      else monthlyTotal += 10;
    });

    return { count: activeClients.length, monthly: monthlyTotal };
  };

  const globalMetrics = useMemo(() => {
    const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const linkedTenants = tenants.filter(t => t.partner_id !== null).length;
    return {
      totalPartners: partners.length,
      linkedTenants,
      pendingPayouts
    };
  }, [partners, tenants, payouts]);

  const processedTenants = useMemo(() => {
    return tenants.filter(t => 
      t.nombre_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tenants, searchTerm]);

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/partners/admin/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newPartner)
      });
      const data = await res.json();
      
      if (!data.ok) throw new Error(data.error);

      setShowModal(false);
      setNewPartner({ email: '', nombre: '', empresa_reparto: '', telefono: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!window.confirm("¿Seguro que quieres eliminar a este comercial? Los negocios vinculados quedarán sin asignar.")) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/partners/admin/delete/${partnerId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLinkPartner = async (tenantId, partnerId) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/partners/admin/assign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tenant_id: tenantId, partner_id: partnerId || null })
      });
      const data = await res.json();
      
      if (!data.ok) throw new Error(data.error);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePayOut = async (payoutId) => {
    if(!window.confirm("¿Confirmas que ya has liquidado este pago (Bizum o Efectivo)?")) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/partners/admin/liquidate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ payout_id: payoutId })
      });
      const data = await res.json();
      
      if (!data.ok) throw new Error(data.error);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 font-sans text-zinc-900">
      
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950 flex items-center gap-4">
            Gestión de Comerciales
            <button onClick={fetchData} className="text-zinc-400 hover:text-zinc-900 transition-colors p-2 rounded-lg hover:bg-zinc-100" title="Refrescar">
               <IconRefresh />
            </button>
          </h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm min-w-[140px]">
            <p className="text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-widest">Plantilla Activa</p>
            <p className="text-2xl font-mono font-black text-zinc-900">{globalMetrics.totalPartners}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm min-w-[140px]">
            <p className="text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-widest">Locales Asignados</p>
            <p className="text-2xl font-mono font-black text-brand-600">{globalMetrics.linkedTenants}</p>
          </div>
          <div className="bg-white border border-red-100 rounded-xl p-5 shadow-sm min-w-[140px]">
            <p className="text-xs font-semibold text-red-500 mb-1 uppercase tracking-widest">Deuda Pendiente</p>
            <p className="text-2xl font-mono font-black text-red-600">{formatEUR(globalMetrics.pendingPayouts)}</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl flex flex-col items-center justify-center transition-all font-bold min-w-[140px] shadow-sm"
          >
            <IconPlus />
            <span className="text-xs mt-1 uppercase tracking-widest">Registrar Alta</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-zinc-100 border border-zinc-200 rounded-xl w-fit">
        {[
          { id: 'comerciales', label: 'Flota Comercial' },
          { id: 'solicitudes', label: 'Retiros Pendientes' },
          { id: 'vinculacion', label: 'Asignación de Locales' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'comerciales' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black text-zinc-500 uppercase tracking-widest select-none">
                      <th className="px-6 py-4">Agente / Contacto</th>
                      <th className="px-6 py-4">Operador Logístico</th>
                      <th className="px-6 py-4 text-center">Cartera Activa</th>
                      <th className="px-6 py-4 text-right">Proyección Mensual</th>
                      <th className="px-6 py-4 text-right">Saldo Retirable</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {loading ? (
                      <tr><td colSpan="6" className="px-6 py-12 text-center text-zinc-500">Sincronizando flota...</td></tr>
                    ) : partners.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-12 text-center text-zinc-500 font-medium uppercase tracking-widest text-xs">No hay comerciales registrados.</td></tr>
                    ) : (
                      partners.map(p => {
                        const stats = calculatePartnerStats(p.id);
                        return (
                          <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-zinc-950 text-base">{p.nombre}</span>
                                <span className="text-xs text-zinc-500 font-mono">{p.telefono || 'SIN CONTACTO'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-zinc-700 uppercase tracking-wider text-xs">{p.empresa_reparto || 'Independiente'}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="bg-zinc-100 border border-zinc-200 text-zinc-950 px-3 py-1 rounded text-xs font-mono font-bold">
                                {stats.count}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-brand-600">{formatEUR(stats.monthly)}</td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-zinc-950">{formatEUR(p.saldo_acumulado)}</td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDeletePartner(p.id)}
                                className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                                title="Eliminar comercial"
                              >
                                <IconTrash />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'solicitudes' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black text-zinc-500 uppercase tracking-widest select-none">
                      <th className="px-6 py-4">Registro</th>
                      <th className="px-6 py-4">Beneficiario</th>
                      <th className="px-6 py-4 text-right">Importe Solicitado</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {payouts.filter(pay => pay.status === 'pending').length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-zinc-500 font-medium uppercase tracking-widest text-xs">Bandeja de retiros limpia.</td></tr>
                    ) : (
                      payouts.filter(pay => pay.status === 'pending').map(pay => (
                        <tr key={pay.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-zinc-500 text-xs">{new Date(pay.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-zinc-950">{pay.partners?.nombre}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-red-600">{formatEUR(pay.amount)}</td>
                          <td className="px-6 py-4 flex justify-end">
                            <button 
                              onClick={() => handlePayOut(pay.id)}
                              className="bg-white hover:bg-zinc-950 border border-zinc-300 hover:border-zinc-950 text-zinc-700 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                            >
                              <IconCheck /> Liquidar Pago
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'vinculacion' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder="Filtrar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm font-medium text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-sm"
              />
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black text-zinc-500 uppercase tracking-widest select-none">
                      <th className="px-6 py-4">Empresa Suscrita</th>
                      <th className="px-6 py-4">Contacto Autorizado</th>
                      <th className="px-6 py-4 text-right">Comercial Gestor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {processedTenants.length === 0 ? (
                       <tr><td colSpan="3" className="px-6 py-12 text-center text-zinc-500 font-medium uppercase tracking-widest text-xs">Sin resultados.</td></tr>
                    ) : (
                      processedTenants.map(t => (
                        <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-zinc-950 text-base">{t.nombre_empresa || 'S/N'}</td>
                          <td className="px-6 py-4 text-zinc-500 text-sm font-mono">{t.email}</td>
                          <td className="px-6 py-4 text-right">
                            <select 
                              value={t.partner_id || ''} 
                              onChange={(e) => handleLinkPartner(t.id, e.target.value)}
                              className="bg-white border border-zinc-300 text-zinc-950 text-xs font-bold px-3 py-2 rounded-lg outline-none cursor-pointer focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-sm"
                            >
                              <option value="">-- Sin Asignar --</option>
                              {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} ({p.empresa_reparto || 'Ind.'})</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border border-zinc-200 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <h2 className="text-xl font-bold text-zinc-950 mb-6">Nuevo Alta Comercial</h2>
            
            <form onSubmit={handleCreatePartner} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">Cuenta de Usuario</label>
                <select 
                  required 
                  value={newPartner.email} 
                  onChange={e => setNewPartner({...newPartner, email: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2.5 text-zinc-950 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-sm cursor-pointer font-semibold"
                >
                  <option value="">-- Elige un usuario registrado --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.email}>
                      {t.nombre_empresa || 'S/N'} ({t.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">Nombre del Agente</label>
                <input 
                  required type="text" value={newPartner.nombre} onChange={e => setNewPartner({...newPartner, nombre: e.target.value})}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-950 text-sm font-semibold focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">Agencia (GLS/Seur)</label>
                  <input 
                    type="text" value={newPartner.empresa_reparto} onChange={e => setNewPartner({...newPartner, empresa_reparto: e.target.value})}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-950 text-sm font-semibold focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">Teléfono / Bizum</label>
                  <input 
                    type="text" value={newPartner.telefono} onChange={e => setNewPartner({...newPartner, telefono: e.target.value})}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-950 font-mono text-sm font-bold focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 mt-2">
                <button type="button" disabled={isSubmitting} onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-white border border-zinc-300 text-zinc-700 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-zinc-50 transition-colors shadow-sm">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-colors shadow-sm">
                  {isSubmitting ? 'Procesando...' : 'Confirmar Alta'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}