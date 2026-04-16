'use strict';

const { Router } = require('express');
const router = Router();
const paquetesController = require('../controllers/paquetes.controller');

// Listado y conteo de KPIs
router.get('/', paquetesController.listarPaquetes);
router.get('/listar', paquetesController.listarPaquetes); // Endpoint por compatibilidad
router.get('/count', paquetesController.contarPaquetes);

// CRUD
router.post('/crear', paquetesController.crearPaquete);
router.patch('/entregar/:id', paquetesController.entregarPaquete);
router.put('/:id', paquetesController.editarPaquete);
router.delete('/:id', paquetesController.eliminarPaquete);

module.exports = router;