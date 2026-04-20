'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const supa = require('../utils/supabaseClient');
const supabase = supa.supabase || supa.default || supa;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const buildPrompt = (companiaFija) => {
  const baseInstructions = `
    Eres un experto operario de almacén logístico.
    Analiza TODA LA IMAGEN y extrae los datos.
    Corrige errores ópticos obvios (ej: "Iberra" -> "Ibarra"). 
    Respeta nombres extranjeros exactamente como están impresos.
    DEVUELVE ÚNICAMENTE UN JSON VÁLIDO. NINGÚN TEXTO EXTRA. Usa las claves cortas indicadas.
  `;

  if (companiaFija) {
    return `
      ${baseInstructions}
      SABEMOS QUE LA COMPAÑÍA ES: "${companiaFija}".
      
      Estructura obligatoria:
      {
        "c": "Nombre completo del destinatario",
        "t": "Número de teléfono si está visible, si no null"
      }
    `;
  }

  return `
    ${baseInstructions}
    
    Estructura obligatoria:
    {
      "c": "Nombre completo del destinatario",
      "e": "Empresa de transporte. EXACTAMENTE uno de estos: 'Correos', 'Correos Express', 'Seur', 'MRW', 'Nacex', 'Tourline Express', 'Zeleris', 'Envialia', 'Halcourier', 'Tipsa', 'ASM', 'Paq24', 'Genei', 'Sending', 'Redyser', 'DHL', 'UPS', 'FedEx', 'TNT', 'GLS', 'DPD', 'Chronopost', 'Amazon Logistics', 'InPost', 'Mondial Relay', 'Packlink', 'Relais Colis', 'Celeritas', 'Shipius', 'Punto Pack', 'Stuart', 'Deliveroo Logistics', 'Uber Direct', 'Otros', 'Servientrega', 'Servienvia', 'CTT Express'. Si ves cinta de 'Amazon' o 'Prime', pon 'Amazon Logistics'.",
      "t": "Número de teléfono si está visible, si no null"
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
            generationConfig: { 
              responseMimeType: "application/json",
              maxOutputTokens: 100, 
              temperature: 0.1 
            }
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

    // Limpieza a prueba de balas que ya te funcionaba
    const cleanedText = textOutput.replace(/```json\s*|```/g, '').trim();
    const parsedRaw = JSON.parse(cleanedText);
    
    // Mapeamos las claves cortas (c, e, t) a las que espera tu frontend para no romper nada
    const parsedJson = {
      cliente: parsedRaw.c || parsedRaw.cliente || "",
      compania: compania_fija ? compania_fija : (parsedRaw.e || parsedRaw.compania || "Otros"),
      telefono: parsedRaw.t || parsedRaw.telefono || null
    };

    return res.json(parsedJson);

  } catch (error) {
    console.error("Error analizando etiqueta:", error);
    if (error?.status === 503) return res.status(503).json({ error: 'Nuestros servidores de IA están saturados. Reintenta en 3 segundos.' });
    if (error?.message && error.message.includes('API key not valid')) return res.status(500).json({ error: 'Clave de API de Gemini no válida.' });
    if (error?.status === 429 || (error?.message && error.message.includes('quota'))) return res.status(429).json({ error: 'Límite de peticiones a la IA alcanzado.' });
    return res.status(500).json({ error: 'Error interno analizando la etiqueta.' });
  }
};