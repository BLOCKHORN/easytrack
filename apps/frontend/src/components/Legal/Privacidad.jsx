import LegalLayout from './LegalLayout';
import { FiShield, FiLock, FiServer, FiDatabase, FiCpu, FiCreditCard } from 'react-icons/fi';

export default function Privacidad() {
  const updated = "18 de Octubre de 2026";
  const TOC = [
    { id: 'responsable', label: '1. Responsable del Tratamiento' },
    { id: 'roles', label: '2. Rol de EasyTrack (Responsable vs Encargado)' },
    { id: 'datos', label: '3. Categorías de Datos Tratados' },
    { id: 'finalidades', label: '4. Finalidades y Bases Jurídicas' },
    { id: 'subencargados', label: '5. Subencargados y Destinatarios' },
    { id: 'ia-ocr', label: '6. Procesamiento de Visión Artificial (OCR)' },
    { id: 'conservacion', label: '7. Plazos de Conservación' },
    { id: 'derechos', label: '8. Ejercicio de Derechos RGPD (ARCO+)' },
    { id: 'seguridad', label: '9. Medidas Técnicas de Seguridad' },
  ];

  return (
    <LegalLayout
      title="Política de Privacidad y Protección de Datos"
      subtitle="Información detallada sobre el tratamiento, seguridad y custodia de datos personales de conformidad con el Reglamento General de Protección de Datos (RGPD UE 2016/679) y la Ley Orgánica 3/2018 (LOPDGDD)."
      updated={updated}
      toc={TOC}
    >
      {/* 1. Responsable */}
      <section id="responsable" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          1. Responsable del Tratamiento
        </h2>
        <p className="mb-4">
          El titular del servicio y responsable del tratamiento de los datos personales recopilados a través de la plataforma <strong>EasyTrack</strong> (en adelante, la «Plataforma» o el «Servicio») es:
        </p>
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 text-sm space-y-2">
          <div><strong className="text-zinc-900">Entidad mercantil:</strong> Blockhorn Studios OÜ</div>
          <div><strong className="text-zinc-900">Número de Registro / Código Mercantil:</strong> 16641285 (Estonia, Unión Europea)</div>
          <div><strong className="text-zinc-900">Domicilio social:</strong> Harju maakond, Tallinn, Kesklinna linnaosa, Ahtri tn 12, 10151, Estonia</div>
          <div><strong className="text-zinc-900">Correo electrónico de contacto general:</strong> <a href="mailto:info@easytrack.pro" className="text-[#7C3AED] hover:underline font-medium">info@easytrack.pro</a></div>
          <div><strong className="text-zinc-900">Delegado de Protección de Datos / Privacidad:</strong> <a href="mailto:privacidad@easytrack.pro" className="text-[#7C3AED] hover:underline font-medium">privacidad@easytrack.pro</a></div>
        </div>
      </section>

      {/* 2. Roles */}
      <section id="roles" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          2. Rol de EasyTrack: Responsable vs. Encargado del Tratamiento
        </h2>
        <p className="mb-4">
          De acuerdo con el marco del RGPD, la intervención de EasyTrack se divide en dos facetas diferenciadas:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5">
            <h3 className="font-bold text-zinc-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#7C3AED]"></span>
              EasyTrack como Responsable (Data Controller)
            </h3>
            <p className="text-zinc-600 text-pretty">
              Respecto a los datos de registro, credenciales, información del establecimiento (estanco, quiosco, punto de entrega), configuración de almacén y facturación de nuestros clientes directos (los titulares de cada Tenant).
            </p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5">
            <h3 className="font-bold text-zinc-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              EasyTrack como Encargado (Data Processor)
            </h3>
            <p className="text-zinc-600 text-pretty">
              Respecto a los datos de los destinatarios finales que figuran en los paquetes escaneados o registrados en la plataforma. El punto de recogida actúa como Responsable o Subencargado de las agencias de transporte, y EasyTrack procesa dichos datos exclusivamente bajo sus instrucciones para facilitar la localización física en estanterías.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Categorías de Datos */}
      <section id="datos" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          3. Categorías de Datos Tratados
        </h2>
        <p className="mb-4">
          EasyTrack aplica el principio de minimización de datos (Art. 5.1.c RGPD), limitando el tratamiento a los elementos estrictamente indispensables para la operatividad logística:
        </p>
        <ul className="list-disc pl-5 space-y-2.5 text-zinc-700">
          <li>
            <strong>Datos del Establecimiento y Cuenta:</strong> Dirección de correo electrónico corporativo, nombre comercial del punto de recogida, NIF/CIF, dirección postal del local físico, configuración de estantes, baldas y zonas de depósito, y hash criptográfico de contraseña (mediante algoritmo bcrypt con factor de coste elevado; nunca almacenamos contraseñas en texto claro).
          </li>
          <li>
            <strong>Datos Operativos de Paquetería:</strong> Nombre o iniciales del destinatario que constan en la etiqueta exterior del bulto, código de seguimiento (tracking number), agencia de transporte asociada (e.g. SEUR, GLS, DHL, Correos, InPost, UPS), ubicación física asignada en el estante, estado del bulto (recibido, entregado, devuelto) y fecha y hora de los eventos.
          </li>
          <li>
            <strong>Datos de Transacción y Pagos:</strong> Token bancario, identificador de cliente en la pasarela, últimos cuatro dígitos de la tarjeta para identificación visual del recibo y registro histórico de facturas. <em>EasyTrack no almacena números completos de tarjeta ni códigos CVV/CVC</em>; toda la operativa financiera es gestionada por Stripe Payments Europe Ltd. bajo certificación bancaria PCI-DSS Nivel 1.
          </li>
          <li>
            <strong>Datos Técnicos de Conexión:</strong> Dirección IP de acceso, registros de telemetría técnica (errores de sistema 5xx y tiempos de respuesta), identificador de sesión a través de cookies de autenticación segura (`et_auth` y `et_refresh`).
          </li>
        </ul>
      </section>

      {/* 4. Finalidades */}
      <section id="finalidades" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          4. Finalidades y Bases Jurídicas del Tratamiento
        </h2>
        <div className="overflow-x-auto border border-zinc-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-700 uppercase">
              <tr>
                <th className="py-3 px-4">Finalidad</th>
                <th className="py-3 px-4">Base Jurídica (RGPD)</th>
                <th className="py-3 px-4">Datos Afectados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-600">
              <tr>
                <td className="py-3 px-4 font-medium text-zinc-900">Prestación y mantenimiento del software logístico (SaaS)</td>
                <td className="py-3 px-4">Ejecución de contrato (Art. 6.1.b)</td>
                <td className="py-3 px-4">Cuenta, paquetes, configuración de estantes</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-zinc-900">Facturación electrónica y gestión contable de suscripciones</td>
                <td className="py-3 px-4">Obligación legal tributaria (Art. 6.1.c)</td>
                <td className="py-3 px-4">Datos fiscales, historial de cobros</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-zinc-900">Seguridad perimetral, prevención de fuerza bruta y anti-DDoS</td>
                <td className="py-3 px-4">Interés legítimo (Art. 6.1.f)</td>
                <td className="py-3 px-4">Dirección IP, registros de acceso de Nginx</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-zinc-900">Reconocimiento óptico (OCR) de etiquetas por cámara</td>
                <td className="py-3 px-4">Ejecución del servicio a petición del usuario (Art. 6.1.b)</td>
                <td className="py-3 px-4">Captura óptica en memoria volátil (sin retención de imagen)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Subencargados */}
      <section id="subencargados" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          5. Subencargados y Destinatarios de Datos (Infraestructura 2026)
        </h2>
        <p className="mb-4">
          Para garantizar la máxima disponibilidad, latencia reducida y estricto cumplimiento del RGPD, EasyTrack opera sobre infraestructura dedicada ubicada íntegramente dentro del Espacio Económico Europeo (EEE):
        </p>

        <div className="space-y-4 text-sm">
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex items-start gap-4">
            <div className="p-2 bg-white border border-zinc-200 rounded-md text-zinc-700 shrink-0">
              <FiServer className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <div className="font-semibold text-zinc-900">Hetzner Online GmbH (Alemania)</div>
              <div className="text-zinc-600 mt-1 text-pretty">
                <strong>Servidores de Aplicación y Base de Datos PostgreSQL dedicada:</strong> Ubicados en el centro de datos de Falkenstein (Sajonia, Alemania). Cero almacenamiento en servicios gestionados de terceros fuera de la Unión Europea. La base de datos opera bajo aislamiento estricto y cifrado en reposo LUKS/AES-256. Certificación ISO/IEC 27001.
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex items-start gap-4">
            <div className="p-2 bg-white border border-zinc-200 rounded-md text-zinc-700 shrink-0">
              <FiCreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="font-semibold text-zinc-900">Stripe Payments Europe, Ltd. (Irlanda)</div>
              <div className="text-zinc-600 mt-1 text-pretty">
                <strong>Pasarela de Cobro y Facturación Recurrente:</strong> Tratamiento de tarjetas bancarias, mandatos SEPA y facturación de suscripciones PRO. Certificación PCI Service Provider Level 1 y autenticación reforzada PSD2/SCA (3D Secure 2.0).
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex items-start gap-4">
            <div className="p-2 bg-white border border-zinc-200 rounded-md text-zinc-700 shrink-0">
              <FiShield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-zinc-900">Cloudflare, Inc. (Edge CDN & WAF)</div>
              <div className="text-zinc-600 mt-1 text-pretty">
                <strong>Seguridad Perimetral y Cifrado Edge:</strong> Proxy de mitigación contra ataques distribuidos de denegación de servicio (DDoS), terminación TLS 1.3 con certificados de curva elíptica y cortafuegos de aplicaciones web (WAF).
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          * EasyTrack no cede, comercializa ni transfiere bases de datos de clientes ni de paquetería a agencias publicitarias ni a intermediarios comerciales de ningún tipo.
        </p>
      </section>

      {/* 6. IA OCR */}
      <section id="ia-ocr" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100 flex items-center gap-2">
          <FiCpu className="w-6 h-6 text-[#7C3AED]" />
          <span>6. Procesamiento de Visión Artificial (OCR de Etiquetas)</span>
        </h2>
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 text-sm space-y-3">
          <p className="font-medium text-zinc-900">
            Tratamiento Efímero sin Almacenamiento de Imágenes:
          </p>
          <p className="text-zinc-600 text-pretty">
            Cuando un operario utiliza la función de escaneo con cámara del dispositivo para leer etiquetas de paquetería, el flujo de imagen se procesa en tiempo real mediante la API de Google Gemini Vision / Cloud Vision con el único propósito de extraer los caracteres de texto alfanuméricos (código de barras, número de tracking y nombre del destinatario).
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-zinc-700">
            <li><strong>Cero almacenamiento persistente:</strong> Las imágenes del escáner residen únicamente en la memoria volátil durante la extracción y son descartadas de inmediato tras la respuesta JSON.</li>
            <li><strong>Sin entrenamiento de modelos:</strong> Los datos y capturas no son utilizados para entrenar modelos de inteligencia artificial públicos ni privados de Google.</li>
            <li><strong>Procesamiento seguro:</strong> La comunicación viaja cifrada bajo HTTPS/TLS hacia endpoints de empresa bajo el Acuerdo de Tratamiento de Datos (DPA) corporativo.</li>
          </ul>
        </div>
      </section>

      {/* 7. Conservación */}
      <section id="conservacion" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          7. Plazos de Conservación de Datos
        </h2>
        <p className="mb-3">
          Los datos serán conservados de conformidad con los siguientes criterios temporales:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-zinc-700 text-sm">
          <li>
            <strong>Datos del Tenant / Cuenta de Usuario:</strong> Mientras la suscripción se mantenga activa y no se solicite la cancelación o supresión definitiva de la cuenta. Tras la baja, los datos se conservarán debidamente bloqueados durante los plazos legalmente exigibles para atender eventuales responsabilidades tributarias y mercantiles (hasta 5 años).
          </li>
          <li>
            <strong>Registros de Paquetes Entregados:</strong> Los registros operativos de paquetería se conservan en la base de datos del punto de recogida para permitir la trazabilidad de consultas o incidencias con agencias de transporte, pudiendo el titular del punto de recogida purgar o archivar dichos registros en cualquier momento.
          </li>
          <li>
            <strong>Logs de Seguridad y Conexión Nginx:</strong> Se eliminan de forma automatizada mediante rotación continua en un periodo máximo de 30 días naturales.
          </li>
        </ul>
      </section>

      {/* 8. Derechos */}
      <section id="derechos" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          8. Ejercicio de Derechos RGPD (ARCO+)
        </h2>
        <p className="mb-4">
          Como titular de los datos personales, el Reglamento General de Protección de Datos te confiere los siguientes derechos inalienables:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-6">
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
            <span className="font-semibold text-zinc-900 block">Acceso:</span> Conocer qué datos personales tratamos sobre ti y obtener una copia.
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
            <span className="font-semibold text-zinc-900 block">Rectificación:</span> Solicitar la corrección de datos inexactos o incompletos.
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
            <span className="font-semibold text-zinc-900 block">Supresión («Olvido»):</span> Solicitar la eliminación de tus datos cuando ya no sean necesarios.
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
            <span className="font-semibold text-zinc-900 block">Portabilidad:</span> Recibir los datos de tu cuenta en formato estructurado estándar (JSON/CSV).
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
            <span className="font-semibold text-zinc-900 block">Limitación:</span> Solicitar la suspensión cautelar del tratamiento mientras se verifica su licitud.
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
            <span className="font-semibold text-zinc-900 block">Oposición:</span> Oponerte al tratamiento de datos basado en el interés legítimo.
          </div>
        </div>

        <p className="text-sm">
          Para ejercer cualquiera de estos derechos, basta con remitir una solicitud por escrito a la dirección de correo electrónico <a href="mailto:privacidad@easytrack.pro" className="text-[#7C3AED] hover:underline font-semibold">privacidad@easytrack.pro</a>, indicando en el asunto «Ejercicio de Derechos RGPD» y aportando una copia de documento identificativo para acreditar tu identidad. Responderemos a tu solicitud en el plazo legal máximo de 30 días naturales.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Asimismo, si consideras que tus derechos han sido vulnerados, tienes derecho a presentar una reclamación formal ante la Autoridad de Control competente en materia de protección de datos (en España, la Agencia Española de Protección de Datos - AEPD, <a href="https://www.aepd.es" target="_blank" rel="noreferrer" className="text-[#7C3AED] hover:underline">www.aepd.es</a>).
        </p>
      </section>

      {/* 9. Seguridad */}
      <section id="seguridad" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100 flex items-center gap-2">
          <FiLock className="w-5 h-5 text-[#7C3AED]" />
          <span>9. Medidas Técnicas y Organizativas de Seguridad</span>
        </h2>
        <p className="mb-4">
          EasyTrack ha implementado medidas técnicas de vanguardia para garantizar la confidencialidad, integridad y disponibilidad continua de los datos (Art. 32 RGPD):
        </p>
        <ul className="list-disc pl-5 space-y-2 text-zinc-700 text-sm">
          <li><strong>Autenticación Blindada HttpOnly:</strong> Los tokens de sesión (JWT) no son accesibles desde scripts de JavaScript, eliminando vectores de ataque por Cross-Site Scripting (XSS). Disponen de los flags `HttpOnly`, `Secure` y `SameSite`.</li>
          <li><strong>Aislamiento Lógico Multi-Tenant:</strong> Los registros de paquetería y estanterías de cada establecimiento están estrictamente segmentados mediante filtrado forzado a nivel de base de datos por identificador de Tenant.</li>
          <li><strong>Cifrado Integral en Tránsito:</strong> Comunicaciones protegidas mediante protocolo TLS 1.3 con políticas HSTS (HTTP Strict Transport Security) forzadas en Nginx.</li>
          <li><strong>Protección contra Ataques de Fuerza Bruta:</strong> Limitación de tasa (Rate Limiting) activa en endpoints sensibles de autenticación y validación de PIN.</li>
          <li><strong>Transacciones Atómicas ACID:</strong> Operaciones críticas de entrega y movimiento de paquetes ejecutadas bajo transacciones PostgreSQL con control estricto de concurrencia para evitar discrepancias de inventario.</li>
        </ul>
      </section>
    </LegalLayout>
  );
}