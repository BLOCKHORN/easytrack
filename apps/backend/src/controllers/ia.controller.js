'use strict';

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const supa = require('../utils/supabaseClient');
const supabase = supa.supabase || supa.default || supa;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Esquemas estrictos para forzar a la IA a responder solo con n, e, p (ahorro masivo de tokens de salida)
const schemaSinEmpresa = {
  type: SchemaType.OBJECT,
  properties: {
    n: { type: SchemaType.STRING, description: "Nombre completo del cliente" },
    p: { type: SchemaType.STRING, description: "Teléfono o null" }
  },
  required: ["n", "p"]
};

const schemaConEmpresa = {
  type: SchemaType.OBJECT,
  properties: {
    n: { type: SchemaType.STRING, description: "Nombre completo del cliente" },
    e: { type: SchemaType.STRING, description: "Empresa de transporte estandarizada" },
    p: { type: SchemaType.STRING, description: "Teléfono o null" }
  },
  required: ["n", "e", "p"]
};

const buildPrompt = (companiaFija) => {
  const baseInstructions = `
    Eres un experto operario de almacén logístico.
    Analiza TODA LA IMAGEN y extrae los datos solicitados.
    Las etiquetas suelen tener arrugas. Corrige errores ópticos obvios (ej: "Iberra" -> "Ibarra"). 
    El local está en una zona turística. Respeta nombres extranjeros (nórdicos, británicos, etc.) exactamente como están impresos, no los españolices.
  `;

  if (companiaFija) {
    return `
      ${baseInstructions}
      SABEMOS QUE LA COMPAÑÍA ES: "${companiaFija}". NO la busques.
      Extrae cliente (n) y teléfono (p).
    `;
  }

  return `
    ${baseInstructions}
    Extrae cliente (n), empresa (e) y teléfono (p).
    La empresa (e) DEBE ser EXACTAMENTE uno de estos valores: 'Correos', 'Correos Express', 'Seur', 'MRW', 'Nacex', 'Tourline Express', 'Zeleris', 'Envialia', 'Halcourier', 'Tipsa', 'ASM', 'Paq24', 'Genei', 'Sending', 'Redyser', 'DHL', 'UPS', 'FedEx', 'TNT', 'GLS', 'DPD', 'Chronopost', 'Amazon Logistics', 'InPost', 'Mondial Relay', 'Packlink', 'Relais Colis', 'Celeritas', 'Shipius', 'Punto Pack', 'Stuart', 'Deliveroo Logistics', 'Uber Direct', 'Otros', 'Servientrega', 'Servienvia', 'CTT Express'.
    MUY IMPORTANTE: Si ves cinta adhesiva de 'Amazon' o 'Prime', el valor debe ser 'Amazon Logistics'.
  `;
};

exports.escanearEtiqueta = async (req, res) => {
  try {
    const { imageBase64, tenant_id, compania_fija } = req.body;

    if (!imageBase64) return res.status(400).json({ error: 'Falta la imagen.' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    const promptText = buildPrompt(compania_fija);

    // Mantenemos tus modelos exactos
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
              responseSchema: compania_fija ? schemaSinEmpresa : schemaConEmpresa,
              maxOutputTokens: 100, // Límite de seguridad
              temperature: 0.1 // Máxima precisión
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
    
    // Al usar responseSchema, la respuesta ya viene como un JSON puro sin formato markdown
    const data = JSON.parse(response.text());

    // Mapeamos de vuelta al formato completo para el frontend
    const finalJson = {
      cliente: data.n || "",
      compania: compania_fija || data.e || "Otros",
      telefono: data.p || null
    };

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

    return res.json(finalJson);

  } catch (error) {
    if (error?.status === 503) return res.status(503).json({ error: 'Nuestros servidores de IA están saturados. Reintenta en 3 segundos.' });
    if (error?.message && error.message.includes('API key not valid')) return res.status(500).json({ error: 'Clave de API de Gemini no válida.' });
    if (error?.status === 429 || (error?.message && error.message.includes('quota'))) return res.status(429).json({ error: 'Límite de peticiones a la IA alcanzado.' });
    return res.status(500).json({ error: 'Error interno analizando la etiqueta.' });
  }
};