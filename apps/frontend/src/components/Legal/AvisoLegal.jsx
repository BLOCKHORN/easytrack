import LegalLayout from './LegalLayout';
import { FiFileText, FiShield, FiAlertTriangle, FiCompass } from 'react-icons/fi';

export default function AvisoLegal() {
  const updated = "18 de Octubre de 2026";
  const TOC = [
    { id: 'identificacion', label: '1. Datos Identificativos del Prestador' },
    { id: 'objeto', label: '2. Objeto y Ámbito de Aplicación' },
    { id: 'condiciones', label: '3. Condiciones de Acceso y Uso' },
    { id: 'propiedad', label: '4. Propiedad Intelectual e Industrial' },
    { id: 'responsabilidad', label: '5. Exclusión de Responsabilidad y Enlaces' },
    { id: 'legislacion', label: '6. Legislación Aplicable y Fuero Judicial' },
  ];

  return (
    <LegalLayout
      title="Aviso Legal"
      subtitle="Información legal preceptiva de conformidad con el artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE)."
      updated={updated}
      toc={TOC}
    >
      {/* 1. Datos Identificativos */}
      <section id="identificacion" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          1. Datos Identificativos del Prestador de Servicios
        </h2>
        <p className="mb-4 text-sm text-zinc-700">
          En cumplimiento de lo dispuesto en el artículo 10 de la Ley 34/2002 (LSSI-CE), se informa a los usuarios y clientes que el titular y prestador del servicio de la plataforma <strong>EasyTrack</strong> es:
        </p>
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 text-sm space-y-2.5">
          <div><strong className="text-zinc-900">Denominación social:</strong> Blockhorn Studios OÜ</div>
          <div><strong className="text-zinc-900">Número de Registro Mercantil / Tax ID:</strong> 16641285 (Estonia, Unión Europea)</div>
          <div><strong className="text-zinc-900">Domicilio social:</strong> Harju maakond, Tallinn, Kesklinna linnaosa, Ahtri tn 12, 10151, Estonia</div>
          <div><strong className="text-zinc-900">Nombre comercial y plataforma:</strong> EasyTrack (<a href="https://easytrack.pro" className="text-[#7C3AED] hover:underline">https://easytrack.pro</a>)</div>
          <div><strong className="text-zinc-900">Correo electrónico de contacto legal:</strong> <a href="mailto:legal@easytrack.pro" className="text-[#7C3AED] hover:underline font-medium">legal@easytrack.pro</a></div>
          <div><strong className="text-zinc-900">Correo de soporte técnico y operaciones:</strong> <a href="mailto:soporte@easytrack.pro" className="text-[#7C3AED] hover:underline font-medium">soporte@easytrack.pro</a></div>
        </div>
      </section>

      {/* 2. Objeto */}
      <section id="objeto" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          2. Objeto y Ámbito de Aplicación
        </h2>
        <p className="text-sm text-zinc-700 leading-relaxed mb-3">
          El presente Aviso Legal regula el acceso, navegación y uso del sitio web accesible a través de la URL <code>https://easytrack.pro</code> y de sus subdominios asociados, así como de las aplicaciones cliente y paneles de gestión logística multi-tenant que componen el ecosistema de software SaaS EasyTrack.
        </p>
        <p className="text-sm text-zinc-700 leading-relaxed">
          La condición de usuario se adquiere mediante la mera navegación o registro en la plataforma, conllevando la adhesión plena y sin reservas a las presentes condiciones y a las políticas complementarias (Privacidad, Cookies y Términos del Servicio).
        </p>
      </section>

      {/* 3. Condiciones de Acceso */}
      <section id="condiciones" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          3. Condiciones de Acceso y Uso Correcto
        </h2>
        <p className="text-sm text-zinc-700 leading-relaxed mb-4">
          El usuario se compromete a hacer un uso diligente, leal y conforme a la ley del servicio EasyTrack. Quedan expresamente prohibidas las siguientes conductas:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-zinc-700 text-sm">
          <li>Introducir o difundir virus informáticos, malware o cualquier otro sistema lógico susceptible de provocar daños en los servidores dedicados de Hetzner Online GmbH o en los sistemas de Cloudflare Inc.</li>
          <li>Intentar acceder de forma no autorizada a cuentas de otros establecimientos, saltarse el aislamiento multi-tenant o manipular los tokens de sesión <code>HttpOnly</code>.</li>
          <li>Realizar técnicas de web scraping masivo, descompilación o ingeniería inversa sobre el frontend o las APIs REST de EasyTrack sin consentimiento previo por escrito.</li>
          <li>Utilizar la plataforma para el registro o seguimiento de bultos o mercancías cuyo tráfico, comercio o tenencia sea ilícita conforme a la legislación comunitaria o nacional.</li>
        </ul>
      </section>

      {/* 4. Propiedad Intelectual */}
      <section id="propiedad" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          4. Propiedad Intelectual e Industrial
        </h2>
        <div className="space-y-3 text-sm text-zinc-700 leading-relaxed">
          <p>
            Todos los contenidos que integran la plataforma EasyTrack, entendiendo por tales a título meramente enunciativo pero no limitativo los códigos fuente (JavaScript, React, Node.js, SQL), interfaces de usuario, arquitectura de base de datos, diseños gráficos, marcas registradas, nombres comerciales, logotipos, infografías y documentación técnica, son titularidad exclusiva de <strong>Blockhorn Studios OÜ</strong> o de terceros licenciantes que han autorizado su inclusión.
          </p>
          <p>
            Queda estrictamente prohibida la reproducción total o parcial, distribución, comunicación pública, transformación o cualquier otra forma de explotación de los citados elementos sin la autorización previa, expresa y por escrito de Blockhorn Studios OÜ.
          </p>
        </div>
      </section>

      {/* 5. Exclusión de Responsabilidad */}
      <section id="responsabilidad" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          5. Exclusión de Responsabilidad y Enlaces a Terceros
        </h2>
        <div className="space-y-3 text-sm text-zinc-700 leading-relaxed">
          <p>
            <strong>Continuidad del Servicio:</strong> Blockhorn Studios OÜ adopta todas las medidas técnicas necesarias para asegurar la máxima estabilidad de la plataforma mediante infraestructura redundante en Falkenstein (Alemania) y mitigación de tráfico por Cloudflare. No obstante, no garantiza la ausencia total de interrupciones o caídas motivadas por fuerza mayor, averías generales de telecomunicaciones o incidencias ajenas a sus servidores.
          </p>
          <p>
            <strong>Custodia Material de Paquetes:</strong> Se reitera expresamente que EasyTrack opera exclusivamente como herramienta digital de inventario y localización en estanterías. No asume la condición de agencia de transporte, transportista ni depositario de mercancías. La custodia física, manipulación e indemnizaciones por extravío en el local comercial corresponden exclusivamente al establecimiento y a las agencias transportistas concertadas.
          </p>
          <p>
            <strong>Enlaces a Terceros:</strong> El sitio web puede incluir hipervínculos a pasarelas de pago externas (Stripe Payments Europe Ltd.) o páginas informativas de agencias de paquetería. Blockhorn Studios OÜ no ejerce control alguno sobre el contenido o políticas de dichos sitios externos y declina cualquier responsabilidad derivada de su consulta.
          </p>
        </div>
      </section>

      {/* 6. Legislación */}
      <section id="legislacion" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          6. Legislación Aplicable y Fuero Judicial
        </h2>
        <p className="text-sm text-zinc-700 leading-relaxed">
          Para cuantas controversias o cuestiones de índole mercantil pudieran suscitarse con ocasión del acceso, navegación o utilización de este sitio web, las partes acuerdan expresamente someterse a la legislación de la República de Estonia y a las directivas comunitarias de la Unión Europea de aplicación preferente, sometiéndose para litigios B2B a la jurisdicción exclusiva de los Juzgados y Tribunales de Tallin (Estonia).
        </p>
      </section>
    </LegalLayout>
  );
}
