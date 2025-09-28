// src/components/LoginModal.jsx
import '../styles/LoginModal.scss'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaEye, FaEyeSlash, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa'
import { useModal } from '../context/ModalContext'
import { supabase } from '../utils/supabaseClient'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'')
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function LoginModal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)

  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetInfo, setResetInfo] = useState(null)
  const [resetError, setResetError] = useState(null)

  const navigate = useNavigate()
  const { closeModal } = useModal()

  const overlayRef = useRef(null)
  const emailRef = useRef(null)
  const pwdRef = useRef(null)
  const resetRef = useRef(null)

  // Si ya hay sesión, cerramos modal y navegamos
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session?.access_token) {
        closeModal()
        navigate('/dashboard', { replace: true })
      }
    })()
    return () => { mounted = false }
  }, [closeModal, navigate])

  useEffect(() => {
    emailRef.current?.focus()
    const onEsc = (e) => { if (e.key === 'Escape' && !loading && !resetLoading) closeModal() }
    window.addEventListener('keydown', onEsc)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.documentElement.style.overflow = prev
    }
  }, [closeModal, loading, resetLoading])

  const goToDashboard = () => {
    closeModal()
    navigate('/dashboard', { replace: true })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null); setInfo(null); setEmailNotConfirmed(false)

    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()
    if (!cleanEmail || !cleanPassword) {
      setError('Completa email y contraseña.')
      return
    }

    setLoading(true)
    try {
      // 1) login en tu backend
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      })

      let data = null
      try { data = await res.json() } catch {}

      if (!res.ok) {
        const msg = data?.error || `Error de login (HTTP ${res.status}).`
        setError(msg)
        if (data?.code === 'EMAIL_NOT_CONFIRMED') setEmailNotConfirmed(true)
        return
      }

      // 2) establecer sesión local de Supabase
      const access_token = data?.session?.access_token
      const refresh_token = data?.session?.refresh_token
      if (access_token && refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token })
        if (setErr) { setError('No se pudo establecer la sesión local.'); return }
      }

      // 3) compat localStorage (si lo usas en la app)
      localStorage.setItem('ep_access_token', access_token || '')
      localStorage.setItem('ep_refresh_token', refresh_token || '')
      localStorage.setItem('ep_user_email', (data?.user?.email || cleanEmail) )

      // 4) verificación “best-effort”
      try {
        await fetch(`${API}/api/verificar-usuario`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token }),
        })
      } catch {}

      // 5) feedback y navegación
      setInfo('Inicio de sesión correcto. Redirigiendo…')
      setTimeout(goToDashboard, 300)
    } catch (e2) {
      // Si hay error de red/CORS, pero ya tenemos sesión, seguimos
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        goToDashboard()
        return
      }
      setError(e2?.message ? `No se pudo conectar: ${e2.message}` : 'No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const openReset = () => {
    setResetError(null); setResetInfo(null)
    setShowReset(true)
    setResetEmail(email || resetEmail)
    setTimeout(() => resetRef.current?.focus(), 0)
  }

  const handleSendReset = async () => {
    setResetError(null); setResetInfo(null)
    const clean = resetEmail.trim().toLowerCase()
    if (!emailRegex.test(clean)) { setResetError('Escribe un email válido.'); return }

    setResetLoading(true)
    try {
      const r = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`)
      setResetInfo('Te enviamos un correo con el enlace para restablecer tu contraseña.')
    } catch (e) {
      setResetError(e?.message || 'No se pudo iniciar el reseteo. Inténtalo en unos minutos.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleResend = async () => {
    setError(null); setInfo(null)
    try {
      const res = await fetch(`${API}/api/auth/resend-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) setError(data?.error || 'No se pudo reenviar el correo.')
      else setInfo(data?.message || 'Correo reenviado. Revisa tu bandeja.')
    } catch {
      setError('No se pudo reenviar el correo.')
    }
  }

  const handleOverlayClick = (e) => {
    if (loading || resetLoading) return
    if (e.target === overlayRef.current) closeModal()
  }

  return (
    <div
      className="ep-login__overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="login-title"
    >
      <div className={`ep-login__box ${error ? 'is-shake' : ''}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="ep-login__title" id="login-title">
          Inicia sesión en <span>EasyTrack</span>
        </h2>

        <form onSubmit={handleLogin} className="ep-login__form" aria-busy={loading} noValidate autoComplete="on">
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="username"
              ref={emailRef}
              type="email"
              placeholder="tucorreo@empresa.com"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={!!error && !info}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="pwd-wrap">
              <input
                id="password"
                name="current-password"
                ref={pwdRef}
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-invalid={!!error && !info}
              />
              <button
                type="button"
                className="pwd-toggle"
                onClick={() => setShowPwd(s => !s)}
                aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPwd ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="minor-actions">
            {!showReset ? (
              <button type="button" className="link-btn" onClick={openReset} disabled={loading}>
                ¿Olvidaste tu contraseña?
              </button>
            ) : (
              <button type="button" className="link-btn" onClick={() => setShowReset(false)} disabled={resetLoading}>
                Cerrar recuperación
              </button>
            )}
          </div>

          <div className={`ep-login__reset ${showReset ? 'is-open' : ''}`} aria-hidden={!showReset}>
            <label htmlFor="reset-email">Tu correo</label>
            <div className="reset-row">
              <input
                id="reset-email"
                name="email"
                ref={resetRef}
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendReset() } }}
                placeholder="tucorreo@empresa.com"
                autoComplete="email"
                disabled={resetLoading}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSendReset}
                disabled={resetLoading}
                aria-busy={resetLoading}
              >
                {resetLoading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </div>

            {resetInfo && (
              <p className="note ok">
                <FaInfoCircle aria-hidden="true" /> {resetInfo}
              </p>
            )}
            {resetError && (
              <p className="note err">
                <FaExclamationTriangle aria-hidden="true" /> {resetError}
              </p>
            )}
          </div>

          {(error || info) && (
            <div className={`notice ${error ? 'is-error' : 'is-info'}`} role="status" aria-live="polite">
              {error ? <FaExclamationTriangle /> : <FaInfoCircle />}
              <span>{error || info}</span>
            </div>
          )}

          {emailNotConfirmed && (
            <div className="resend-box">
              <p>Tu email no está confirmado.</p>
              <button type="button" className="link-btn" onClick={handleResend} disabled={loading}>
                Reenviar correo
              </button>
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : null}
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
