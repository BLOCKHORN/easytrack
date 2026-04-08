import { enviarWhatsAppManual } from '../utils/whatsapp';
import { FaWhatsapp } from 'react-icons/fa';

export default function BotonWhatsApp({ paquete, tenant }) {
  if (!paquete.telefono) return null;

  return (
    <button
      onClick={() => enviarWhatsAppManual(paquete.telefono, paquete.cliente, tenant.nombre_empresa)}
      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors shadow-sm"
    >
      <FaWhatsapp className="text-lg" /> Avisar por WhatsApp
    </button>
  );
}