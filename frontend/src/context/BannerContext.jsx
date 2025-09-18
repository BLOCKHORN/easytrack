import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../utils/supabaseClient";

const BannerContext = createContext();
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Contexto de banner sin parpadeos:
 * - Memoriza la "base" del archivo (antes del ? de la signed URL).
 * - Solo renueva la URL si cambia el archivo o pasó el umbral de tiempo.
 */
const MIN_REFRESH_MS = 10 * 60 * 1000; // 10 min

export function BannerProvider({ children }) {
  const [banner, setBanner] = useState({ url: null, base: null, ts: 0 });
  const [bootstrapped, setBootstrapped] = useState(false);
  const refreshingRef = useRef(false);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  const pickBase = (signedUrl) => (signedUrl ? signedUrl.split("?")[0] : null);

  const hydratedSet = (signedUrl, { force = false } = {}) => {
    const nextBase = pickBase(signedUrl);
    setBanner((prev) => {
      if (!signedUrl) return { url: null, base: null, ts: Date.now() };
      const tooSoon = Date.now() - prev.ts < MIN_REFRESH_MS;
      const sameBase = prev.base && prev.base === nextBase;
      if (!force && sameBase && tooSoon) return prev; // evita repintados innecesarios
      return { url: signedUrl, base: nextBase, ts: Date.now() };
    });
  };

  const fetchSignedUrl = async () => {
    const token = await getToken();
    if (!token) return null;
    const res = await fetch(`${BASE_URL}/api/imagenes/obtener`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    return data?.url || null;
  };

  const refreshBanner = async ({ force = false } = {}) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const signed = await fetchSignedUrl();
      if (signed) hydratedSet(signed, { force });
    } catch (e) {
      console.warn("⚠ Banner refresh:", e?.message);
    } finally {
      refreshingRef.current = false;
    }
  };

  // Primera carga (puede bloquear)
  useEffect(() => {
    (async () => {
      await refreshBanner({ force: false });
      setBootstrapped(true);
    })();
  }, []);

  // Cambios de auth → refresh silencioso
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshBanner({ force: false });
    });
    return () => subscription.unsubscribe();
  }, []);

  // Volver a la pestaña → refresh silencioso
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refreshBanner({ force: false });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // API pública
  const bannerUrl = banner.url;
  const setBannerUrlPublic = (signedUrl, opts) =>
    hydratedSet(signedUrl, { force: true, ...(opts || {}) }); // fuerza para ver el cambio inmediato
  const bannerBootstrapped = bootstrapped;

  return (
    <BannerContext.Provider
      value={{ bannerUrl, setBannerUrl: setBannerUrlPublic, bannerBootstrapped, refreshBanner }}
    >
      {children}
    </BannerContext.Provider>
  );
}

export const useBanner = () => useContext(BannerContext);
