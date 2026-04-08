'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const requireAuth = require('../middlewares/requireAuth'); // si ya lo tienes

// Aplica autenticación si usas la misma que para otras rutas privadas
router.use(requireAuth);

/* -------------------- LISTAR TICKETS -------------------- */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('uuid_cliente', req.user.id)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* -------------------- OBTENER TICKET -------------------- */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('tickets')
      .select('*, mensajes(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* -------------------- CREAR NUEVO TICKET -------------------- */
router.post('/', async (req, res) => {
  try {
    const { tipo, descripcion } = req.body;
    const nuevo = {
      uuid_cliente: req.user.id,
      tipo,
      descripcion,
      estado: 'pendiente',
      fecha_creacion: new Date().toISOString()
    };
    const { data, error } = await supabase.from('tickets').insert(nuevo).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* -------------------- LISTAR MENSAJES -------------------- */
router.get('/:id/mensajes', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('mensajes_tickets')
      .select('*')
      .eq('id_ticket', id)
      .order('fecha', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* -------------------- ENVIAR MENSAJE -------------------- */
router.post('/:id/mensajes', async (req, res) => {
  try {
    const { id } = req.params;
    const { texto } = req.body;
    const msg = {
      id_ticket: id,
      uuid_autor: req.user.id,
      texto,
      fecha: new Date().toISOString()
    };
    const { data, error } = await supabase.from('mensajes_tickets').insert(msg).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* -------------------- CAMBIAR ESTADO -------------------- */
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const { data, error } = await supabase
      .from('tickets')
      .update({ estado })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* -------------------- VALORAR TICKET -------------------- */
router.post('/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { valoracion } = req.body;
    const { data, error } = await supabase
      .from('tickets')
      .update({ valoracion })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
