import { FaWhatsapp } from 'react-icons/fa'
import './WhatsAppFab.scss'

export default function WhatsAppFab({
  phone = import.meta.env?.VITE_WHATSAPP_PHONE || '34600000000',
  message = 'Hola, quiero información sobre EasyPack 👋'
}) {
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  return (
    <a
      className="wa-fab"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatear por WhatsApp"
    >
      <FaWhatsapp aria-hidden="true" />
      <span className="wa-fab__hint">¿Necesitas ayuda? Escríbenos</span>
    </a>
  )
}
