import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush
} from "recharts";
import { Truck } from "lucide-react";
import { useLocation } from "react-router-dom";
import "../styles/VolumenPaquetes.scss";
import { supabase } from "../utils/supabaseClient";

export default function VolumenPaquetes() {
  const location = useLocation();

  // API base coherente con el Dashboard (scoping por slug)
  const apiBase = useMemo(() => {
    const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");
    const segs = location.pathname.split("/").filter(Boolean);
    if (segs.length >= 2 && (segs[1] === "dashboard" || segs[1] === "area-personal")) {
      const slug = segs[0];
      return `${API_URL}/${slug}/api/dashboard`;
    }
    return `${API_URL}/api/dashboard`;
  }, [location.pathname]);

  const vistas = ["anual", "mensual", "semanal", "diaria", "historial"];
  const [vista, setVista] = useState("anual"); // anual | mensual | semanal | diaria | historial
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const debeElegirFecha = useMemo(
    () => ["diaria", "semanal", "mensual", "historial"].includes(vista),
    [vista]
  );

  const labelsEjeX = useMemo(() => ({
    mensual: "Día del mes",
    semanal: "Día de la semana",
    anual: "Mes",
    diaria: "Hora del día",
    historial: "Fecha",
  }), []);

  const mesesCorto = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const diasCorto   = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  const formatoEjeX = (tick) => {
    if (vista === "diaria") return `${tick}h`;
    if (vista === "historial") {
      const d = new Date(tick);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return isNaN(d) ? tick : `${dd}/${mm}`;
    }
    return tick;
  };

  const ordenar = (arr) => {
    if (!Array.isArray(arr)) return [];
    if (vista === "mensual" || vista === "diaria") {
      return [...arr].sort((a, b) => parseInt(a.periodo) - parseInt(b.periodo));
    }
    if (vista === "semanal") {
      const idx = (d) => diasCorto.indexOf(String(d).trim());
      return [...arr].sort((a, b) => idx(a.periodo) - idx(b.periodo));
    }
    if (vista === "anual") {
      const idx = (m) => mesesCorto.indexOf(String(m).trim());
      return [...arr].sort((a, b) => idx(a.periodo) - idx(b.periodo));
    }
    if (vista === "historial") {
      return [...arr].sort((a, b) => new Date(a.periodo) - new Date(b.periodo));
    }
    return arr;
  };

  useEffect(() => {
    let cancel = false;
    const obtenerDatos = async () => {
      setCargando(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Sesión no disponible");

        const res = await fetch(`${apiBase}/volumen-paquetes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tipo_vista: vista, fecha }),
        });

        const json = await res.json().catch(() => []);
        if (!res.ok) throw new Error(json?.error || "No se pudo obtener el volumen.");

        if (!cancel) {
          setDatos(ordenar(json));
          setError(null);
        }
      } catch (err) {
        if (!cancel) {
          console.error("[VolumenPaquetes]", err);
          setDatos([]);
          setError(err.message || "Error inesperado");
        }
      } finally {
        if (!cancel) setCargando(false);
      }
    };

    obtenerDatos();
    return () => { cancel = true; };
  }, [apiBase, vista, fecha, refreshTick]);

  const kpis = useMemo(() => {
    const totalRec = datos.reduce((acc, d) => acc + (Number(d.recibidos) || 0), 0);
    const totalEnt = datos.reduce((acc, d) => acc + (Number(d.entregados) || 0), 0);
    const puntos = Math.max(datos.length, 1);
    return {
      totalRec,
      totalEnt,
      avgRec: Math.round(totalRec / puntos),
      avgEnt: Math.round(totalEnt / puntos),
    };
  }, [datos]);

  const activeIndex = vistas.indexOf(vista);

  return (
    <div className="volumen-paquetes">
      {/* Encabezado y controles */}
      <div className="vp-header">
        <div className="vp-title">
          <div className="vp-icon"><Truck size={20} /></div>
          <div>
            <h3>Volumen de paquetes</h3>
            <p className="vp-sub">
              Eje X: {labelsEjeX[vista]} · Eje Y: Cantidad de paquetes
            </p>
          </div>
        </div>

        <div className="vp-controls">
          <div
            className="vp-segmented"
            role="tablist"
            aria-label="Tipo de vista"
            style={{ ["--vp-active-index"]: activeIndex }}
          >
            {vistas.map((tipo) => (
              <button
                key={tipo}
                type="button"
                role="tab"
                aria-selected={vista === tipo}
                className={`vp-segment ${vista === tipo ? "vp-active" : ""}`}
                onClick={() => setVista(tipo)}
              >
                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </button>
            ))}
          </div>

          {debeElegirFecha && (
            <label className="vp-date">
              <span>Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                aria-label="Seleccionar fecha"
              />
            </label>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="vp-kpis">
        <div className="vp-kpi">
          <span className="vp-kpi-label">Recibidos</span>
          <strong className="vp-kpi-value">{kpis.totalRec.toLocaleString()}</strong>
          <span className="vp-kpi-sub">Media: {kpis.avgRec.toLocaleString()}</span>
        </div>
        <div className="vp-kpi">
          <span className="vp-kpi-label">Entregados</span>
          <strong className="vp-kpi-value">{kpis.totalEnt.toLocaleString()}</strong>
          <span className="vp-kpi-sub">Media: {kpis.avgEnt.toLocaleString()}</span>
        </div>
      </div>

      {/* Contenido */}
      <div className="vp-card">
        {error && (
          <div className="vp-error" role="alert" aria-live="polite">
            <span>Error: {error}</span>
            <button type="button" onClick={() => setRefreshTick((n) => n + 1)}>Reintentar</button>
          </div>
        )}

        {cargando ? (
          <div className="vp-skeleton">
            <div className="vp-skel-line w-70" />
            <div className="vp-skel-line w-90" />
            <div className="vp-skel-line w-60" />
            <div className="vp-skel-chart" />
          </div>
        ) : (!datos || datos.length === 0) ? (
          <div className="vp-empty">
            <p>Sin datos disponibles aún.</p>
          </div>
        ) : (
          <div className="vp-chart">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={datos} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="vpLineRec" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#635bff" />
                    <stop offset="100%" stopColor="#00d4ff" />
                  </linearGradient>
                  <linearGradient id="vpLineEnt" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#80eaff" />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf4" />
                <XAxis
                  dataKey="periodo"
                  tickFormatter={formatoEjeX}
                  tickMargin={8}
                  minTickGap={24}
                  label={{ value: labelsEjeX[vista], position: "insideBottom", offset: -2, fill: "#5b6b8a" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickMargin={6}
                  width={46}
                  label={{ value: "Cantidad", angle: -90, position: "insideLeft", fill: "#5b6b8a" }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#e6ebf4" }}
                  formatter={(value, name, props) => {
                    if (props.dataKey === "recibidos") return [`${value}`, "Recibidos"];
                    if (props.dataKey === "entregados") return [`${value}`, "Entregados"];
                    return [value, name];
                  }}
                  labelFormatter={(label) => {
                    if (vista === "historial") {
                      const d = new Date(label);
                      return isNaN(d) ? label : d.toLocaleDateString();
                    }
                    return label;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 6 }} formatter={(value) =>
                  value === "recibidos" ? "Recibidos" : value === "entregados" ? "Entregados" : value
                } />
                <Line
                  type="monotone"
                  dataKey="recibidos"
                  stroke="url(#vpLineRec)"
                  strokeWidth={2.2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="entregados"
                  stroke="url(#vpLineEnt)"
                  strokeWidth={2.2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                {vista === "historial" && (
                  <Brush
                    dataKey="periodo"
                    height={28}
                    stroke="#635bff"
                    travellerWidth={8}
                    tickFormatter={formatoEjeX}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
