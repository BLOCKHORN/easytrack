import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6 antialiased">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-5 text-zinc-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            
            <h1 className="text-lg font-bold text-zinc-100 mb-2 text-balance">
              Ha ocurrido un error inesperado
            </h1>
            
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed text-pretty">
              La interfaz no pudo procesar esta sección. Los datos de tu sesión y paquetes permanecen seguros en el servidor.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center min-h-[44px] px-5 text-xs font-semibold rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white active:scale-[0.97] transition-all duration-100 ease-out"
              >
                Reintentar
              </button>
              <button
                onClick={this.handleHome}
                className="inline-flex items-center justify-center min-h-[44px] px-5 text-xs font-medium rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/80 active:scale-[0.97] transition-all duration-100 ease-out"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
