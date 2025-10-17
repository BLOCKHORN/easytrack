// src/components/RequireActive.jsx
import '../styles/require-active.scss';

/**
 * Passthrough mientras la suscripción está en pausa.
 * No hace comprobaciones ni redirecciones: simplemente renderiza children.
 */
export default function RequireActive({ children }) {
  return children;
}
