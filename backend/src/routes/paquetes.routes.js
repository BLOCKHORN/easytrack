// src/routes/paquetes.routes.js
const { Router } = require('express');
const {
  listarPaquetes,
  contarPaquetes,      // ← NUEVO
  crearPaquete,
  entregarPaquete,
  editarPaquete,
  eliminarPaquete,
} = require('../controllers/paquetes.controller');

const router = Router();

/**
 * Listado:
 * - Compat: GET /paquetes/listar
 * - Canon:  GET /paquetes           (mismo handler)
 *   Query params opcionales:
 *     tenantId, limit, offset, all=1, estado, compania, ubicacion, search, order, dir
 */
router.get('/', listarPaquetes);
router.get('/listar', listarPaquetes); // compat

/**
 * Conteo exacto para KPI:
 * - GET /paquetes/count
 *   Query params opcionales (mismos filtros que el listado):
 *     tenantId, estado, compania, ubicacion, search
 */
router.get('/count', contarPaquetes);

// Crear
router.post('/crear', crearPaquete);

// Entregar (PATCH semántico)
router.patch('/entregar/:id', entregarPaquete);

// Editar (PUT idempotente)
router.put('/:id', editarPaquete);

// Eliminar
router.delete('/:id', eliminarPaquete);

module.exports = router;
