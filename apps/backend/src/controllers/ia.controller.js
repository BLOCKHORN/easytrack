'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.escanearEtiqueta = async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Falta la imagen.' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } };

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

    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let result;
    let lastError;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });
        result = await model.generateContent([promptText, imagePart]);
        break; 
      } catch (error) {
        lastError = error;
        if (error.status !== 503) {
          throw error;
        }
      }
    }

    if (!result) {
      throw lastError;
    }

    const response = await result.response;
    const textOutput = response.text();
    
    const cleanedText = textOutput.replace(/```json\s*|```/g, '').trim();
    const parsedJson = JSON.parse(cleanedText);
    
    return res.json(parsedJson);

  } catch (error) {
    console.error("[IA Scanner] Error:", error);
    
    if (error.status === 503) {
      return res.status(503).json({ error: 'Servidores de IA saturados. Inténtalo de nuevo en unos segundos.' });
    }
    if (error.message && error.message.includes('API key not valid')) {
      return res.status(500).json({ error: 'Clave de API de Gemini no valida.' });
    }
    if (error.status === 429 || (error.message && error.message.includes('quota'))) {
       return res.status(429).json({ error: 'Limite de peticiones a la IA alcanzado. Revisa tu facturacion.' });
    }

    return res.status(500).json({ error: 'Error interno analizando la etiqueta.' });
  }
};