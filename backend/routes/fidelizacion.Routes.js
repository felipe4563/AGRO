const router = require('express').Router();
const ctrl = require('../controllers/fidelizacion.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/configuracion', checkPermission('ver', 'fidelizacion'), ctrl.obtenerConfiguracion);
router.put('/configuracion', checkPermission('configurar', 'fidelizacion'), ctrl.actualizarConfiguracion);

router.get('/recompensas', checkPermission('ver', 'fidelizacion'), ctrl.listarRecompensas);
router.post('/recompensas', checkPermission('gestionar_recompensas', 'fidelizacion'), ctrl.crearRecompensa);
router.put('/recompensas/:id', checkPermission('gestionar_recompensas', 'fidelizacion'), ctrl.editarRecompensa);
router.patch('/recompensas/:id/activo', checkPermission('gestionar_recompensas', 'fidelizacion'), ctrl.toggleActivoRecompensa);
router.delete('/recompensas/:id', checkPermission('gestionar_recompensas', 'fidelizacion'), ctrl.eliminarRecompensa);

router.get('/clientes/:id', checkPermission('ver', 'fidelizacion'), ctrl.obtenerCliente);
router.post('/canjear', checkPermission('canjear', 'fidelizacion'), ctrl.canjear);

module.exports = router;
