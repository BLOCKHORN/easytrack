import { useEffect } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');

export function useKeepalive() {
  useEffect(() => {
    const id = setInterval(() => {
      fetch(`${API_BASE}/health`, { method: "GET", cache: "no-store" }).catch(() => {});
    }, 4 * 60 * 1000); 

    return () => clearInterval(id);
  }, []);
}