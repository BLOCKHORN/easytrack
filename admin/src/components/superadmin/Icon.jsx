export default function Icon({ name, className = '', size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', className: `icon ${className}` };
  switch (name) {
    case 'menu':     return (<svg {...common}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>);
    case 'dot':      return (<svg {...common}><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/></svg>);
    case 'user':     return (<svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
    case 'gauge':    return (<svg {...common}><path d="M12 14v-4"/><path d="M10 14h4"/><path d="M13.41 10.59 16 8"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>);
    case 'db':       return (<svg {...common}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/></svg>);
    case 'list':     return (<svg {...common}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>);
    case 'shield':   return (<svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>);
    case 'switch':   return (<svg {...common}><path d="M3 12h6"/><path d="M21 12h-6"/><path d="M8 7l-5 5 5 5"/><path d="m16 17 5-5-5-5"/></svg>);
    case 'search':   return (<svg {...common}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
    case 'calendar': return (<svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
    case 'log':      return (<svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>);
    case 'edit':     return (<svg {...common}><path d="M11 4h2M12 2v6M4 13v7h7l9-9-7-7-9 9Z"/></svg>);
    case 'logout':   return (<svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>);
    case 'back':     return (<svg {...common}><polyline points="15 18 9 12 15 6"/></svg>);
    default:         return null;
  }
}
