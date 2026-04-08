'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const ctrl = require('../controllers/support.controller');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Todas requieren auth del usuario (tu requireAuth es middleware directo)
router.use(requireAuth);

// Tickets
router.get('/tickets', ctrl.listTickets);
router.post('/tickets', ctrl.createTicket);
router.get('/tickets/:id', ctrl.getTicket);
router.patch('/tickets/:id/status', ctrl.updateStatus);

// Mensajes
router.get('/tickets/:id/messages', ctrl.listMessages);
router.post('/tickets/:id/messages', ctrl.postMessage);

// Valoración
router.post('/tickets/:id/rating', ctrl.rateTicket);

// Subidas (adjuntos)
router.post('/uploads', upload.array('files', 6), ctrl.uploadFiles);

module.exports = router;
