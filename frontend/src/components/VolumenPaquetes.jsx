import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush
} from "recharts";
import { Truck } from "lucide-react";
import { useLocation } from "react-router-dom";
import "../styles/VolumenPaquetes.scss";
import { supabase } from "../utils/supabaseClient";
import { obtenerPaquetesBackend } from "../services/paquetesService";

/**
 * Agregador en cliente:
 * - recibidos: cuenta por fecha_llegada
 * - entregados: cuenta por fecha_entregado (si entregado === true)
 *
 * Rangos:
 * - anual:     meses del año de la fecha seleccionada
 * - mensual:   días del mes de la fecha seleccionada
 * - semanal:   semana (Lun-Dom) de la fecha seleccionada
 * - diaria:    horas 0..23 de la fecha seleccionada
 * - historial: últimos 30 días hasta la fecha seleccionada (incluida)
 */

export default function VolumenPaquetes() {
  const location = useLocation();

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

  // ---- Helpers de fechas (zona local del navegador; OK para UI)
  const toLocalDate = (iso) => (iso ? new Date(iso) : null);
  const ymd = (d) => {
    if (!d || isNaN(d)) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const startOfWeekMon = (d) => {
    const nd = new Date(d);
    const day = (nd.getDay() + 6) % 7; // 0..6 (Lun=0)
    nd.setDate(nd.getDate() - day);
    nd.setHours(0,0,0,0);
    return nd;
  };
  const endOfWeekSun = (d) => {
    const s = startOfWeekMon(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23,59,59,999);
    return e;
  };
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0,0);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23,59,59,999);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0);
  const endOfDay   = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999);
  const addDays = (d, n) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };
  const inRange = (date, a, b) => date && !isNaN(date) && date >= a && date <= b;

  // ---- Generadores de categorías y llaves por vista
  const generarAnual = (baseDate) => {
    const y = baseDate.getFullYear();
    return mesesCorto.map((mes, i) => ({
      key: `${y}-${String(i+1).padStart(2,"0")}`, // yyyy-mm
      periodo: mes,
      y, m: i, // para comparar rápido
    }));
  };

  const generarMensual = (baseDate) => {
    const ini = startOfMonth(baseDate);
    const fin = endOfMonth(baseDate);
    const days = fin.getDate();
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth(); // 0..11
    return Array.from({ length: days }, (_, idx) => {
      const d = idx + 1;
      return {
        key: `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,
        periodo: String(d),
        y, m, d
      };
    });
  };

  const generarSemanal = (baseDate) => {
    const ini = startOfWeekMon(baseDate);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = addDays(ini, idx);
      return {
        key: ymd(d),
        periodo: diasCorto[idx], // Lun..Dom
        y: d.getFullYear(), m: d.getMonth(), d: d.getDate(),
        date: d
      };
    });
  };

  const generarDiaria = (baseDate) => {
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();
    const d = baseDate.getDate();
    return Array.from({ length: 24 }, (_, h) => ({
      key: `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}T${String(h).padStart(2,"0")}:00`,
      periodo: String(h),
      y, m, d, h
    }));
  };

  const generarHistorial = (baseDate) => {
    // Últimos 30 días hasta la fecha seleccionada (incluida)
    const fin = endOfDay(baseDate);
    const ini = addDays(startOfDay(baseDate), -29);
    const arr = [];
    for (let d = new Date(ini); d <= fin; d = addDays(d, 1)) {
      arr.push({
        key: ymd(d),
        periodo: d.toISOString().split("T")[0],
        y: d.getFullYear(), m: d.getMonth(), d: d.getDate(),
        date: new Date(d)
      });
    }
    return arr;
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

  // ---- Agregado en cliente
  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Sesión no disponible");

        // 1) Traemos TODOS los paquetes del tenant (el servicio ya pide all=1 por defecto)
        const paquetes = await obtenerPaquetesBackend(token, { all: 1 });
        if (cancel) return;

        // 2) Preparamos el rango/categorías según vista
        const baseDate = new Date(fecha + "T00:00:00"); // usar medianoche local del día elegido
        let categorias = [];
        let rangeIni = null;
        let rangeFin = null;

        if (vista === "anual") {
          categorias = generarAnual(baseDate);
          rangeIni = new Date(baseDate.getFullYear(), 0, 1, 0,0,0,0);
          rangeFin = new Date(baseDate.getFullYear(), 11, 31, 23,59,59,999);
        } else if (vista === "mensual") {
          categorias = generarMensual(baseDate);
          rangeIni = startOfMonth(baseDate);
          rangeFin = endOfMonth(baseDate);
        } else if (vista === "semanal") {
          categorias = generarSemanal(baseDate);
          rangeIni = startOfWeekMon(baseDate);
          rangeFin = endOfWeekSun(baseDate);
        } else if (vista === "diaria") {
          categorias = generarDiaria(baseDate);
          rangeIni = startOfDay(baseDate);
          rangeFin = endOfDay(baseDate);
        } else if (vista === "historial") {
          categorias = generarHistorial(baseDate);
          rangeIni = categorias[0]?.date ? startOfDay(categorias[0].date) : startOfDay(baseDate);
          rangeFin = endOfDay(baseDate);
        }

        // 3) Inicializamos diccionario acumulador
        const acc = new Map(categorias.map(c => [c.key, { periodo: c.periodo, recibidos: 0, entregados: 0 }]));

        // 4) Recorremos paquetes y sumamos en el bucket correspondiente
        for (const p of paquetes) {
          const fRec = toLocalDate(p.fecha_llegada);
          const fEnt = p.entregado ? toLocalDate(p.fecha_entregado || p.fecha_llegada) : null;

          // solo consideramos dentro del rango de la vista
          if (fRec && inRange(fRec, rangeIni, rangeFin)) {
            if (vista === "anual") {
              const key = `${fRec.getFullYear()}-${String(fRec.getMonth()+1).padStart(2,"0")}`;
              if (acc.has(key)) acc.get(key).recibidos += 1;
            } else if (vista === "mensual") {
              const key = `${fRec.getFullYear()}-${String(fRec.getMonth()+1).padStart(2,"0")}-${String(fRec.getDate()).padStart(2,"0")}`;
              if (acc.has(key)) acc.get(key).recibidos += 1;
            } else if (vista === "semanal") {
              const key = ymd(fRec);
              if (acc.has(key)) acc.get(key).recibidos += 1;
            } else if (vista === "diaria") {
              const key = `${fRec.getFullYear()}-${String(fRec.getMonth()+1).padStart(2,"0")}-${String(fRec.getDate()).padStart(2,"0")}T${String(fRec.getHours()).padStart(2,"0")}:00`;
              if (acc.has(key)) acc.get(key).recibidos += 1;
            } else if (vista === "historial") {
              const key = ymd(fRec);
              if (acc.has(key)) acc.get(key).recibidos += 1;
            }
          }

          if (fEnt && inRange(fEnt, rangeIni, rangeFin)) {
            if (vista === "anual") {
              const key = `${fEnt.getFullYear()}-${String(fEnt.getMonth()+1).padStart(2,"0")}`;
              if (acc.has(key)) acc.get(key).entregados += 1;
            } else if (vista === "mensual") {
              const key = `${fEnt.getFullYear()}-${String(fEnt.getMonth()+1).padStart(2,"0")}-${String(fEnt.getDate()).padStart(2,"0")}`;
              if (acc.has(key)) acc.get(key).entregados += 1;
            } else if (vista === "semanal") {
              const key = ymd(fEnt);
              if (acc.has(key)) acc.get(key).entregados += 1;
            } else if (vista === "diaria") {
              const key = `${fEnt.getFullYear()}-${String(fEnt.getMonth()+1).padStart(2,"0")}-${String(fEnt.getDate()).padStart(2,"0")}T${String(fEnt.getHours()).padStart(2,"0")}:00`;
              if (acc.has(key)) acc.get(key).entregados += 1;
            } else if (vista === "historial") {
              const key = ymd(fEnt);
              if (acc.has(key)) acc.get(key).entregados += 1;
            }
          }
        }

        const salida = categorias.map(c => acc.get(c.key) || { periodo: c.periodo, recibidos: 0, entregados: 0 });
        if (!cancel) {
          setDatos(ordenar(salida));
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
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, fecha, refreshTick]);

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
