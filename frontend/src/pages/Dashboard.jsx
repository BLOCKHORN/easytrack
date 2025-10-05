// src/pages/Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBox,
  FaEdit,
  FaPlus,
  FaTrophy,
  FaWarehouse,
  FaChartLine,
  FaInbox,
  FaUserCircle,
  FaExclamationTriangle,
  FaClock,
  FaTimes
} from "react-icons/fa";
import AnadirPaquete from "./AnadirPaquete";
import VolumenPaquetes from "../components/VolumenPaquetes";
import "../styles/Dashboard.scss";
import { supabase } from "../utils/supabaseClient";
import ModalImagenBanner from "../components/ModalImagenBanner";
import { useBanner } from "../context/BannerContext";
import TrialBanner from '../components/billing/TrialBanner';
import PlanBadge from '../components/PlanBadge';

export default function Dashboard({ paquetes, actualizarPaquetes }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Base de API con slug
  const apiBase = useMemo(() => {
    const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001";
    const segs = location.pathname.split("/").filter(Boolean);
    if (segs.length >= 2 && (segs[1] === "dashboard" || segs[1] === "area-personal")) {
      const slug = segs[0];
      return `${API_URL}/${slug}/api/dashboard`;
    }
    return `${API_URL}/api/dashboard`;
  }, [location.pathname]);

  // Raíz para endpoints globales (no namespaced por slug)
  const apiRoot = useMemo(() => {
    return (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001");
  }, []);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalImagen, setMostrarModalImagen] = useState(false);
  const [negocio, setNegocio] = useState(null);
  const [slug, setSlug] = useState(null);
  const [cargandoNegocio, setCargandoNegocio] = useState(true);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [configPendiente, setConfigPendiente] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  const { bannerUrl, bannerBootstrapped } = useBanner();
  const hasBanner = Boolean(bannerUrl);

  const [resumen, setResumen] = useState({
    recibidosHoy: 0,
    entregadosHoy: 0,
    almacenActual: 0,
    horaPico: "–",
    estantesLlenos: 0,
    mediaDiaria: 0,
    mediaEntregados: 0,
    recordRecibidos: 0,
    recordEntregados: 0
  });

  const go = (path) => { if (slug) navigate(`/${slug}${path.startsWith("/") ? path : `/${path}`}`); };

  const estructuraAlmacen = useMemo(() => {
    const e =
      negocio?.estructura_almacen ||
      negocio?.tipo_almacen ||
      negocio?.tipoEstructura ||
      negocio?.estructura ||
      (typeof negocio?.baldas_total === "number" && negocio.baldas_total > 0 ? "estantes" : null);

    if (!e) return "sin definir";
    const s = String(e).toLowerCase();
    if (s.includes("estante")) return "estantes";
    if (s.includes("carril") || s.includes("suelo") || s.includes("cintas")) return "carriles";
    if (s.includes("mixto")) return "mixto";
    // Permitimos "ubicaciones" como valor válido
    return s;
  }, [negocio]);

  // Bloquear scroll del fondo cuando el modal está abierto
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    if (mostrarModal) el.style.overflow = "hidden";
    else el.style.overflow = prev || "";
    return () => { el.style.overflow = prev || ""; };
  }, [mostrarModal]);

  // Cerrar con ESC
  useEffect(() => {
    if (!mostrarModal) return;
    const onKey = (e) => { if (e.key === "Escape") setMostrarModal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mostrarModal]);

  // Cargar negocio (y, si falta estructura legacy, validar con ubicaciones nuevas)
  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargandoNegocio(true);
      setErrorCarga(null);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) throw new Error("No se pudo obtener la sesión actual.");
        const token = session.access_token;

        const res = await fetch(`${apiBase}/negocio`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Error al obtener el negocio");

        const data = await res.json();
        if (cancel) return;

        setNegocio(data);
        setSlug(data?.slug || null);

        // Chequeo legacy
        const estructuraInferida =
          data?.estructura_almacen || data?.tipo_almacen || data?.tipoEstructura || data?.estructura;
        const faltaEstructuraLegacy = !estructuraInferida && !(data?.baldas_total > 0);

        if (!faltaEstructuraLegacy) {
          setConfigPendiente(false);
          return;
        }

        // 🆕 Fallback al sistema NUEVO de ubicaciones:
        // Si hay ubicaciones activas, consideramos configurado y marcamos "ubicaciones" para el chip.
        try {
          const ures = await fetch(`${apiRoot}/api/ubicaciones?debug=1`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const ujson = await ures.json().catch(() => ({}));
          const ucount = Array.isArray(ujson?.ubicaciones)
            ? ujson.ubicaciones.length
            : (Array.isArray(ujson?.rows) ? ujson.rows.length : 0);

          console.log("[Dashboard] ubicaciones detectadas para el tenant:", ucount);

          if (!cancel) {
            if (ucount > 0) {
              setConfigPendiente(false);
              // reflejar en UI la estructura "ubicaciones" para evitar el chip "sin definir"
              setNegocio(prev => ({ ...prev, estructura_almacen: 'ubicaciones' }));
            } else {
              setConfigPendiente(true);
            }
          }
        } catch (e) {
          console.warn("[Dashboard] No se pudo comprobar ubicaciones, asumiendo config pendiente:", e);
          if (!cancel) setConfigPendiente(true);
        }
      } catch (e) {
        if (!cancel) {
          console.error("❌ Error cargando negocio:", e);
          setErrorCarga("No se pudieron cargar los datos del negocio.");
        }
      } finally {
        if (!cancel) setCargandoNegocio(false);
      }
    })();
    return () => { cancel = true; };
  }, [apiBase, apiRoot]);

  // Cargar resumen
  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargandoResumen(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Sesión no disponible");

        const res = await fetch(`${apiBase}/resumen`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Error al obtener resumen");

        const data = await res.json();
        if (cancel) return;
        setResumen(data || {});
      } catch (e) {
        if (!cancel) {
          console.error("❌ Error al obtener resumen:", e);
          setErrorCarga((prev) => prev || "No se pudo cargar el resumen.");
        }
      } finally {
        if (!cancel) setCargandoResumen(false);
      }
    })();
    return () => { cancel = true; };
  }, [apiBase]);

  // Loader
  if (cargandoNegocio || cargandoResumen || !bannerBootstrapped) {
    return (
      <div className="dashboard-estadisticas">
        <div className="cargando-dashboard" role="status" aria-live="polite">
          <div className="spinner" />
          <p className="texto-cargando">Cargando datos del negocio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-estadisticas">
      {configPendiente && (
        <div className="alerta-config" role="alert">
          <FaExclamationTriangle className="icono-alerta" aria-hidden="true" />
          <div>
            <h3>Configuración pendiente</h3>
            <p>Define tu estructura de almacén antes de comenzar a usar la herramienta.</p>
          </div>
          <button type="button" onClick={() => go("/dashboard/configuracion")}>
            Ir a configuración
          </button>
        </div>
      )}

      {/* Banner robusto */}
      <div className={`banner-negocio ${hasBanner ? "" : "is-empty"}`}>
        <div
          className="banner-bg"
          style={{ backgroundImage: `url(${bannerUrl || "/fondos/banner-default.jpg"})` }}
          aria-hidden="true"
        />
        <div className="banner-content">
          <button
            className="btn-editar-banner"
            type="button"
            aria-label="Editar imagen del banner"
            onClick={() => setMostrarModalImagen(true)}
          >
            <FaEdit />
          </button>

          <div className="banner-izquierda">
            <h2>
              <FaUserCircle aria-hidden="true" /> Bienvenido de nuevo <span>{negocio?.nombre_empresa}</span>
            </h2>
            <div className="chips">
              {/* eliminado el chip de Estructura */}
              <PlanBadge />
            </div>
          </div>

          <div className="banner-derecha">
            <button className="btn-rapido" type="button" onClick={() => setMostrarModal(true)}>
              <FaPlus aria-hidden="true" /> <span>Añadir paquete rápido</span>
            </button>
          </div>
        </div>
      </div>

      <TrialBanner />

      {/* Estadísticas */}
      <div className="bloque-estadisticas">
        <GrupoEstadisticas titulo="Estado del día" icono={<FaInbox />}>
          <TarjetaDato icono={<FaBox />} label="Recibidos hoy" valor={resumen.recibidosHoy} record={resumen.recordRecibidos} />
          <TarjetaDato icono={<FaBox />} label="Entregados hoy" valor={resumen.entregadosHoy} record={resumen.recordEntregados} />
          <TarjetaDato icono={<FaWarehouse />} label="En almacén" valor={resumen.almacenActual} />
        </GrupoEstadisticas>

        <GrupoEstadisticas titulo="Promedios" icono={<FaChartLine />}>
          <TarjetaDato icono={<FaTrophy />} label="Media recibidos" valor={resumen.mediaDiaria} />
          <TarjetaDato icono={<FaTrophy />} label="Media entregados" valor={resumen.mediaEntregados} />
          <TarjetaDato
            icono={<FaClock />}
            label={<span className="tooltip" data-tooltip="Hora con mayor flujo de paquetes (recibidos + entregados)">Hora pico (global)</span>}
            valor={resumen.horaPico || "–"}
          />
        </GrupoEstadisticas>

        <GrupoEstadisticas titulo="Capacidad y récords" icono={<FaTrophy />}>
          <TarjetaDato
            icono={<FaWarehouse />}
            label={<span className="tooltip" data-tooltip="Se considera lleno un estante con 12 o más paquetes (indicador configurable)">Estantes llenos</span>}
            valor={resumen.estantesLlenos}
          />
          <TarjetaDato icono={<FaTrophy />} label="Récord recibidos (día)" valor={resumen.recordRecibidos} />
          <TarjetaDato icono={<FaTrophy />} label="Récord entregados (día)" valor={resumen.recordEntregados} />
        </GrupoEstadisticas>
      </div>

      {/* Gráfico */}
      <VolumenPaquetes />

      {errorCarga && <div className="alerta-ligera" role="status">{errorCarga}</div>}

      {/* Modal añadir paquete */}
      {mostrarModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.cerrar = "true"; }}
          onMouseUp={(e) => {
            if (e.target === e.currentTarget && e.currentTarget.dataset.cerrar === "true") {
              setMostrarModal(false);
            }
          }}
        >
          <div className="modal-contenido modal-rapido" role="dialog" aria-modal="true" aria-label="Añadir paquete">
            <header className="modal-head">
              <h3>Añadir paquete</h3>
              <button
                type="button"
                className="modal-close"
                aria-label="Cerrar"
                onClick={() => setMostrarModal(false)}
              >
                <FaTimes />
              </button>
            </header>

            {/* 👉 cuerpo con scroll autosuficiente y layout compacto */}
            <div className="modal-body">
              <AnadirPaquete
                modoRapido
                paquetes={paquetes}
                actualizarPaquetes={actualizarPaquetes}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal edición banner */}
      {mostrarModalImagen && <ModalImagenBanner cerrar={() => setMostrarModalImagen(false)} />}
    </div>
  );
}

/* ===== Subcomponentes ===== */

function GrupoEstadisticas({ titulo, icono, children }) {
  return (
    <section className="grupo-estadisticas">
      <h3 className="titulo-grupo">
        {icono} {titulo}
      </h3>
      <div className="contenedor-tarjetas">{children}</div>
    </section>
  );
}

function TarjetaDato({ icono, label, valor, record }) {
  const superaRecord =
    record !== undefined && record !== null && Number.isFinite(Number(record)) && Number(valor) >= Number(record);

  return (
    <div className={`tarjeta-dato ${superaRecord ? "record" : ""}`}>
      <div className="icono" aria-hidden="true">{icono}</div>
      <div className="contenido">
        <strong>{valor}</strong>
        <span>{label}</span>
        {record !== undefined && record !== null && (
          <div className="subdato">
            <FaTrophy className="icono-record" aria-hidden="true" /> Récord: {record}
          </div>
        )}
      </div>
    </div>
  );
}
