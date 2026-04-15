'use strict';

exports.scanRadar = async (req, res) => {
  try {
    const { codigo_postal, poblacion = "" } = req.body;

    if (!codigo_postal) {
      return res.status(400).json({ error: 'Se requiere un código postal para el radar de SEUR' });
    }

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
      phone: null // SEUR no suele exponer el teléfono directo en esta API
    }));

    return res.json({ ok: true, leads });

  } catch (error) {
    console.error("[Radar SEUR] Error:", error);
    return res.status(500).json({ error: 'Error interceptando red de SEUR' });
  }
};