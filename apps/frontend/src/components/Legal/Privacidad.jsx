import { useMemo } from 'react';
import { FiPrinter } from 'react-icons/fi';

export default function Privacidad() {
  const updated = "1 de Abril de 2026";
  const TOC = [
    { id: 'responsable', label: '1. Responsable' },
    { id: 'datos', label: '2. Datos Tratados' },
    { id: 'finalidad', label: '3. Finalidad' },
    { id: 'terceros', label: '4. Subencargados' },
    { id: 'derechos', label: '5. Derechos RGPD' },
    { id: 'seguridad', label: '6. Seguridad' },
  ];

  return (
    <main className="bg-white min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-16 border-b border-zinc-100 pb-12">
          <p className="text-brand-600 font-bold uppercase tracking-widest text-xs mb-4">Legal</p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tight mb-4">Política de Privacidad</h1>
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
            <section id="responsable">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">1. Responsable del Tratamiento</h2>
              <p>El responsable de la custodia y protección de tus datos es <strong>Blockhorn Studios OÜ</strong>, empresa registrada en Estonia. Contacto de privacidad: <a href="mailto:info@easytrack.pro" className="text-brand-600 font-bold">info@easytrack.pro</a>.</p>
            </section>

            <section id="datos">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">2. Datos que tratamos</h2>
              <ul className="list-disc pl-6 space-y-2 mt-4 marker:text-brand-500">
                <li><strong>Datos de Cuenta:</strong> Email, nombre de la empresa y configuración física del local.</li>
                <li><strong>Datos de Operación:</strong> Registros de entrada y salida de paquetería (nombres en paquetes, agencias).</li>
                <li><strong>Datos Técnicos:</strong> IP y trazas de error estrictamente necesarias para depuración del sistema.</li>
                <li><strong>Pagos:</strong> Gestionados íntegramente por Stripe. No vemos, procesamos ni almacenamos tu número de tarjeta de crédito.</li>
              </ul>
            </section>

            <section id="finalidad">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">3. Finalidad del Tratamiento</h2>
              <p>Los datos recogidos se utilizan única y exclusivamente para proporcionar el servicio de software (art. 6.1.b RGPD). No vendemos bases de datos ni compartimos información operativa de tu local con competidores ni agencias de marketing externas.</p>
            </section>

            <section id="terceros">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">4. Subencargados (Terceros)</h2>
              <p>Para garantizar una infraestructura robusta, utilizamos los siguientes proveedores tecnológicos de primer nivel, todos alineados con normativas europeas:</p>
              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 mt-4 space-y-4">
                <div><strong className="text-zinc-900">Supabase:</strong> Base de datos aislada (PostgreSQL) y autenticación segura.</div>
                <div><strong className="text-zinc-900">Stripe:</strong> Procesamiento de pagos, cumplimiento PCI y facturación.</div>
                <div><strong className="text-zinc-900">Render / Vercel:</strong> Alojamiento de la aplicación y servidores lógicos.</div>
              </div>
            </section>

            <section id="derechos">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">5. Tus Derechos RGPD</h2>
              <p>Como cliente, tienes derecho de acceso, rectificación, portabilidad, limitación y supresión (derecho al olvido) de todos tus datos. Puedes solicitar una exportación completa de tu base de datos o el borrado absoluto de tu Tenant escribiéndonos directamente.</p>
            </section>

            <section id="seguridad">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">6. Seguridad de la Infraestructura</h2>
              <p>Aplicamos políticas estrictas de <em>Row Level Security (RLS)</em>. Los datos de cada cliente están criptográficamente aislados. Las conexiones viajan bajo protocolos SSL/TLS y realizamos backups diarios automatizados para prevenir pérdidas de información crítica.</p>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}