import { FaWhatsapp } from 'react-icons/fa';
import { motion } from 'framer-motion';

export default function WhatsAppFab({
  phone = import.meta.env?.VITE_WHATSAPP_PHONE || '34600000000',
  message = 'Hola, quiero información sobre EasyTrack 👋'
}) {
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  
  return (
    <motion.a
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200, damping: 20 }}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatear por WhatsApp"
      className="fixed bottom-6 right-6 z-50 group flex items-center"
    >
      {/* Tooltip que aparece al hacer hover */}
      <span className="absolute right-full mr-4 whitespace-nowrap bg-white/90 backdrop-blur-md text-slate-800 text-sm font-bold py-2.5 px-5 rounded-2xl shadow-xl border border-slate-100 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
        ¿Necesitas ayuda? Escríbenos
      </span>

      {/* Botón principal */}
      <div className="w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center text-[32px] shadow-lg shadow-[#25D366]/40 transition-transform duration-300 group-hover:scale-110 active:scale-95">
        <FaWhatsapp />
      </div>
    </motion.a>
  );
}