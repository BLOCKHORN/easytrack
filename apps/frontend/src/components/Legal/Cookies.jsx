import LegalLayout from './LegalLayout';
import { FiCheckCircle, FiShield, FiLock, FiSettings } from 'react-icons/fi';

export default function CookiesPage() {
  const updated = "18 de Octubre de 2026";
  const TOC = [
    { id: 'que-son', label: '1. ¿Qué son las Cookies?' },
    { id: 'enfoque', label: '2. Enfoque de Privacidad (Cero Rastreo Publicitario)' },
    { id: 'tabla-cookies', label: '3. Relación de Cookies Utilizadas' },
    { id: 'base-legal', label: '4. Base Legal y Exención de Consentimiento' },
    { id: 'desactivacion', label: '5. Cómo Gestionar o Bloquear Cookies' },
  ];

  return (
    <LegalLayout
      title="Política de Cookies"
      subtitle="Transparencia técnica completa sobre el uso exclusivo de cookies técnicas y de seguridad en EasyTrack, conforme al Art. 22.2 de la LSSI-CE y la Directiva ePrivacy."
      updated={updated}
      toc={TOC}
    >
      {/* 1. ¿Qué son? */}
      <section id="que-son" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          1. ¿Qué son las Cookies y Tecnologías Similares?
        </h2>
        <p className="text-zinc-700 leading-relaxed mb-4">
          Una cookie es un pequeño fichero de datos que un servidor web envía al navegador del dispositivo del usuario (ordenador, tablet o teléfono móvil) para registrar información sobre su sesión técnica, navegación o preferencias.
        </p>
        <p className="text-zinc-700 leading-relaxed">
          Existen dos grandes grupos de cookies:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
            <span className="font-semibold text-zinc-900 block mb-1">Cookies Técnicas / Esenciales</span>
            <span className="text-zinc-600 text-xs text-pretty">Indispensables para que la aplicación funcione, verifique tu sesión iniciada y proteja tus datos de accesos no autorizados.</span>
          </div>
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
            <span className="font-semibold text-zinc-900 block mb-1">Cookies Publicitarias y de Rastreo</span>
            <span className="text-zinc-600 text-xs text-pretty">Utilizadas para crear perfiles comerciales y rastrear al usuario por múltiples webs con fines de marketing.</span>
          </div>
        </div>
      </section>

      {/* 2. Enfoque de Privacidad */}
      <section id="enfoque" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100 flex items-center gap-2">
          <FiShield className="w-5 h-5 text-emerald-600" />
          <span>2. Nuestro Enfoque: Cero Rastreo Publicitario</span>
        </h2>
        <div className="bg-emerald-50/40 border border-emerald-200 rounded-lg p-5 text-sm space-y-3 text-zinc-800">
          <p className="font-semibold text-emerald-950">
            Privacidad por Diseño (Zero Third-Party Ad Trackers):
          </p>
          <p className="text-pretty">
            EasyTrack es una herramienta de productividad y software B2B para puntos de recogida. <strong>No incorporamos redes de afiliación publicitaria, píxeles de seguimiento publicitario (Meta Pixel, Google Ads, TikTok Pixel) ni comercializamos historiales de navegación de nuestros usuarios.</strong>
          </p>
          <p className="text-xs text-zinc-600">
            Todas las cookies activas en la plataforma responden estrictamente a razones de seguridad criptográfica, autenticación de cuentas y prevención de fraude en pasarelas de pago.
          </p>
        </div>
      </section>

      {/* 3. Tabla Detallada */}
      <section id="tabla-cookies" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          3. Relación Exhaustiva de Cookies Técnicas Utilizadas
        </h2>
        <p className="mb-4 text-sm text-zinc-600">
          A continuación se desglosan las únicas cookies y tokens que pueden instalarse durante tu uso de la plataforma EasyTrack:
        </p>

        <div className="overflow-x-auto border border-zinc-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-700 uppercase">
              <tr>
                <th className="py-3 px-4">Identificador</th>
                <th className="py-3 px-4">Emisor</th>
                <th className="py-3 px-4">Finalidad Técnica y Seguridad</th>
                <th className="py-3 px-4">Persistencia</th>
                <th className="py-3 px-4">Clasificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-600">
              <tr>
                <td className="py-3.5 px-4 font-mono font-semibold text-zinc-900 text-xs">et_auth</td>
                <td className="py-3.5 px-4">EasyTrack (Propia)</td>
                <td className="py-3.5 px-4 text-xs">
                  Token de acceso JWT de alta seguridad para validar la identidad del usuario logueado en las peticiones al backend. Configurado con flags <code>HttpOnly</code> (inmune a robo por XSS), <code>Secure</code> (HTTPS obligatorio) y <code>SameSite=Lax</code>.
                </td>
                <td className="py-3.5 px-4 text-xs tabular-nums text-zinc-700 font-medium">15 minutos</td>
                <td className="py-3.5 px-4 text-xs"><span className="text-emerald-700 font-semibold">Técnica Esencial</span></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-mono font-semibold text-zinc-900 text-xs">et_refresh</td>
                <td className="py-3.5 px-4">EasyTrack (Propia)</td>
                <td className="py-3.5 px-4 text-xs">
                  Token criptográfico de rotación silenciosa de sesión. Permite renovar el token de acceso sin cerrar la sesión del dependiente en el mostrador ni interrumpir la operativa física del local. Flags <code>HttpOnly</code>, <code>Secure</code> y <code>SameSite=Strict</code>.
                </td>
                <td className="py-3.5 px-4 text-xs tabular-nums text-zinc-700 font-medium">30 días o logout</td>
                <td className="py-3.5 px-4 text-xs"><span className="text-emerald-700 font-semibold">Técnica Esencial</span></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-mono font-semibold text-zinc-900 text-xs">__stripe_mid, __stripe_sid</td>
                <td className="py-3.5 px-4">Stripe Payments Europe Ltd.</td>
                <td className="py-3.5 px-4 text-xs">
                  Cookies antifraude emitidas por Stripe al acceder al módulo de facturación o suscripción PRO. Permiten verificar la legitimidad de la transacción bancaria y cumplir con la autenticación reforzada PSD2 (SCA 3D Secure).
                </td>
                <td className="py-3.5 px-4 text-xs tabular-nums text-zinc-700 font-medium">Sesión a 1 año</td>
                <td className="py-3.5 px-4 text-xs"><span className="text-blue-700 font-semibold">Seguridad / Cobro</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Base Legal */}
      <section id="base-legal" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          4. Base Legal y Exención de Consentimiento
        </h2>
        <p className="text-sm text-zinc-700 leading-relaxed mb-3">
          De conformidad con el <strong>artículo 22.2 de la Ley 34/2002 (LSSI-CE)</strong> y las directrices del Comité Europeo de Protección de Datos (CEPD) y de la Agencia Española de Protección de Datos (AEPD), <em>las cookies estrictamente necesarias para la prestación de un servicio expresamente solicitado por el usuario o destinadas exclusivamente a permitir la comunicación entre el equipo del usuario y la red no requieren el consentimiento previo del usuario</em>.
        </p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Dado que EasyTrack no emplea cookies publicitarias, analítica invasiva ni trackers de terceros con fines de prospección comercial, no es legalmente preceptivo mostrar banners bloqueantes de consentimiento de cookies que degraden la velocidad operativa del punto de recogida.
        </p>
      </section>

      {/* 5. Gestión */}
      <section id="desactivacion" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100 flex items-center gap-2">
          <FiSettings className="w-5 h-5 text-zinc-700" />
          <span>5. Cómo Gestionar, Bloquear o Eliminar Cookies</span>
        </h2>
        <p className="text-sm text-zinc-700 leading-relaxed mb-4">
          Cualquier usuario puede revocar o modificar la configuración de almacenamiento de cookies en cualquier momento a través de los ajustes propios de su navegador web. Ten en cuenta que si bloqueas las cookies técnicas esenciales (`et_auth` y `et_refresh`), no podrás mantener una sesión activa en el panel de control.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-zinc-50 border border-zinc-200 rounded-md hover:border-zinc-300 text-zinc-900 font-medium transition-colors"
          >
            <div className="font-bold text-zinc-950 mb-1">Google Chrome</div>
            <span className="text-zinc-500">Configuración &gt; Privacidad y seguridad &gt; Cookies</span>
          </a>
          <a
            href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-zinc-50 border border-zinc-200 rounded-md hover:border-zinc-300 text-zinc-900 font-medium transition-colors"
          >
            <div className="font-bold text-zinc-950 mb-1">Mozilla Firefox</div>
            <span className="text-zinc-500">Opciones &gt; Privacidad y Seguridad &gt; Cookies</span>
          </a>
          <a
            href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-zinc-50 border border-zinc-200 rounded-md hover:border-zinc-300 text-zinc-900 font-medium transition-colors"
          >
            <div className="font-bold text-zinc-950 mb-1">Apple Safari</div>
            <span className="text-zinc-500">Preferencias &gt; Privacidad &gt; Bloquear cookies</span>
          </a>
          <a
            href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-zinc-50 border border-zinc-200 rounded-md hover:border-zinc-300 text-zinc-900 font-medium transition-colors"
          >
            <div className="font-bold text-zinc-950 mb-1">Microsoft Edge</div>
            <span className="text-zinc-500">Configuración &gt; Cookies y permisos de sitio</span>
          </a>
        </div>
      </section>
    </LegalLayout>
  );
}