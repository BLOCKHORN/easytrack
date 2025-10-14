// backend/src/routes/public.demo.requests.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { supabaseAdmin } = require('../utils/supabaseClient');

// --- Rate limit para evitar spam ---
const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok:false, code:'TOO_MANY', error:'Demasiadas solicitudes. Prueba en unos minutos.' }
});

// --- Regex básicos ---
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^[0-9+()\-\s]{7,}$/;
const cifRe   = /^[A-Za-z0-9\-]{8,15}$/;
const zipRe   = /^[A-Za-z0-9\- ]{3,10}$/;

// --- Validación ---
const schema = z.object({
  full_name:  z.string().trim().min(3, 'Nombre y apellidos demasiado cortos'),
  email:      z.string().trim().toLowerCase().regex(emailRe, 'Email inválido'),
  phone:      z.string().trim().regex(phoneRe, 'Teléfono inválido'),
  company_name: z.string().trim().min(2, 'Nombre de empresa demasiado corto'),
  cif:        z.string().trim().toUpperCase().regex(cifRe, 'CIF inválido'),
  address:    z.string().trim().min(5, 'Dirección demasiado corta'),

  postal_code: z.string().trim().regex(zipRe, 'Código postal inválido'),
  country_code: z.string().trim().length(2, 'Código de país inválido'),
  country_name: z.string().trim().min(2, 'Nombre de país inválido').optional().nullable(),

  province:   z.string().trim().optional().nullable(),
  city:       z.string().trim().optional().nullable(),

  declared_monthly_volume_band: z
    .enum(['lt_200','200_400','400_600','600_800','800_1000','gt_1000'])
    .optional()
    .nullable(),

  tos_accepted: z.boolean().refine(v => v === true, 'Debes aceptar los términos'),

  // extras opcionales (honeypot, tracking)
  website: z.string().trim().optional().nullable(), // honeypot
  source: z.string().trim().max(120).optional().nullable(),

  // del front antiguo: lo ignoramos
  target_table: z.any().optional(),
  password: z.any().optional(),
}).superRefine((data, ctx) => {
  // Reglas condicionales para España
  if (String(data.country_code).toUpperCase() === 'ES') {
    if (!data.province || !data.province.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path:['province'], message:'Provincia requerida en España' });
    }
    if (!data.city || !data.city.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path:['city'], message:'Ciudad requerida en España' });
    }
  }
});

// --- Crear solicitud pública ---
router.post('/demo/requests', createLimiter, async (req, res) => {
  try {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      const issues = parsed.error.issues.map(it => ({
        path: it.path && it.path.length ? it.path.join('.') : '',
        message: it.message || 'Campo inválido',
      }));
      return res.status(400).json({ ok:false, code:'VALIDATION_ERROR', error:'Datos inválidos', issues });
    }

    const data = parsed.data;

    // honeypot
    if (data.website && data.website.trim() !== '') {
      return res.status(400).json({ ok:false, code:'BOT_DETECTED', error:'Validación anti-bot' });
    }

    // normalización mínima → sólo guardamos lo que nos interesa
    const payload = {
      full_name: data.full_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      company_name: data.company_name.trim(),
      cif: data.cif.trim().toUpperCase(),
      address: data.address.trim(),
      postal_code: data.postal_code.trim(),
      country_code: data.country_code.trim().toUpperCase(),
      country_name: (data.country_name || '').trim() || null,
      province: (data.province || '').trim() || null,
      city: (data.city || '').trim() || null,
      declared_monthly_volume_band: data.declared_monthly_volume_band || null,

      status: 'pending',
      reviewed_at: null,
      review_notes: null,

      source: data.source || 'landing_registro_demo',
      tos_accepted: !!data.tos_accepted,
    };

    const { data: inserted, error } = await supabaseAdmin
      .from('demo_requests')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return res.status(409).json({ ok:false, code:'ALREADY_EXISTS', error:'Ya tenemos una solicitud pendiente para este email.' });
      }
      return res.status(400).json({ ok:false, code:'DB_ERROR', error: error.message });
    }

     // <-- NUEVO: notificar al staff
    try {
      const { notifyStaffNewDemo } = require('../utils/notifyStaffNewDemo');
      notifyStaffNewDemo(inserted.id, payload);
    } catch (e) {
      // no bloqueamos la respuesta al cliente por un fallo de email
      console.error('[POST /api/demo/requests] notifyStaffNewDemo error:', e);
    }

    return res.status(201).json({
      ok: true,
      id: inserted.id,
      message: 'Solicitud enviada correctamente. La revisaremos lo antes posible y te contactaremos por email.',
    });
  } catch (e) {
    console.error('[POST /api/demo/requests] Unexpected:', e);
    return res.status(500).json({ ok:false, code:'SERVER_ERROR', error:'Error interno' });
  }
});

module.exports = router;
