import { useEffect, useRef } from 'react'
import { FaTimes } from 'react-icons/fa'
import HeroIllustration from '../assets/hero-illustration.svg'
import '../styles/DemoModal.scss'

/**
 * DemoModal (mismo diseño que el modal del Hero)
 * props:
 *  - open: boolean
 *  - onClose: () => void
 *  - videoSrc?: string
 *  - posterSrc?: string
 */
export default function DemoModal({ open, onClose, videoSrc = '', posterSrc }) {
  const dialogRef = useRef(null)
  const closeBtnRef = useRef(null)

  // Bloquear scroll + foco inicial
  useEffect(() => {
    if (!open) return
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0)
    return () => {
      document.documentElement.style.overflow = prev
      clearTimeout(t)
    }
  }, [open])

  // ESC + focus trap
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key !== 'Tab') return
      const root = dialogRef.current
      if (!root) return
      const focusables = root.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const poster = posterSrc || HeroIllustration

  const handleOverlay = (e) => {
    if (e.target.classList.contains('et-demo__overlay')) onClose?.()
  }

  return (
    <div
      className="et-demo__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="et-demo-title"
      onClick={handleOverlay}
    >
      <div className="et-demo__backdrop" aria-hidden="true" />
      <div className="et-demo__dialog" ref={dialogRef} onClick={(e) => e.stopPropagation()}>
        <div className="et-demo__header">
          <h2 id="et-demo-title">Demo de EasyTrack</h2>
          <button
            className="et-demo__close"
            onClick={onClose}
            aria-label="Cerrar demo"
            ref={closeBtnRef}
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="et-demo__player">
          {videoSrc ? (
            <video controls preload="none" playsInline poster={poster} controlsList="nodownload">
              <source src={videoSrc} type="video/mp4" />
              Tu navegador no soporta vídeo HTML5.
            </video>
          ) : (
            <div className="et-demo__placeholder">
              <img src={poster} alt="" />
              <p>La demo en vídeo estará disponible muy pronto.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
