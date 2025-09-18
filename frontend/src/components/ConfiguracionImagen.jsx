import { useRef, useState } from "react";
import { MdPhotoCamera, MdDelete } from "react-icons/md";
import { supabase } from "../utils/supabaseClient";
import { useBanner } from "../context/BannerContext";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ALLOW = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_MB = 8;

export default function ConfiguracionImagen() {
  const { bannerUrl, setBannerUrl } = useBanner();
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  const fetchJson = async (url, opts = {}, timeoutMs = 25000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(data?.error || `Error HTTP ${res.status}`);
      return data;
    } finally {
      clearTimeout(id);
    }
  };

  const validate = (file) => {
    if (!file) return false;
    if (!ALLOW.includes(file.type)) { setErr("Formato no soportado. Usa JPG, PNG, WEBP o AVIF."); return false; }
    if (file.size > MAX_MB * 1024 * 1024) { setErr(`La imagen supera ${MAX_MB}MB.`); return false; }
    setErr(""); return true;
  };

  const refreshSignedUrl = async () => {
    const token = await getToken();
    if (!token) return null;
    const data = await fetchJson(`${BASE_URL}/api/imagenes/obtener`, {
      headers: { Authorization: `Bearer ${token}` }
    }, 15000);
    return data?.url || null;
  };

  const onSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!validate(file)) { e.target.value = ""; return; }

    setSubiendo(true);
    const token = await getToken();
    if (!token) { setErr("Sesión no disponible."); setSubiendo(false); return; }

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
        setBannerUrl(returnedUrl);
      } else if (data?.fileName) {
        const signed = await refreshSignedUrl();
        if (signed) setBannerUrl(signed);
      } else {
        setErr("Imagen subida, pero no se obtuvo la URL. Recarga para ver cambios.");
      }
    } catch (ex) {
      console.error("❌ subir banner:", ex);
      setErr(ex?.message || "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  };

  const onDelete = async () => {
    if (!confirm("¿Seguro que quieres eliminar el banner?")) return;
    setEliminando(true);
    setErr("");

    const token = await getToken();
    if (!token) { setErr("Sesión no disponible."); setEliminando(false); return; }

    try {
      await fetchJson(`${BASE_URL}/api/imagenes/eliminar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }, 15000);
      setBannerUrl(null);
    } catch (ex) {
      console.error("❌ eliminar banner:", ex);
      setErr(ex?.message || "No se pudo eliminar el banner.");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="identity-card__uploader" aria-live="polite">
      <div className="identity-card__uploader-frame">
        <div
          className={`identity-card__uploader-banner ${bannerUrl ? "" : "is-empty"}`}
          style={{ backgroundImage: `url(${bannerUrl || "/placeholder.jpg"})` }}
          role="img"
          aria-label={bannerUrl ? "Banner actual" : "Sin banner"}
        >
          <div className="identity-card__uploader-overlay">
            <div className="identity-card__uploader-left">
              <span className="identity-card__uploader-pill">{bannerUrl ? "Actual" : "Sin banner"}</span>
            </div>
            <div className="identity-card__uploader-actions">
              {bannerUrl && (
                <button
                  type="button"
                  className="identity-card__btn identity-card__btn--danger"
                  onClick={onDelete}
                  disabled={eliminando || subiendo}
                  title="Eliminar banner actual"
                >
                  <MdDelete /> {eliminando ? "Eliminando…" : "Eliminar"}
                </button>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ALLOW.join(",")}
                hidden
                onChange={onSelect}
              />
              <button
                type="button"
                className="identity-card__btn identity-card__btn--primary"
                onClick={() => !subiendo && inputRef.current?.click()}
                disabled={subiendo}
              >
                <MdPhotoCamera /> {subiendo ? "Subiendo…" : "Cambiar banner"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {subiendo && (
        <div className="identity-card__progress">
          <div className="identity-card__progress-bar" />
          <span className="identity-card__progress-label">Subiendo imagen…</span>
        </div>
      )}
      {err && <div className="identity-card__error" role="alert">{err}</div>}
    </div>
  );
}
