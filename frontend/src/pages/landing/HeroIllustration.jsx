// src/pages/landing/HeroIllustration.jsx
export default function HeroIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 720 520"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustración de un panel de gestión"
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="60%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#eef2f7" />
        </linearGradient>
        <linearGradient id="gbar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* fondo tarjeta */}
      <rect x="20" y="20" rx="18" ry="18" width="680" height="480" fill="url(#g2)" stroke="#e6eef6" />

      {/* topbar */}
      <rect x="20" y="20" rx="18" ry="18" width="680" height="58" fill="#ffffff" />
      <circle cx="52" cy="49" r="6" fill="#94a3b8" />
      <rect x="70" y="38" width="160" height="22" rx="8" fill="#e7eef7" />
      <rect x="238" y="38" width="90" height="22" rx="8" fill="#eef4fb" />
      <rect x="334" y="38" width="60" height="22" rx="8" fill="#eef4fb" />
      <rect x="402" y="38" width="78" height="22" rx="8" fill="#eef4fb" />

      {/* sidebar */}
      <rect x="20" y="78" width="160" height="422" fill="#f7f9fc" stroke="#e6eef6" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <rect key={i} x="36" y={104 + i * 58} width="128" height="28" rx="8" fill="#eef4fb" />
      ))}
      <rect x="36" y="460" width="128" height="24" rx="8" fill="url(#g1)" opacity="0.86" />

      {/* tarjetas resumen */}
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(${200 + i * 160} 96)`}>
          <rect width="144" height="86" rx="12" fill="#ffffff" stroke="#e6eef6" />
          <rect x="14" y="16" width="60" height="10" rx="5" fill="#a8b3c2" opacity="0.55" />
          <rect x="14" y="34" width="96" height="14" rx="7" fill="url(#g1)" opacity="0.8" />
          <rect x="14" y="56" width="84" height="10" rx="5" fill="#d9e2ef" />
        </g>
      ))}

      {/* gráfico de barras */}
      <g transform="translate(200 210)">
        <rect width="480" height="160" rx="14" fill="#ffffff" stroke="#e6eef6" />
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x={24 + i * 64} y={40 + (i % 3) * 10} width="28" height={80 - (i % 3) * 14} rx="6" fill="url(#gbar)" opacity={0.9 - i * 0.06} />
        ))}
        {/* línea */}
        <path
          d="M24 122 C 80 70, 140 90, 200 64 S 320 40, 400 72 S 456 60, 504 84"
          fill="none"
          stroke="url(#g1)"
          strokeWidth="3"
          opacity="0.9"
        />
      </g>

      {/* lista derecha / activity */}
      <g transform="translate(200 386)">
        <rect width="480" height="114" rx="14" fill="#ffffff" stroke="#e6eef6" />
        {[0, 1, 2, 3].map(i => (
          <g key={i} transform={`translate(16 ${16 + i * 22})`}>
            <circle cx="10" cy="10" r="6" fill="#94a3b8" />
            <rect x="26" y="4" width="180" height="12" rx="6" fill="#dfe7f2" />
            <rect x="220" y="4" width="80" height="12" rx="6" fill="#eaf0f8" />
            <rect x="312" y="4" width="60" height="12" rx="6" fill="#eaf0f8" />
          </g>
        ))}
      </g>
    </svg>
  )
}
