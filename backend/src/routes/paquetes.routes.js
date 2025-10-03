// src/routes/paquetes.routes.js
const { Router } = require('express');
const {
  listarPaquetes,
  crearPaquete,
  entregarPaquete,
  editarPaquete,
  eliminarPaquete,
} = require('../controllers/paquetes.controller');

const router = Router();

router.get('/listar', listarPaquetes);
router.post('/crear', crearPaquete);
router.patch('/entregar/:id', entregarPaquete);
router.put('/:id', editarPaquete);
router.delete('/:id', eliminarPaquete);

module.exports = router;
