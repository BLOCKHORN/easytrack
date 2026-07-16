'use strict';

const generateMockLeads = (cp, city, centerLat, centerLon) => {
  const shopTemplates = [
    { name: "Papelería e Imprenta Alfil", street: "Calle de Colón, 14" },
    { name: "Kiosco y Prensa Plaza", street: "Avenida de la Constitución, 8" },
    { name: "Estanco y Loterías Nº 12", street: "Gran Vía de Ramón y Cajal, 27" },
    { name: "Floristería Carmen", street: "Carrer del Poeta Querol, 5" },
    { name: "Librería San Martín", street: "Calle de la Paz, 19" },
    { name: "Informática y Copias Plus", street: "Carrer de Xàtiva, 3" },
    { name: "Alimentación y Bazar Express", street: "Plaza de España, 11" },
    { name: "Regalos y Detalles Luna", street: "Calle del Pintor Sorolla, 22" },
  ];

  return shopTemplates.map((template, idx) => {
    // Generate slight random offset around the center (between -0.008 and +0.008)
    const latOffset = (Math.random() - 0.5) * 0.016;
    const lonOffset = (Math.random() - 0.5) * 0.016;

    return {
      id: `mock-pudo-${cp}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      lat: centerLat + latOffset,
      lon: centerLon + lonOffset,
      name: `SEUR Pickup - ${template.name}`,
      operator: 'SEUR Pickup',
      street: template.street,
      city: city || "Valencia",
      phone: null
    };
  });
};

exports.scanRadar = async (req, res) => {
  try {
    const { codigo_postal, poblacion = "", lat, lon } = req.body;

    if (!codigo_postal) {
      return res.status(400).json({ error: 'Se requiere un código postal para el radar de SEUR' });
    }

    try {
      const response = await fetch('https://www.seur.com/miseur/backend/consultaPuntosVenta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          cod_pais: "ES",
          codigo_postal: String(codigo_postal),
          nom_poblacion: String(poblacion).toUpperCase(),
          tipo_tiendas: "",
          idioma: "es",
          tipo_pickup: ""
        })
      });

      if (!response.ok) {
        throw new Error(`SEUR API returned status ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("SEUR API did not return JSON. Likely blocked by WAF/Incapsula.");
      }

      const data = await response.json();

      if (!data.puntos_venta) {
        return res.json({ ok: true, leads: [] });
      }

      const leads = data.puntos_venta.map(p => ({
        id: p.pudoid || Math.random().toString(36),
        lat: p.latitud,
        lon: p.longitud,
        name: p.nom_centro_seur,
        operator: 'SEUR Pickup',
        street: p.nom_corto,
        city: p.nom_poblacion,
        phone: null
      }));

      return res.json({ ok: true, leads });

    } catch (apiError) {
      console.warn("[Radar SEUR] API principal bloqueada o caída. Ejecutando fallback local:", apiError.message);

      // FALLBACK: Usar coordenadas recibidas o geocodificar CP usando Nominatim
      let centerLat = lat !== undefined ? parseFloat(lat) : 39.4699;
      let centerLon = lon !== undefined ? parseFloat(lon) : -0.3762;

      if (lat === undefined || lon === undefined) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${codigo_postal}&country=Spain&format=json&limit=1`, {
            headers: { 'User-Agent': 'Easytrack-Radar-Service/1.0' }
          });
          const geoData = await geoRes.json();
          if (geoData && geoData[0]) {
            centerLat = parseFloat(geoData[0].lat);
            centerLon = parseFloat(geoData[0].lon);
          }
        } catch (geoErr) {
          console.error("[Radar Fallback] Error geocodificando código postal con Nominatim:", geoErr.message);
        }
      }

      const leads = generateMockLeads(codigo_postal, poblacion, centerLat, centerLon);
      return res.json({ ok: true, leads, is_mock: true });
    }

  } catch (error) {
    console.error("[Radar SEUR] Error general:", error);
    return res.status(500).json({ error: 'Error general en el radar de SEUR' });
  }
};