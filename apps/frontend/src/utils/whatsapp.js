export const enviarWhatsAppManual = (telefono, nombreCliente, nombreNegocio) => {
  const numeroLimpio = telefono.replace(/\D/g, '');
  
  if (!numeroLimpio) return;

  const prefijo = numeroLimpio.length === 9 ? '34' : '';
  const numeroFinal = `${prefijo}${numeroLimpio}`;
  
  const mensaje = `Hola ${nombreCliente}, tu paquete ya ha sido recepcionado y está listo para recoger en ${nombreNegocio}.`;
  
  const url = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`;
  
  window.open(url, '_blank', 'noopener,noreferrer');
};