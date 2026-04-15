import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const IconTerminal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconBuilding = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/></svg>;
const IconTarget = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;

export default function AdminRadar() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState("SISTEMA LISTO");

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

  const scanArea = async () => {
    if (!mapInstance.current || loading) return;
    
    setLoading(true);
    setStatusMsg("CAPTURANDO COORDENADAS...");
    
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

      if (markersGroup.current) {
        markersGroup.current.clearLayers();
        const L = window.L;
        
        newLeads.forEach(lead => {
          const icon = L.divIcon({
            className: 'bg-transparent',
            html: `<div class="w-6 h-6 bg-brand-500 rounded-full border-4 border-zinc-950 shadow-[0_0_15px_rgba(20,184,166,0.6)] animate-pulse"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          L.marker([lead.lat, lead.lon], { icon })
            .bindPopup(`<div style="color:#000;padding:5px"><b>${lead.name}</b><br/>${lead.street}</div>`)
            .addTo(markersGroup.current);
        });
      }

    } catch (error) {
      setStatusMsg(`FALLO: ${error.message.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      
      <div className="flex-1 rounded-[2rem] overflow-hidden border border-zinc-800 relative bg-zinc-900 shadow-2xl">
        <style dangerouslySetInnerHTML={{ __html: `
          .leaflet-container { background: #09090b !important; }
          .leaflet-tile { filter: grayscale(1) invert(1) opacity(0.2) !important; }
          .leaflet-popup-content-wrapper { border-radius: 12px !important; background: #fff !important; }
        `}} />

        <div className="absolute top-6 left-6 z-[999] flex flex-col gap-3">
          <button 
            onClick={scanArea} 
            disabled={loading || !leafletReady}
            className="group flex items-center gap-3 px-6 py-4 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-800 text-zinc-950 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all shadow-2xl active:scale-95"
          >
            {loading ? <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" /> : <IconTarget />}
            {loading ? 'CALIBRANDO...' : 'EJECUTAR ESCÁNER'}
          </button>
          
          <div className="bg-zinc-950/90 backdrop-blur-xl border border-white/5 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
             <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
             <span className="text-[10px] font-mono font-black text-brand-400 uppercase tracking-widest">{statusMsg}</span>
          </div>
        </div>

        <div ref={mapRef} className="w-full h-full z-10" />
      </div>

      <div className="w-full lg:w-80 bg-zinc-950 border border-zinc-800 rounded-[2rem] flex flex-col shadow-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/20">
          <div className="flex items-center gap-3 mb-1">
            <div className="text-brand-500"><IconTerminal /></div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Base de Datos</h2>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Prospectos en tiempo real</p>
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
          {leads.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <IconBuilding />
              <p className="text-[9px] font-black uppercase mt-4 tracking-widest">Sin datos en visor</p>
            </div>
          ) : (
            leads.map(lead => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                key={lead.id} 
                className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl hover:border-brand-500/30 transition-all group"
              >
                <h4 className="font-black text-white text-[11px] truncate mb-1 uppercase">{lead.name}</h4>
                <p className="text-[10px] font-bold text-zinc-500 mb-3 truncate italic">{lead.street}</p>
                <div className="flex items-center justify-between">
                   <span className="px-2 py-0.5 bg-brand-500/10 text-brand-500 text-[8px] font-black rounded-md border border-brand-500/20">SEUR HUB</span>
                   <span className="text-[9px] font-mono text-zinc-700">NODE_{lead.id.slice(-4)}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}