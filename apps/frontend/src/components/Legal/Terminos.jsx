import { useMemo } from 'react';
import { FiPrinter } from 'react-icons/fi';

export default function Terminos() {
  const updated = "1 de Abril de 2026";
  const TOC = [
    { id: 'identificacion', label: '1. Identificación' },
    { id: 'objeto', label: '2. Objeto del Servicio' },
    { id: 'cuenta', label: '3. Uso de la Cuenta' },
    { id: 'pagos', label: '4. Pagos y Suscripciones' },
    { id: 'propiedad', label: '5. Propiedad Intelectual' },
    { id: 'responsabilidad', label: '6. Responsabilidad' },
    { id: 'jurisdiccion', label: '7. Jurisdicción' },
  ];

  return (
    <main className="bg-white min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-16 border-b border-zinc-100 pb-12">
          <p className="text-brand-600 font-bold uppercase tracking-widest text-xs mb-4">Legal</p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tight mb-4">Términos y Condiciones</h1>
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
            <section id="identificacion">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">1. Identificación</h2>
              <p>EasyTrack es una plataforma operada por <strong>Blockhorn Studios OÜ</strong>, registrada en Estonia. Puedes ponerte en contacto con nosotros en cualquier momento escribiendo a <a href="mailto:info@easytrack.pro" className="text-brand-600 font-bold">info@easytrack.pro</a>.</p>
            </section>

            <section id="objeto">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">2. Objeto del Servicio</h2>
              <p>EasyTrack proporciona una infraestructura digital (SaaS) diseñada para la gestión logística de puntos de recogida de paquetería. Estos términos regulan el acceso y uso de la plataforma por parte de los clientes y sus empleados autorizados.</p>
            </section>

            <section id="cuenta">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">3. Uso de la Cuenta</h2>
              <ul className="list-disc pl-6 space-y-2 mt-4 marker:text-brand-500">
                <li>Eres el único responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
                <li>Queda estrictamente prohibida la ingeniería inversa, el web scraping masivo o cualquier intento de vulnerar la seguridad del sistema.</li>
                <li>Blockhorn Studios OÜ se reserva el derecho de suspender cuentas que presenten actividad ilícita o fraudulenta.</li>
              </ul>
            </section>

            <section id="pagos">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">4. Pagos y Suscripciones</h2>
              <p>La facturación se realiza de forma recurrente mediante <strong>Stripe</strong>. Al suscribirte a un plan Premium, aceptas el cobro automático según la periodicidad elegida (mensual o anual).</p>
              <p className="mt-4">Puedes cancelar tu suscripción en cualquier momento desde tu Área Personal. El servicio se mantendrá activo hasta el final del periodo ya abonado. Por la naturaleza del software digital, no se emitirán reembolsos prorrateados por periodos no consumidos.</p>
            </section>

            <section id="propiedad">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">5. Propiedad Intelectual</h2>
              <p>El código fuente, diseño, logotipos y arquitectura de EasyTrack son propiedad exclusiva de Blockhorn Studios OÜ. Se te otorga una licencia de uso limitada, revocable y no transferible mientras mantengas tu cuenta activa. Los datos de tus clientes e inventario que ingreses en la plataforma son exclusivamente tuyos.</p>
            </section>

            <section id="responsabilidad">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">6. Responsabilidad</h2>
              <p>El servicio se proporciona "tal cual". Nuestro objetivo es mantener un tiempo de actividad del 99.9%, pero no nos hacemos responsables por lucro cesante, pérdidas comerciales o daños indirectos derivados de caídas puntuales del servidor o cortes en proveedores externos (ej. AWS, Vercel).</p>
            </section>

            <section id="jurisdiccion">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">7. Jurisdicción</h2>
              <p>Estos términos se rigen por la legislación de Estonia y las normativas europeas aplicables. Cualquier disputa se someterá a los tribunales competentes de dicha jurisdicción.</p>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}