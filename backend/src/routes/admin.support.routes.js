'use strict';
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/support.controller');
const requireSuperadmin = require('../middlewares/requireSuperadmin'); // ← usa este

/* ========== LISTAR TICKETS (global) ========== */
router.get('/support/tickets', requireSuperadmin(), ctrl.adminListTickets);

/* ========== OBTENER TICKET (global) ========== */
router.get('/support/tickets/:id', requireSuperadmin(), ctrl.adminGetTicket);

/* ========== MENSAJES (global) ========== */
router.get('/support/tickets/:id/messages', requireSuperadmin(), ctrl.adminListMessages);
router.post('/support/tickets/:id/messages', requireSuperadmin(), ctrl.adminPostMessage);

/* ========== ESTADO (global) ========== */
router.patch('/support/tickets/:id/status', requireSuperadmin({ minRole: 'support' }), ctrl.adminUpdateStatus);

/* ========== (OPCIONAL) ASIGNACIÓN ========== 
   Nota: tu esquema no tiene columnas de asignación en support_tickets,
   así que devolvemos 501 para que el front no falle si llama. */
router.patch('/support/tickets/:id/assign', requireSuperadmin({ minRole: 'admin' }), ctrl.adminAssignAgent);

/* ========== NUEVO: CONTADORES / BUBBLE ========== */
/** Último timestamp global de mensajes (para el bubble) */
router.get('/support/latest-ts', requireSuperadmin(), ctrl.adminSupportLatestTs);

/** Contadores globales: no leídos + último timestamp */
router.get('/support/counters', requireSuperadmin(), ctrl.adminSupportCounters);

module.exports = router;
