import { useEffect, useRef, useState } from "react";
import { MdCloudUpload, MdDelete, MdClose } from "react-icons/md";
import { supabase } from "../utils/supabaseClient";
import { useBanner } from "../context/BannerContext";
import "../styles/ModalImagenBanner.scss";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ALLOW = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_MB = 8;

export default function ModalImagenBanner({ cerrar }) {
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const inputRef = useRef(null);
  const primaryBtnRef = useRef(null);
  const { bannerUrl, setBannerUrl } = useBanner();

  // a11y + UX
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", onKey);
    primaryBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [cerrar]);

  // Bloquear scroll de fondo
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, []);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  const validateFile = (file) => {
    if (!ALLOW.includes(file.type)) { setErrMsg("Formato no soportado. Usa JPG, PNG, WEBP o AVIF."); return false; }
    if (file.size > MAX_MB * 1024 * 1024) { setErrMsg(`La imagen supera ${MAX_MB}MB.`); return false; }
    setErrMsg("");
    return true;
  };

  // fetch con timeout + parseo seguro
  const fetchJson = async (url, opts = {}, timeoutMs = 25000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      if (!res.ok) {
        const msg = data?.error || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }
      return data;
    } finally {
      clearTimeout(id);
    }
  };

  const refreshSignedUrl = async () => {
    const token = await getToken();
    if (!token) return null;
    const data = await fetchJson(`${BASE_URL}/api/imagenes/obtener`, {
      headers: { Authorization: `Bearer ${token}` }
    }, 15000);
    return data?.url || null;
  };

  const uploadFile = async (file) => {
    if (!file || !validateFile(file)) return;

    setSubiendo(true);
    setErrMsg("");
    const token = await getToken();
    if (!token) { setErrMsg("Sesión no disponible."); setSubiendo(false); return; }

    const formData = new FormData();
    formData.append("imagen", file);

    try {
      const data = await fetchJson(`${BASE_URL}/api/imagenes/subir`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const returnedUrl = data?.url || data?.signedUrl || null;
      if (returnedUrl) {
        setBannerUrl(returnedUrl, { force: true }); // fuerza update (sin parpadeo)
        cerrar();
        return;
      }

      if (data?.fileName) {
        const signed = await refreshSignedUrl();
        if (signed) {
          setBannerUrl(signed, { force: true });
          cerrar();
          return;
        }
      }

      setErrMsg("Imagen subida, pero no se obtuvo la URL. Prueba a recargar.");
    } catch (err) {
      console.error("❌ Subir imagen:", err);
      setErrMsg(err?.message || "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleEliminar = async () => {
    if (!confirm("¿Seguro que quieres eliminar el banner?")) return;
    setEliminando(true);
    setErrMsg("");

    const token = await getToken();
    if (!token) { setErrMsg("Sesión no disponible."); setEliminando(false); return; }

    try {
      await fetchJson(`${BASE_URL}/api/imagenes/eliminar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }, 15000);

      setBannerUrl(null, { force: true });
      cerrar();
    } catch (err) {
      console.error("❌ Eliminar imagen:", err);
      setErrMsg(err?.message || "No se pudo eliminar el banner.");
    } finally {
      setEliminando(false);
    }
  };

  // Dropzone
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  };
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); };

  return (
    <div
      className="mib-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.cerrar = "true"; }}
      onMouseUp={(e) => {
        if (e.target === e.currentTarget && e.currentTarget.dataset.cerrar === "true") cerrar();
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="mib-title"
      aria-describedby="mib-desc"
    >
      <div className="mib-modal" role="document">
        <header className="mib-header">
          <h3 id="mib-title">Editar banner del negocio</h3>
          <button className="mib-close" aria-label="Cerrar" onClick={cerrar}>
            <MdClose />
          </button>
        </header>

        <p id="mib-desc" className="mib-sub">
          Recomendado <strong>1440×360 px</strong>. Formatos: JPG, PNG, WEBP o AVIF. Tamaño máx. {MAX_MB}MB.
        </p>

        {errMsg && <div className="mib-error" role="alert">{errMsg}</div>}

        <div className="mib-grid">
          {/* Preview */}
          <div className="mib-preview">
            <div
              className="mib-preview__img"
              style={{ backgroundImage: `url(${bannerUrl || "/placeholder.jpg"})` }}
              role="img"
              aria-label="Vista previa del banner"
            />
            <span className="mib-badge">{bannerUrl ? "Actual" : "Sin banner"}</span>
          </div>

          {/* Dropzone */}
          <div
            className={`mib-dropzone ${dragOver ? "is-drag" : ""} ${subiendo ? "is-uploading" : ""}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !subiendo && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            aria-label="Seleccionar o arrastrar una imagen"
          >
            <input
              ref={inputRef}
              type="file"
              accept={ALLOW.join(",")}
              hidden
              onChange={(e) => uploadFile(e.target.files?.[0])}
            />
            <div className="mib-dropzone__icon"><MdCloudUpload /></div>
            <div className="mib-dropzone__text">
              <strong>Arrastra una imagen aquí</strong>
              <span>o haz clic para seleccionar</span>
            </div>

            {subiendo && (
              <div className="mib-progress" aria-live="polite">
                <div className="mib-progress__bar" />
                <span className="mib-progress__label">Subiendo imagen…</span>
              </div>
            )}
          </div>
        </div>

        <footer className="mib-actions">
          <button
            ref={primaryBtnRef}
            className="mib-btn mib-btn--primary"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo || eliminando}
          >
            <MdCloudUpload /> {subiendo ? "Subiendo…" : "Subir nueva imagen"}
          </button>

        <button
            className="mib-btn mib-btn--danger"
            onClick={handleEliminar}
            disabled={!bannerUrl || eliminando || subiendo}
            title={!bannerUrl ? "No hay banner para eliminar" : "Eliminar banner actual"}
          >
            <MdDelete /> {eliminando ? "Eliminando…" : "Eliminar actual"}
          </button>
        </footer>
      </div>
    </div>
  );
}
