import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const IconTerminal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconBuilding = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/></svg>;
const IconTarget = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconArrowLeft = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IconChevronLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconChevronRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconCrosshair = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>;
const IconSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

export default function AdminRadar() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);

  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState("SISTEMA LISTO");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const currentLeads = leads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    if (window.L) {
      setLeafletReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLeafletReady(true);
    document.body.appendChild(script);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstance.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [39.4699, -0.3762],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersGroup.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [leafletReady]);

  useEffect(() => {
    if (!markersGroup.current || !window.L) return;

    markersGroup.current.clearLayers();
    const L = window.L;

    leads.forEach(lead => {
      const isSelected = selectedLead?.id === lead.id;
      const icon = L.divIcon({
        className: 'bg-transparent',
        html: `<div class="w-6 h-6 rounded-full border-4 shadow-2xl transition-all duration-300 ${isSelected ? 'bg-white border-brand-500 scale-125 z-50' : 'bg-brand-500 border-zinc-950 hover:scale-110'}"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lead.lat, lead.lon], { icon }).addTo(markersGroup.current);
      
      marker.on('click', () => {
        setSelectedLead(lead);
        mapInstance.current.flyTo([lead.lat, lead.lon], 16, { duration: 0.5 });
      });
    });
  }, [leads, selectedLead]);

  const scanArea = async () => {
    if (!mapInstance.current || loading) return;

    setLoading(true);
    setStatusMsg("CAPTURANDO COORDENADAS...");
    setSelectedLead(null);
    setCurrentPage(1);

    try {
      const center = mapInstance.current.getCenter();

      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${center.lat}&lon=${center.lng}&format=json`);
      const geoData = await geoRes.json();
      const cp = geoData.address?.postcode;
      const city = geoData.address?.city || geoData.address?.town || "";

      if (!cp) throw new Error("SIN COBERTURA POSTAL");

      setStatusMsg(`ESCANEANDO CP ${cp}...`);

      const { data: { session } } = await supabase.auth.getSession();
      const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001";

      const res = await fetch(`${API_URL}/api/admin/radar/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ codigo_postal: cp, poblacion: city })
      });

      const data = await res.json();
      const newLeads = data.leads || [];

      setLeads(newLeads);
      setStatusMsg(`${newLeads.length} TIENDAS SEUR`);

    } catch (error) {
      setStatusMsg(`FALLO: ${error.message.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
    if (mapInstance.current) {
      mapInstance.current.flyTo([lead.lat, lead.lon], 16, { duration: 0.5 });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full min-h-[calc(100vh-6rem)] lg:min-h-0 lg:h-[calc(100vh-8rem)]">

      <div className="flex-none h-[50vh] lg:h-auto lg:flex-1 rounded-[2rem] overflow-hidden border border-zinc-800 relative bg-zinc-900 shadow-2xl">
        <style dangerouslySetInnerHTML={{ __html: `
          .leaflet-container { background: #09090b !important; outline: none; }
          .leaflet-tile { filter: grayscale(1) invert(1) opacity(0.3) !important; }
        `}} />

        <div className="absolute top-4 left-4 lg:top-6 lg:left-6 z-[400] flex flex-col gap-2 lg:gap-3 max-w-[calc(100%-2rem)]">
          <button
            onClick={scanArea}
            disabled={loading || !leafletReady}
            className="group flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-6 py-3 lg:py-4 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-800 text-zinc-950 font-black uppercase tracking-[0.2em] text-[10px] lg:text-[11px] rounded-2xl transition-all shadow-2xl active:scale-95"
          >
            {loading ? <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" /> : <IconTarget />}
            {loading ? 'CALIBRANDO...' : 'EJECUTAR ESCÁNER'}
          </button>

          <div className="bg-zinc-950/90 backdrop-blur-xl border border-white/5 px-3 lg:px-4 py-2 lg:py-3 rounded-2xl flex items-center gap-3 shadow-2xl overflow-hidden">
             <div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0 animate-ping" />
             <span className="text-[9px] lg:text-[10px] font-mono font-black text-brand-400 uppercase tracking-widest truncate">{statusMsg}</span>
          </div>
        </div>

        <div ref={mapRef} className="w-full h-full z-10" />
      </div>

      <div className="w-full lg:w-96 flex-1 lg:flex-none bg-zinc-950 border border-zinc-800 rounded-[2rem] flex flex-col shadow-xl overflow-hidden min-h-[400px] relative">
        <AnimatePresence mode="wait">
          {!selectedLead ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <div className="p-4 lg:p-6 border-b border-zinc-800 bg-zinc-900/20">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-brand-500"><IconTerminal /></div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Base de Datos</h2>
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Prospectos en cuadrícula</p>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
                {leads.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                    <IconBuilding />
                    <p className="text-[9px] font-black uppercase mt-4 tracking-widest">Sin datos en visor</p>
                  </div>
                ) : (
                  currentLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => handleLeadClick(lead)}
                      className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl hover:border-brand-500/50 hover:bg-zinc-900 cursor-pointer transition-all group"
                    >
                      <h4 className="font-black text-white text-[11px] truncate mb-1 uppercase group-hover:text-brand-400 transition-colors">{lead.name}</h4>
                      <p className="text-[10px] font-bold text-zinc-500 mb-3 truncate">{lead.street}</p>
                      <div className="flex items-center justify-between">
                         <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[8px] font-black rounded-md border border-zinc-700 uppercase">{lead.city}</span>
                         <span className="text-[9px] font-mono text-zinc-600 group-hover:text-brand-500/50 transition-colors">Ver Detalles</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <IconChevronLeft />
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500">
                    PÁGINA {currentPage} DE {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <IconChevronRight />
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full bg-zinc-950"
            >
              <div className="p-4 lg:p-6 border-b border-zinc-800 bg-zinc-900/20 sticky top-0 backdrop-blur-md z-10">
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors mb-6"
                >
                  <IconArrowLeft /> Volver a resultados
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-brand-500/10 text-brand-500 text-[8px] font-black rounded-md border border-brand-500/20">SEUR HUB</span>
                </div>
                <h2 className="text-lg font-black text-white uppercase leading-tight">{selectedLead.name}</h2>
              </div>

              <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6">
                <div>
                  <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Ubicación Registrada</h3>
                  <p className="text-sm font-medium text-zinc-300">{selectedLead.street}</p>
                  <p className="text-sm font-medium text-zinc-500">{selectedLead.city}</p>
                </div>

                <div>
                  <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Coordenadas del sistema</h3>
                  <div className="flex items-center gap-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <IconCrosshair />
                    <span className="text-xs font-mono text-zinc-300">{selectedLead.lat.toFixed(6)}, {selectedLead.lon.toFixed(6)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/50 flex flex-col gap-3">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLead.name + ' ' + selectedLead.street + ' ' + selectedLead.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95"
                  >
                    <IconSearch />
                    Investigar en Google Maps
                  </a>
                  
                  <button className="w-full py-4 bg-white hover:bg-zinc-200 text-zinc-950 font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all active:scale-95 shadow-xl">
                    Añadir a Pipeline de Ventas
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}