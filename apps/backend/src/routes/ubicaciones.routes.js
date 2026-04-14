'use strict';

const express = require('express');
const router = express.Router();

const maybeCtrl = require('../controllers/ubicaciones.controller');
const ctrl = (maybeCtrl && (maybeCtrl.default || maybeCtrl)) || {};

const obtenerEstructura = typeof ctrl.obtenerEstructura === 'function' ? ctrl.obtenerEstructura : null;
const upsertUbicaciones = typeof ctrl.upsertUbicaciones === 'function' ? ctrl.upsertUbicaciones : null;
const patchMeta         = typeof ctrl.patchMeta         === 'function' ? ctrl.patchMeta         : null;
const guardarCarriers   = typeof ctrl.guardarCarriers   === 'function' ? ctrl.guardarCarriers   : null;

if (!obtenerEstructura || !upsertUbicaciones || !patchMeta || !guardarCarriers) {
  throw new Error('[ubicaciones.routes] Controlador inválido: faltan exportaciones requeridas.');
}

router.get('/', obtenerEstructura);
router.get('/estructura', obtenerEstructura);

router.post('/', upsertUbicaciones);
router.post('/estructura', upsertUbicaciones);

router.patch('/meta', patchMeta);

router.post('/carriers', guardarCarriers);

module.exports = router;