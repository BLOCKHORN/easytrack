import { useEffect } from "react";

export function useKeepalive(){
  useEffect(() => {
    const id = setInterval(() => {
      fetch("/health", { method: "HEAD", cache: "no-store" }).catch(() => {});
    }, 4 * 60 * 1000); // cada 4 min
    return () => clearInterval(id);
  }, []);
}
