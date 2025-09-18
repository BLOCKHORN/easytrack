// backend/src/routes/paquetes.routes.js
const express = require('express')
// mergeParams:true => recoge params del path padre (/:tenantSlug/...)
const router = express.Router({ mergeParams: true })
const requireAuth = require('../middlewares/requireAuth')

const {
  crearPaquete,
  listarPaquetes,
  eliminarPaquete,
  entregarPaquete,
  editarPaquete
} = require('../controllers/paquetes.controller')

// Todas protegidas. Si existe req.params.tenantSlug, requireAuth ya lo valida.
router.post('/crear', requireAuth, crearPaquete)
router.get('/listar', requireAuth, listarPaquetes)
router.delete('/:id', requireAuth, eliminarPaquete)
router.patch('/entregar/:id', requireAuth, entregarPaquete)
router.put('/:id', requireAuth, editarPaquete)

module.exports = router
