const router = require('express').Router();
const ctrl = require('../controllers/cobros.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', checkPermission('ver', 'cobros'), ctrl.listar);
router.get('/historial', checkPermission('ver', 'cobros'), ctrl.listarHistorial);
router.get('/pagos/:id_pago', checkPermission('ver', 'cobros'), ctrl.obtenerPago);
router.get('/:id', checkPermission('ver', 'cobros'), ctrl.obtener);
router.post('/:id/pagos', checkPermission('registrar_pago', 'cobros'), ctrl.registrarPago);

module.exports = router;
