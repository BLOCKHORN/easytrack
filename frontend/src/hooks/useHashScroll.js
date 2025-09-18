import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Desplaza suavemente hasta el elemento indicado por el hash (#id),
 * aplicando un offset para cabeceras fijas.
 */
export default function useHashScroll(offset = 80) {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const el = document.getElementById(id)
    if (!el) return

    // esperar al layout (por si se montan secciones perezosamente)
    const rAF = requestAnimationFrame(() => {
      const y = el.getBoundingClientRect().top + window.pageYOffset - offset
      window.scrollTo({ top: y, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(rAF)
  }, [location.hash, offset])
}
