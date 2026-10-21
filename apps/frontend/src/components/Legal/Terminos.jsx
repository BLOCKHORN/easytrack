import LegalLayout from './LegalLayout';
import { FiCheckCircle, FiAlertCircle, FiCreditCard, FiPackage, FiShield, FiFileText } from 'react-icons/fi';

export default function Terminos() {
  const updated = "18 de Octubre de 2026";
  const TOC = [
    { id: 'identificacion', label: '1. Identificación de las Partes' },
    { id: 'objeto', label: '2. Objeto del Servicio SaaS' },
    { id: 'registro', label: '3. Cuenta de Usuario y Seguridad' },
    { id: 'planes', label: '4. Planes, Precios y Facturación' },
    { id: 'custodia', label: '5. Delimitación de Responsabilidad (Paquetería Física)' },
    { id: 'propiedad-datos', label: '6. Propiedad Intelectual y de los Datos' },
    { id: 'disponibilidad', label: '7. Disponibilidad del Servicio y SLA' },
    { id: 'baja', label: '8. Cancelación y Terminación' },
    { id: 'legislacion', label: '9. Ley Aplicable y Jurisdicción' },
  ];

  return (
    <LegalLayout
      title="Términos y Condiciones del Servicio"
      subtitle="Condiciones generales de contratación y uso de la plataforma de gestión logística EasyTrack para puntos de recogida, estancos y comercios minoristas."
      updated={updated}
      toc={TOC}
    >
      {/* 1. Identificación */}
      <section id="identificacion" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          1. Identificación de las Partes
        </h2>
        <p className="mb-4">
          Los presentes Términos y Condiciones regulan la relación contractual entre <strong>Blockhorn Studios OÜ</strong> (en adelante, «EasyTrack» o el «Prestador»), con registro mercantil n.º 16641285 en Tallin (Estonia), y la persona física o jurídica que contrata o hace uso de la plataforma (en adelante, el «Cliente» o el «Usuario»).
        </p>
        <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg p-4">
          El acceso, registro o utilización del software EasyTrack implica la aceptación plena y sin reservas de todas las disposiciones incluidas en este documento, así como en la Política de Privacidad y la Política de Cookies asociadas.
        </p>
      </section>

      {/* 2. Objeto */}
      <section id="objeto" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          2. Objeto del Servicio SaaS
        </h2>
        <p className="mb-4">
          EasyTrack proporciona una solución de software como servicio (SaaS) orientada a la organización, indexación, geolocalización en estantes físicos y gestión de entradas y salidas de paquetería para establecimientos comerciales que actúan como puntos de entrega y recogida (Pick-Up Points / PUDO).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
            <div className="font-semibold text-zinc-900 mb-1">Mapeo de Estanterías</div>
            <p className="text-zinc-600 text-xs">Asignación visual de coordenadas físicas por baldas y zonas de almacenamiento para entrega rápida.</p>
          </div>
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
            <div className="font-semibold text-zinc-900 mb-1">Escáner OCR Efímero</div>
            <p className="text-zinc-600 text-xs">Lectura de códigos de barras y etiquetas de paquetería mediante cámara para registro instantáneo.</p>
          </div>
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
            <div className="font-semibold text-zinc-900 mb-1">Control Multi-Agencia</div>
            <p className="text-zinc-600 text-xs">Unificación de flujos para todas las agencias logísticas (GLS, SEUR, DHL, InPost, Correos, etc.).</p>
          </div>
        </div>
      </section>

      {/* 3. Registro y Cuenta */}
      <section id="registro" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          3. Cuenta de Usuario y Responsabilidad Operativa
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-zinc-700 text-sm">
          <li><strong>Capacidad Legal:</strong> El Usuario declara ser mayor de edad y ostentar facultades suficientes para vincular al establecimiento mercantil en cuyo nombre contrata el servicio.</li>
          <li><strong>Custodia de Credenciales:</strong> El Cliente es el único custodio de sus claves de acceso y de los códigos PIN asignados al personal de caja. Debe notificar de inmediato cualquier uso no autorizado o sospecha de brecha de seguridad.</li>
          <li><strong>Prohibición de Actividades Lesivas:</strong> Queda terminantemente prohibido utilizar el servicio para la indexación de bultos que contengan mercancías ilegales, así como realizar ingeniería inversa, scraping automatizado o intentos de elusión de las medidas de seguridad perimetrales.</li>
        </ul>
      </section>

      {/* 4. Planes y Facturación */}
      <section id="planes" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          4. Modalidades de Suscripción, Precios y Facturación
        </h2>
        <p className="mb-4 text-sm">
          EasyTrack ofrece diferentes modalidades de acceso al servicio según el volumen operativo del establecimiento:
        </p>

        <div className="space-y-4 text-sm mb-6">
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-zinc-900">Plan de Evaluación (Free Trial)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 font-semibold text-zinc-700">0 €</span>
            </div>
            <p className="text-zinc-600 text-xs">
              Permite la gestión completa de hasta <strong>250 paquetes acumulados</strong> para verificar la idoneidad técnica y física del software en el mostrador del establecimiento. No requiere tarjeta de crédito para comenzar.
            </p>
          </div>

          <div className="p-4 bg-zinc-50 border border-[#7C3AED]/30 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-zinc-900">Plan PRO Ilimitado</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#7C3AED]/10 font-bold text-[#7C3AED]">Suscripción Recurrente</span>
            </div>
            <p className="text-zinc-600 text-xs">
              Sin límite en el volumen de paquetes gestionados, estantes y baldas ilimitados, analítica avanzada de saturación de almacén y soporte técnico prioritario.
            </p>
          </div>
        </div>

        <h3 className="font-bold text-zinc-900 text-base mb-2">Condiciones de Cobro y Facturas:</h3>
        <ul className="list-disc pl-5 space-y-2 text-zinc-700 text-sm">
          <li><strong>Procesamiento Seguro:</strong> La facturación recurrente se procesa a través de <strong>Stripe Payments Europe Ltd.</strong> con cobro automático al inicio de cada periodo (mensual o anual).</li>
          <li><strong>Impuestos:</strong> Los precios se muestran en euros e indicarán el Impuesto sobre el Valor Añadido (IVA) aplicable según el país de establecimiento del Cliente o la normativa de inversión del sujeto pasivo intracomunitario (EU VAT Reverse Charge).</li>
          <li><strong>Facturación Automática:</strong> Tras cada pago se genera una factura electrónica legalmente válida que se remite por correo electrónico y queda disponible en la sección de Facturación del panel.</li>
        </ul>
      </section>

      {/* 5. Delimitación de Responsabilidad */}
      <section id="custodia" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100 flex items-center gap-2">
          <FiPackage className="w-5 h-5 text-amber-600" />
          <span>5. Delimitación Crítica de Responsabilidad: Paquetería Física</span>
        </h2>
        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-5 text-sm space-y-3 text-zinc-800">
          <p className="font-semibold text-amber-950">
            Naturaleza Estricta de Software de Gestión de Inventario:
          </p>
          <p className="text-pretty">
            EasyTrack es una herramienta tecnológica de registro, ordenación y asistencia operativa en mostrador. <strong>EasyTrack NO es una empresa de mensajería, transporte, depósito o almacenaje de mercancías ni asume la condición de depositario físico.</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-zinc-700 text-xs leading-relaxed">
            <li><strong>Custodia material:</strong> La custodia, custodia legal, seguridad física, deterioro, extravío, robo o daño sobre los paquetes recepcionados en el local comercial corresponde con exclusividad al Cliente y a los acuerdos contractuales que éste mantenga con cada agencia de paquetería transportista.</li>
            <li><strong>Discrepancias de inventario:</strong> EasyTrack no responderá por desajustes entre los bultos registrados digitalmente en la plataforma y la presencia física real de los mismos en el establecimiento, debiendo el personal del Cliente validar físicamente la entrega y salida de cada bulto.</li>
            <li><strong>Responsabilidad contractual máxima:</strong> En la máxima medida permitida por la ley aplicable, la responsabilidad económica total de EasyTrack por cualquier causa imputable a deficiencias del software quedará limitada al importe efectivamente abonado por el Cliente en los últimos tres (3) meses de suscripción.</li>
          </ul>
        </div>
      </section>

      {/* 6. Propiedad Intelectual */}
      <section id="propiedad-datos" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          6. Propiedad Intelectual y Titularidad de los Datos
        </h2>
        <div className="space-y-4 text-sm text-zinc-700">
          <p>
            <strong>Propiedad de la Plataforma:</strong> El código fuente, diseño gráfico de la interfaz, marcas, logotipos, arquitectura de datos y algoritmos de optimización de estanterías son titularidad exclusiva de Blockhorn Studios OÜ. La contratación del servicio otorga una licencia de uso temporal, limitada, no transferible y no sublicenciable para la gestión interna del establecimiento.
          </p>
          <p>
            <strong>Titularidad de los Datos del Cliente:</strong> Todos los datos de inventario, registros de paquetes, nombres y configuraciones ingresadas por el Cliente son y seguirán siendo propiedad exclusiva del Cliente. EasyTrack no se arroga ningún derecho de propiedad sobre dicha información ni la utilizará para fines ajenos a la prestación del servicio.
          </p>
          <p>
            <strong>Exportación de Datos:</strong> El Cliente tiene derecho a solicitar o descargar una copia estructurada de sus registros de inventario en cualquier momento antes de la baja del servicio.
          </p>
        </div>
      </section>

      {/* 7. Disponibilidad y SLA */}
      <section id="disponibilidad" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          7. Disponibilidad del Servicio y Nivel de Servicio (SLA)
        </h2>
        <p className="mb-3 text-sm text-zinc-700">
          EasyTrack se compromete a realizar sus máximos esfuerzos técnicos y organizativos para mantener una tasa de disponibilidad del servicio del <strong>99.9% anual</strong>.
        </p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Quedan excluidas del cómputo de disponibilidad las ventanas de mantenimiento programado comunicadas con al menos 24 horas de antelación (las cuales se realizarán preferentemente fuera de horario comercial del comercio minorista), así como las incidencias motivadas por cortes generales de telecomunicaciones, ataques masivos de denegación de servicio no mitigables o fallos de red ajenos al control de Hetzner Online GmbH y Cloudflare Inc.
        </p>
      </section>

      {/* 8. Cancelación */}
      <section id="baja" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          8. Cancelación, Rescisión y Reembolsos
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-zinc-700 text-sm">
          <li><strong>Cancelación sin permanencia:</strong> El Cliente puede cancelar su suscripción PRO en cualquier momento con un solo clic desde la pestaña de Facturación o escribiendo a soporte. No existen penalizaciones ni periodos de permanencia mínima obligatoria.</li>
          <li><strong>Acceso hasta fin de ciclo:</strong> Tras la cancelación, la suscripción no se renovará en el siguiente periodo y el Cliente mantendrá acceso completo hasta la fecha de expiración del ciclo ya abonado.</li>
          <li><strong>Política de Reembolsos:</strong> Al tratarse de un servicio de software de consumo continuo y puesta a disposición inmediata, no se conceden reembolsos proporcionales por fracciones de tiempo no disfrutadas dentro de un ciclo ya facturado.</li>
        </ul>
      </section>

      {/* 9. Legislación */}
      <section id="legislacion" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-4 pb-2 border-b border-zinc-100">
          9. Legislación Aplicable y Resolución de Controversias
        </h2>
        <p className="text-sm text-zinc-700 leading-relaxed">
          Los presentes Términos se regirán e interpretarán de conformidad con las leyes de la Unión Europea y de la República de Estonia. Para la resolución de cualquier conflicto derivado de la interpretación o cumplimiento de este contrato entre partes mercantiles (B2B), ambas partes se someten expresamente a la jurisdicción de los tribunales de la ciudad de Tallin, con renuncia a cualquier otro fuero que pudiera corresponderles.
        </p>
      </section>
    </LegalLayout>
  );
}