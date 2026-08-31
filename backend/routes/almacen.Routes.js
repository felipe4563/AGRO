const router = require('express').Router();
const ctrl = require('../controllers/almacen.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Lotes
router.get('/lotes',            checkPermission('ver', 'almacen'),           ctrl.listarLotes);
router.get('/lotes/:id',        checkPermission('ver_movimientos', 'almacen'), ctrl.obtenerLote);
router.post('/lotes',           checkPermission('ingresar', 'almacen'),      ctrl.crearLote);
router.post('/lotes/:id/ajuste', checkPermission('ajustar', 'almacen'),     ctrl.ajusteInventario);
router.patch('/lotes/:id/baja', checkPermission('dar_baja_lote', 'almacen'), ctrl.darBajaLote);
router.post('/lotes/:id/generar-codigo-barras', checkPermission('ver', 'almacen'), ctrl.generarCodigoBarrasLote);

// Traslados (catálogo propio "traslados.*", separado de "almacen.trasladar")
router.get('/traslados',                    checkPermission('ver', 'traslados'),       ctrl.listarTraslados);
router.post('/traslados',                   checkPermission('crear', 'traslados'),     ctrl.crearTraslado);
router.patch('/traslados/:id/confirmar',    checkPermission('confirmar', 'traslados'), ctrl.confirmarTraslado);
router.patch('/traslados/:id/cancelar',     checkPermission('cancelar', 'traslados'),  ctrl.cancelarTraslado);

// Alertas
router.get('/alertas', checkPermission('ver', 'almacen'), ctrl.listarAlertas);

// Auxiliares (para formularios)
router.get('/aux/productos',   checkPermission('ingresar', 'almacen'), ctrl.listarProductosActivos);
router.get('/aux/sucursales',  checkPermission('crear', 'traslados'),  ctrl.listarSucursalesActivas);

module.exports = router;
