'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Función auxiliar para pausar la ejecución (reintentos)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Strings oficiales exactos basados en tu panel de Google AI Studio
    const models = ["gemini-2.5-flash", "gemini-2-flash"];
    let result;
    let lastError;

    // Bucle de modelos
    for (const modelName of models) {
      let retries = 2; // Le damos 2 oportunidades a cada modelo si el servidor de Google está saturado
      
      while (retries > 0) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
          });
          
          result = await model.generateContent([promptText, imagePart]);
          break; // Éxito: rompemos el bucle 'while'
          
        } catch (error) {
          lastError = error;
          
          if (error.status === 503) {
            // Si es un 503 (Saturación), restamos un intento, esperamos 1.5s y volvemos a lanzar
            console.warn(`[IA Scanner] ${modelName} saturado (503). Reintentando...`);
            retries--;
            if (retries > 0) await sleep(1500);
          } else {
            // Si es un 404 u otro error grave, rompemos el bucle 'while' para pasar al SIGUIENTE modelo del array
            console.warn(`[IA Scanner] El modelo ${modelName} falló con error ${error.status}. Probando alternativa...`);
            break;
          }
        }
      }
      
      // Si ya obtuvimos resultado, rompemos el bucle de modelos (no necesitamos probar el fallback)
      if (result) break;
    }

    // Si después de probar todos los modelos y reintentos seguimos sin resultado, lanzamos el error
    if (!result) {
      throw lastError;
    }

    const response = await result.response;
    const textOutput = response.text();
    
    const cleanedText = textOutput.replace(/```json\s*|```/g, '').trim();
    const parsedJson = JSON.parse(cleanedText);
    
    return res.json(parsedJson);

  } catch (error) {
    console.error("[IA Scanner] Error crítico final:", error);
    
    if (error?.status === 503) {
      return res.status(503).json({ error: 'Nuestros servidores de IA están procesando demasiadas peticiones. Por favor, reintenta en 3 segundos.' });
    }
    if (error?.message && error.message.includes('API key not valid')) {
      return res.status(500).json({ error: 'Clave de API de Gemini no válida o caducada.' });
    }
    if (error?.status === 429 || (error?.message && error.message.includes('quota'))) {
       return res.status(429).json({ error: 'Límite de peticiones a la IA alcanzado. Revisa tu panel de facturación de Google.' });
    }

    return res.status(500).json({ error: 'Error interno de red analizando la etiqueta. Reintenta.' });
  }
};