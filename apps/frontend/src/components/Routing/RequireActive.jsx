// src/components/RequireActive.jsx

/**
 * Passthrough mientras la suscripción está en pausa.
 * No hace comprobaciones ni redirecciones: simplemente renderiza children.
 */
export default function RequireActive({ children }) {
  return children;
}
