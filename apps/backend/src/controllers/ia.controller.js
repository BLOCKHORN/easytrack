'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.escanearEtiqueta = async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Falta la imagen.' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } };

    const prompt = `
      Eres un experto operario de almacén logístico.
      Analiza TODA LA IMAGEN (cartón, logotipos y cinta adhesiva) y extrae 3 datos.
      Devuelve ÚNICAMENTE un JSON válido, sin texto adicional ni markdown.

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

    // Ponemos FLASH primero porque es drásticamente más rápido para el escáner en vivo.
    const modelosDisponibles = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-1.5-flash"
    ];

    let result = null;

    for (const modelName of modelosDisponibles) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([prompt, imagePart]);
        console.log(`[IA Scanner] Usando modelo: ${modelName}`);
        break;
      } catch (err) {
        console.warn(`[IA Scanner] Fallo con ${modelName}:`, err.message);
      }
    }

    if (!result) {
      return res.status(503).json({ error: 'Los servidores de IA están saturados en este momento.' });
    }
    
    let responseText = result.response.text();
    console.log("[IA Scanner] Respuesta cruda de Gemini:", responseText);
    
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return res.json(JSON.parse(responseText));
  } catch (error) {
    console.error("[IA Scanner] Error critico:", error.message);
    return res.status(500).json({ error: 'Error interno procesando la etiqueta con IA.' });
  }
};