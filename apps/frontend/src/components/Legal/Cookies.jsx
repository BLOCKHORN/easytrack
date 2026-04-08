import { useMemo } from 'react';
import { FiPrinter } from 'react-icons/fi';

export default function CookiesPage() {
  const updated = "1 de Abril de 2026";
  const TOC = [
    { id: 'que-son', label: '1. ¿Qué son las cookies?' },
    { id: 'tipos', label: '2. Cookies que utilizamos' },
    { id: 'consentimiento', label: '3. Base legal' },
    { id: 'gestion', label: '4. Gestión y eliminación' },
  ];

  return (
    <main className="bg-white min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-16 border-b border-zinc-100 pb-12">
          <p className="text-brand-600 font-bold uppercase tracking-widest text-xs mb-4">Legal</p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tight mb-4">Política de Cookies</h1>
          <p className="text-zinc-500 font-medium">Última actualización: {updated}</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          <aside className="lg:w-1/4 shrink-0">
            <div className="sticky top-32">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-zinc-900">Contenido</h3>
                <button onClick={() => window.print()} className="text-zinc-400 hover:text-zinc-900 transition-colors" title="Imprimir">
                  <FiPrinter size={20} />
                </button>
              </div>
              <ul className="space-y-4 border-l-2 border-zinc-100 pl-4">
                {TOC.map(item => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-sm font-medium text-zinc-500 hover:text-brand-600 transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <article className="lg:w-3/4 text-zinc-600 font-medium leading-relaxed space-y-8">
            <section id="que-son">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">1. ¿Qué son las cookies?</h2>
              <p>Las cookies son pequeños archivos de texto que se almacenan en el navegador de tu dispositivo (ordenador, móvil) cuando visitas una página web. Permiten a la aplicación recordar tus acciones y preferencias durante un tiempo determinado (como el inicio de sesión) para que no tengas que volver a configurarlas cada vez que regresas.</p>
            </section>

            <section id="tipos">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">2. Cookies que utilizamos</h2>
              <p>EasyTrack es una herramienta de trabajo, por lo que priorizamos el uso de cookies <strong>Estrictamente Necesarias</strong>. No plagamos tu navegador de rastreadores invasivos de terceros.</p>
              
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-widest border-y border-zinc-200">
                      <th className="py-3 px-4 font-bold">Tipo</th>
                      <th className="py-3 px-4 font-bold">Proveedor</th>
                      <th className="py-3 px-4 font-bold">Uso</th>
                      <th className="py-3 px-4 font-bold">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    <tr>
                      <td className="py-4 px-4 font-bold text-zinc-900"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>Sesión (JWT)</td>
                      <td className="py-4 px-4">Supabase</td>
                      <td className="py-4 px-4">Mantenerte logueado de forma segura en tu local.</td>
                      <td className="py-4 px-4 text-zinc-500">Persistente</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-bold text-zinc-900"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>Seguridad</td>
                      <td className="py-4 px-4">Stripe</td>
                      <td className="py-4 px-4">Prevención de fraude durante el proceso de suscripción.</td>
                      <td className="py-4 px-4 text-zinc-500">1 Año</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-bold text-zinc-900"><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>Analítica</td>
                      <td className="py-4 px-4">Interna</td>
                      <td className="py-4 px-4">Telemetría anónima para detectar caídas en la web.</td>
                      <td className="py-4 px-4 text-zinc-500">Sesión</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="consentimiento">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">3. Base legal</h2>
              <p>Las cookies <strong>necesarias</strong> (las requeridas para que el dashboard funcione y no te pida la contraseña en cada clic) se instalan basándonos en el interés legítimo para prestar el servicio solicitado. Si no deseas utilizar estas cookies, no podrás hacer uso del software operativo.</p>
            </section>

            <section id="gestion">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">4. Gestión y eliminación</h2>
              <p>Puedes restringir, bloquear o borrar las cookies de EasyTrack o cualquier otra página web utilizando la configuración de tu navegador. Cada navegador opera de forma diferente, pero la función de "Ayuda" te mostrará cómo hacerlo.</p>
              <ul className="list-disc pl-6 space-y-1 mt-4 marker:text-zinc-400">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Apple Safari</a></li>
              </ul>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}