const router = require('express').Router();
const ctrl = require('../controllers/caja.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/cajas',              checkPermission('ver', 'caja'),         ctrl.listarCajas);
router.post('/cajas',             checkPermission('crear', 'caja'),       ctrl.crearCaja);
router.put('/cajas/:id',          checkPermission('editar', 'caja'),      ctrl.editarCaja);
router.patch('/cajas/:id/toggle', checkPermission('activar', 'caja'),     ctrl.toggleCaja);

router.get('/turnos',             checkPermission('ver_historial', 'caja'), ctrl.listarTurnos);
router.get('/turno-activo',       checkPermission('ver', 'caja'),           ctrl.obtenerTurnoActivo);
router.post('/abrir',             checkPermission('abrir', 'caja'),         ctrl.abrirCaja);
router.patch('/:id/cerrar',       checkPermission('cerrar', 'caja'),        ctrl.cerrarCaja);
router.get('/turnos/:id/resumen', checkPermission('ver_historial', 'caja'), ctrl.obtenerResumenTurno);

router.get('/gastos',  checkPermission('ver_gastos', 'caja'),      ctrl.listarGastos);
router.post('/gastos', checkPermission('registrar_gasto', 'caja'), ctrl.registrarGasto);

router.get('/libro', checkPermission('ver_libro', 'caja'), ctrl.obtenerLibroCaja);

module.exports = router;
