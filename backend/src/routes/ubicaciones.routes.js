'use strict';

const express = require('express');
const router = express.Router();

const maybeCtrl = require('../controllers/ubicaciones.controller');
const ctrl = (maybeCtrl && (maybeCtrl.default || maybeCtrl)) || {};

const listUbicaciones   = typeof ctrl.listUbicaciones   === 'function' ? ctrl.listUbicaciones   : null;
const upsertUbicaciones = typeof ctrl.upsertUbicaciones === 'function' ? ctrl.upsertUbicaciones : null;
const patchMeta         = typeof ctrl.patchMeta         === 'function' ? ctrl.patchMeta         : null;

if (!listUbicaciones || !upsertUbicaciones || !patchMeta) {
  throw new Error('[ubicaciones.routes] Controlador inválido: exporta { listUbicaciones, upsertUbicaciones, patchMeta }');
}

router.use((req, _res, next) => {
  const hasAuth = !!(req.headers.authorization || '').startsWith('Bearer ');
  console.log(`[ubicaciones.routes] ${req.method} ${req.originalUrl} hasAuth=${hasAuth}`);
  next();
});

router.get('/', listUbicaciones);
router.post('/', upsertUbicaciones);
router.patch('/meta', patchMeta);

module.exports = router;
