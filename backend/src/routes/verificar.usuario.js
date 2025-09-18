// backend/src/routes/verificar.usuario.js
const express = require('express')
const router = express.Router()
const { supabase } = require('../utils/supabaseClient')
const fetch = require('node-fetch')

router.post('/', async (req, res) => {
  const { access_token } = req.body
  if (!access_token) return res.status(400).json({ error: 'Falta token de acceso' })

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })

    const userData = await response.json()
    if (!response.ok || !userData?.email) {
      console.error('❌ Error al obtener datos del usuario:', userData)
      return res.status(401).json({ error: 'Token inválido o expirado' })
    }

    const email = String(userData.email).toLowerCase().trim()
    const nombre_empresa = userData.user_metadata?.nombre_empresa || null

    // Buscar tenant por email (case-insensitive)
    const { data: existente, error: errorExist } = await supabase
      .from('tenants')
      .select('id, nombre_empresa')
      .ilike('email', email)
      .maybeSingle()

    if (errorExist) {
      console.error('❌ Error consultando tabla tenants:', errorExist)
      return res.status(500).json({ error: 'Error interno al consultar usuario' })
    }

    if (!existente) {
      // Insertar tenant (slug se rellena con el trigger que ya tienes)
      const { error: insertError } = await supabase
        .from('tenants')
        .insert([{ email, nombre_empresa }])

      if (insertError) {
        if (insertError.code === '23505') {
          console.warn('⚠️ Usuario ya existía aunque no lo detectamos antes (probable por casing).')
          return res.status(200).json({ ok: true, nuevo: false })
        }
        console.error('❌ Error insertando nuevo tenant:', insertError)
        return res.status(500).json({ error: 'No se pudo registrar el usuario' })
      }

      return res.status(200).json({ ok: true, nuevo: true })
    }

    // Si existe pero sin nombre_empresa, lo rellenamos una vez
    if (!existente.nombre_empresa && nombre_empresa) {
      await supabase.from('tenants').update({ nombre_empresa }).ilike('email', email)
    }

    return res.status(200).json({ ok: true, nuevo: false })
  } catch (err) {
    console.error('❌ Error inesperado en verificación:', err)
    return res.status(500).json({ error: 'Error inesperado del servidor' })
  }
})

module.exports = router
