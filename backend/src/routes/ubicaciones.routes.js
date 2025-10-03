// CommonJS
const express = require('express');
const router = express.Router();

// Carga segura del controller (soporta module.exports y export default)
const maybeCtrl = require('../controllers/ubicaciones.controller');
const ctrl = (maybeCtrl && (maybeCtrl.default || maybeCtrl)) || {};

// Extrae handlers asegurando que son funciones
const listUbicaciones  = typeof ctrl.listUbicaciones  === 'function' ? ctrl.listUbicaciones  : null;
const upsertUbicaciones = typeof ctrl.upsertUbicaciones === 'function' ? ctrl.upsertUbicaciones : null;
const patchMeta        = typeof ctrl.patchMeta        === 'function' ? ctrl.patchMeta        : null;

// Si algo no es función, lanza un error descriptivo (evita el críptico "argument handler must be a function")
if (!listUbicaciones || !upsertUbicaciones || !patchMeta) {
  throw new Error(
    '[ubicaciones.routes] Controlador inválido. ' +
    'Asegúrate de exportar { listUbicaciones, upsertUbicaciones, patchMeta } ' +
    'con module.exports = { ... } o exports.* en src/controllers/ubicaciones.controller.js'
  );
}

// Rutas
router.get('/', listUbicaciones);     // GET ubicaciones + meta
router.post('/', upsertUbicaciones);  // POST full (meta + ubicaciones)
router.patch('/meta', patchMeta);     // PATCH solo meta

module.exports = router;
