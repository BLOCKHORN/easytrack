'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Aseguramos que la API key está disponible
if (!process.env.GEMINI_API_KEY) {
  console.error('[IA Scanner] CRÍTICO: GEMINI_API_KEY no está configurada en las variables de entorno.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.escanearEtiqueta = async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Falta la imagen.' });

    // Limpiamos la cabecera base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // Formato requerido por Gemini para imágenes
    const imagePart = { 
      inlineData: { 
        data: base64Data, 
        mimeType: "image/jpeg" 
      } 
    };

    const promptText = `
      Eres un experto operario de almacén logístico.
      Analiza TODA LA IMAGEN (cartón, logotipos y cinta adhesiva) y extrae 3 datos.
      Devuelve ÚNICAMENTE un JSON válido.

      INSTRUCCIÓN CRÍTICA PARA EL NOMBRE:
      Las etiquetas suelen tener arrugas o mala impresión. Corrige errores ópticos obvios causados por dobleces (ej: "Iberra" -> "Ibarra"). 
      ¡ALERTA! El local está en una zona turística/expat. Recibirás nombres extranjeros MUY raros (nórdicos, británicos, alemanes, etc.). NO "españolices" ni alteres nombres que no conozcas. Si el nombre extranjero es legible, respétalo exactamente como está impreso.

      Estructura obligatoria:
      {
        "cliente": "Nombre completo del destinatario (ignora remitentes).",
        "compania": "Empresa de transporte. DEBES devolver EXACTAMENTE uno de estos valores si hay coincidencia: 'Correos', 'Correos Express', 'Seur', 'MRW', 'Nacex', 'Tourline Express', 'Zeleris', 'Envialia', 'Halcourier', 'Tipsa', 'ASM', 'Paq24', 'Genei', 'Sending', 'Redyser', 'DHL', 'UPS', 'FedEx', 'TNT', 'GLS', 'DPD', 'Chronopost', 'Amazon Logistics', 'InPost', 'Mondial Relay', 'Packlink', 'Relais Colis', 'Celeritas', 'Shipius', 'Punto Pack', 'Stuart', 'Deliveroo Logistics', 'Uber Direct', 'Otros', 'Servientrega', 'Servienvia', 'CTT Express'. MUY IMPORTANTE: Si ves cinta adhesiva de 'Amazon' o 'Prime', el valor debe ser obligatoriamente 'Amazon Logistics'.",
        "telefono": "Número de teléfono si está visible, si no pon null."
      }
    `;

    // Usamos el modelo más rápido y capaz para esta tarea
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        // Forzamos que la salida sea siempre JSON puro
        responseMimeType: "application/json",
      }
    });

    console.log(`[IA Scanner] Iniciando análisis con gemini-1.5-flash...`);
    
    // Enviamos el array con el texto y la imagen
    const result = await model.generateContent([promptText, imagePart]);
    const response = await result.response;
    const textOutput = response.text();
    
    console.log("[IA Scanner] Respuesta de Gemini:", textOutput);

    // Como forzamos responseMimeType: application/json, el texto ya es un JSON válido
    const parsedData = JSON.parse(textOutput);

    return res.json(parsedData);

  } catch (error) {
    console.error("[IA Scanner] Error crítico procesando imagen:", error);
    
    // Capturamos posibles errores de API key o cuotas
    if (error.message && error.message.includes('API key not valid')) {
      return res.status(500).json({ error: 'Clave de API de Gemini no válida.' });
    }
    if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
       return res.status(429).json({ error: 'Límite de peticiones a la IA alcanzado. Inténtalo de nuevo más tarde.' });
    }

    return res.status(500).json({ error: 'Error interno analizando la etiqueta.' });
  }
};