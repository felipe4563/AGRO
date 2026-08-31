const router = require('express').Router();
const ctrl = require('../controllers/cuentasPagar.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', checkPermission('ver', 'cuentas_pagar'), ctrl.listar);
router.get('/historial', checkPermission('ver', 'cuentas_pagar'), ctrl.listarHistorial);
router.get('/pagos/:id_pago', checkPermission('ver', 'cuentas_pagar'), ctrl.obtenerPago);
router.get('/:id', checkPermission('ver', 'cuentas_pagar'), ctrl.obtener);
router.post('/:id/pagos', checkPermission('registrar_pago', 'cuentas_pagar'), ctrl.registrarPago);

module.exports = router;
