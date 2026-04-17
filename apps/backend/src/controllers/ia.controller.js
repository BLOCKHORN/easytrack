'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const supa = require('../utils/supabaseClient');
const supabase = supa.supabase || supa.default || supa;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const buildPrompt = (companiaFija) => {
  const baseInstructions = `
    Eres un experto operario de almacén logístico.
    Analiza TODA LA IMAGEN (cartón, logotipos y cinta adhesiva) y extrae los datos solicitados.
    Devuelve ÚNICAMENTE un JSON válido.

    INSTRUCCIÓN CRÍTICA PARA EL NOMBRE:
    Las etiquetas suelen tener arrugas o mala impresión. Corrige errores ópticos obvios causados por dobleces (ej: "Iberra" -> "Ibarra"). 
    ¡ALERTA! El local está en una zona turística/expat. Recibirás nombres extranjeros MUY raros (nórdicos, británicos, alemanes, etc.). NO "españolices" ni alteres nombres que no conozcas. Si el nombre extranjero es legible, respétalo exactamente como está impreso.
  `;

  if (companiaFija) {
    return `
      ${baseInstructions}
      
      SABEMOS QUE LA COMPAÑÍA ES: "${companiaFija}". NO la busques ni intentes adivinarla.
      Concéntrate solo en extraer el cliente (ignora remitentes) y el teléfono.
      
      Estructura obligatoria:
      {
        "cliente": "Nombre completo del destinatario.",
        "telefono": "Número de teléfono si está visible, si no pon null."
      }
    `;
  }

  return `
    ${baseInstructions}
    
    Estructura obligatoria:
    {
      "cliente": "Nombre completo del destinatario (ignora remitentes).",
      "compania": "Empresa de transporte. DEBES devolver EXACTAMENTE uno de estos valores si hay coincidencia: 'Correos', 'Correos Express', 'Seur', 'MRW', 'Nacex', 'Tourline Express', 'Zeleris', 'Envialia', 'Halcourier', 'Tipsa', 'ASM', 'Paq24', 'Genei', 'Sending', 'Redyser', 'DHL', 'UPS', 'FedEx', 'TNT', 'GLS', 'DPD', 'Chronopost', 'Amazon Logistics', 'InPost', 'Mondial Relay', 'Packlink', 'Relais Colis', 'Celeritas', 'Shipius', 'Punto Pack', 'Stuart', 'Deliveroo Logistics', 'Uber Direct', 'Otros', 'Servientrega', 'Servienvia', 'CTT Express'. MUY IMPORTANTE: Si ves cinta adhesiva de 'Amazon' o 'Prime', el valor debe ser obligatoriamente 'Amazon Logistics'.",
      "telefono": "Número de teléfono si está visible, si no pon null."
    }
  `;
};

exports.escanearEtiqueta = async (req, res) => {
  try {
    const { imageBase64, tenant_id, compania_fija } = req.body;
    
    if (!imageBase64) return res.status(400).json({ error: 'Falta la imagen.' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    const promptText = buildPrompt(compania_fija);

    const models = ["gemini-2.5-flash", "gemini-2-flash"];
    let result;
    let lastError;

    for (const modelName of models) {
      let retries = 2; 
      
      while (retries > 0) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
          });
          
          result = await model.generateContent([promptText, imagePart]);
          break; 
        } catch (error) {
          lastError = error;
          if (error.status === 503) {
            retries--;
            if (retries > 0) await sleep(1500);
          } else {
            break;
          }
        }
      }
      if (result) break;
    }

    if (!result) throw lastError;

    const response = await result.response;
    const textOutput = response.text();
    
    if (tenant_id) {
      const usage = response.usageMetadata;
      const pTokens = usage?.promptTokenCount || 0;
      const cTokens = usage?.candidatesTokenCount || 0;

      supabase.rpc('increment_ai_usage', {
        p_tenant_id: tenant_id,
        p_prompt_tokens: pTokens,
        p_completion_tokens: cTokens
      }).then(({error}) => {
        if (error) console.error(error);
      });
    }

    const cleanedText = textOutput.replace(/```json\s*|```/g, '').trim();
    const parsedJson = JSON.parse(cleanedText);
    
    // Si venía forzada, la reinyectamos para el frontend
    if (compania_fija) {
      parsedJson.compania = compania_fija;
    }

    return res.json(parsedJson);

  } catch (error) {
    if (error?.status === 503) return res.status(503).json({ error: 'Nuestros servidores de IA están saturados. Reintenta en 3 segundos.' });
    if (error?.message && error.message.includes('API key not valid')) return res.status(500).json({ error: 'Clave de API de Gemini no válida.' });
    if (error?.status === 429 || (error?.message && error.message.includes('quota'))) return res.status(429).json({ error: 'Límite de peticiones a la IA alcanzado.' });
    return res.status(500).json({ error: 'Error interno analizando la etiqueta.' });
  }
};