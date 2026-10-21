import { Link, useLocation } from 'react-router-dom';
import { FiPrinter, FiFileText, FiShield, FiCheckCircle, FiCompass } from 'react-icons/fi';

const LEGAL_DOCS = [
  { to: '/legal/terminos', label: 'Términos del Servicio', short: 'Términos' },
  { to: '/legal/privacidad', label: 'Política de Privacidad', short: 'Privacidad' },
  { to: '/legal/cookies', label: 'Política de Cookies', short: 'Cookies' },
  { to: '/legal/aviso-legal', label: 'Aviso Legal', short: 'Aviso Legal' },
];

export default function LegalLayout({ title, subtitle, updated, toc = [], children }) {
  const location = useLocation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white min-h-screen pt-28 pb-20 antialiased font-sans text-zinc-900">
      {/* Top Banner / Breadcrumb Nav */}
      <div className="border-b border-zinc-200 bg-zinc-50/60 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium whitespace-nowrap">
              <Link to="/" className="hover:text-zinc-900 transition-colors">Inicio</Link>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-500">Legal</span>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-900 font-semibold">{title}</span>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-md hover:text-zinc-950 hover:border-zinc-300 transition-colors shadow-sm active:scale-[0.97]"
                title="Imprimir o guardar como PDF"
              >
                <FiPrinter className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* Subnavigation Bar */}
          <nav className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-none pt-2 pb-1 border-t border-zinc-200/60" aria-label="Documentos legales">
            {LEGAL_DOCS.map((doc) => {
              const isActive = location.pathname === doc.to;
              return (
                <Link
                  key={doc.to}
                  to={doc.to}
                  className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? 'border-[#7C3AED] text-[#7C3AED] font-semibold'
                      : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
                  }`}
                >
                  {doc.short}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        {/* Header */}
        <header className="mb-12 pb-8 border-b border-zinc-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7C3AED] tracking-normal mb-2">
            <span>Cumplimiento Legal y Normativo</span>
            <span>·</span>
            <span>Unión Europea</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-950 tracking-tight text-balance mb-3">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base sm:text-lg text-zinc-600 max-w-3xl font-normal leading-relaxed text-pretty mb-4">
              {subtitle}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-zinc-500">
            <span>Última revisión: <strong className="text-zinc-700 font-semibold">{updated}</strong></span>
            <span>·</span>
            <span>Titular: <strong className="text-zinc-700 font-semibold">Blockhorn Studios OÜ</strong></span>
            <span>·</span>
            <span>Contacto: <a href="mailto:legal@easytrack.pro" className="text-[#7C3AED] hover:underline font-medium">legal@easytrack.pro</a></span>
          </div>
        </header>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Sidebar Navigation */}
          {toc.length > 0 && (
            <aside className="lg:w-64 shrink-0 print:hidden">
              <div className="lg:sticky lg:top-24 space-y-6">
                <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                  <div className="text-xs font-semibold text-zinc-900 mb-3 flex items-center gap-1.5">
                    <FiCompass className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Índice del documento</span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {toc.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="block py-1 text-zinc-600 hover:text-[#7C3AED] transition-colors leading-snug"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="hidden lg:block text-xs text-zinc-500 bg-white p-4 rounded-lg border border-zinc-200 leading-relaxed">
                  <div className="font-semibold text-zinc-900 mb-1 flex items-center gap-1">
                    <FiShield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Garantía de Privacidad</span>
                  </div>
                  Arquitectura europea alojada en Falkenstein (Alemania). Servidores dedicados propios con certificación ISO 27001 y cifrado integral.
                </div>
              </div>
            </aside>
          )}

          {/* Legal Article Body */}
          <article className="flex-1 max-w-none text-zinc-700 leading-relaxed space-y-10 legal-content">
            {children}
          </article>
        </div>
      </div>
    </div>
  );
}
