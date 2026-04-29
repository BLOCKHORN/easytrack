'use strict';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const IconTerminal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconBuilding = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/></svg>;
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
  const [statusMsg, setStatusMsg] = useState("SISTEMA SINCRONIZADO");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
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
        html: `<div class="w-6 h-6 rounded-full border-4 shadow-xl transition-all duration-300 ${isSelected ? 'bg-white border-brand-500 scale-125 z-50' : 'bg-brand-500 border-white hover:scale-110'}"></div>`,
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
    setStatusMsg("OBTENIENDO GEOLOCALIZACIÓN...");
    setSelectedLead(null);
    setCurrentPage(1);

    try {
      const center = mapInstance.current.getCenter();
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${center.lat}&lon=${center.lng}&format=json`);
      const geoData = await geoRes.json();
      const cp = geoData.address?.postcode;
      const city = geoData.address?.city || geoData.address?.town || "";

      if (!cp) throw new Error("ÁREA SIN COBERTURA");

      setStatusMsg(`ESCANEANDO CÓDIGO POSTAL ${cp}...`);

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
      setStatusMsg(`${newLeads.length} PUNTOS DETECTADOS`);

    } catch (error) {
      setStatusMsg(`ERROR: ${error.message.toUpperCase()}`);
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
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[calc(100vh-10rem)]">
      
      <div className="flex-none h-[45vh] lg:h-auto lg:flex-1 rounded-3xl overflow-hidden border border-zinc-200 relative bg-white shadow-sm">
        <style dangerouslySetInnerHTML={{ __html: `
          .leaflet-container { background: #f4f4f5 !important; outline: none; }
          .leaflet-tile { filter: saturate(0.5) opacity(0.8); }
        `}} />

        <div className="absolute top-6 left-6 z-[400] flex flex-col gap-3">
          <button
            onClick={scanArea}
            disabled={loading || !leafletReady}
            className="flex items-center gap-3 px-6 py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 text-white disabled:text-zinc-500 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg active:scale-95"
          >
            {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <IconTarget />}
            {loading ? 'PROCESANDO...' : 'EJECUTAR RADAR'}
          </button>

          <div className="bg-white/90 backdrop-blur-md border border-zinc-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
            <div className={`w-2 h-2 rounded-full bg-brand-500 ${loading ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{statusMsg}</span>
          </div>
        </div>

        <div ref={mapRef} className="w-full h-full z-10" />
      </div>

      <div className="w-full lg:w-[400px] flex-none bg-white border border-zinc-200 rounded-3xl flex flex-col shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedLead ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              <div className="p-6 border-b border-zinc-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-zinc-400"><IconTerminal /></div>
                  <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-widest">Prospectos Detectados</h2>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Mapeo de competencia local</p>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
                {leads.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <IconBuilding />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mt-4 tracking-widest">Sin datos capturados</p>
                  </div>
                ) : (
                  currentLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => handleLeadClick(lead)}
                      className="bg-zinc-50 border border-zinc-100 p-5 rounded-2xl hover:border-brand-500/30 hover:bg-white hover:shadow-md cursor-pointer transition-all group"
                    >
                      <h4 className="font-bold text-zinc-950 text-xs truncate mb-1 uppercase">{lead.name}</h4>
                      <p className="text-[10px] font-medium text-zinc-500 mb-4 truncate">{lead.street}</p>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-white text-zinc-600 text-[9px] font-bold rounded border border-zinc-200 uppercase">{lead.city}</span>
                        <span className="text-[9px] font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Ver Ficha</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 disabled:opacity-30 transition-colors shadow-sm"
                  >
                    <IconChevronLeft />
                  </button>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {currentPage} / {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 disabled:opacity-30 transition-colors shadow-sm"
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
              className="flex flex-col h-full"
            >
              <div className="p-6 border-b border-zinc-100">
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-colors mb-6"
                >
                  <IconArrowLeft /> Resultados
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-zinc-950 text-white text-[9px] font-bold rounded uppercase tracking-widest">Punto de Entrega</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-950 uppercase leading-tight">{selectedLead.name}</h2>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-8">
                <div>
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Dirección Física</h3>
                  <p className="text-sm font-semibold text-zinc-800">{selectedLead.street}</p>
                  <p className="text-sm font-medium text-zinc-500">{selectedLead.city}</p>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Posicionamiento GPS</h3>
                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <IconCrosshair className="text-zinc-400" />
                    <span className="text-xs font-mono font-bold text-zinc-600">{selectedLead.lat.toFixed(6)}, {selectedLead.lon.toFixed(6)}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 flex flex-col gap-3">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLead.name + ' ' + selectedLead.street + ' ' + selectedLead.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-900 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-sm"
                  >
                    <IconSearch /> Google Maps
                  </a>
                  
                  <button className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-md active:scale-95">
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