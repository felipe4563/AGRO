const router = require('express').Router();
const ctrl = require('../controllers/almacen.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Lotes
router.get('/lotes',            checkPermission('ver', 'almacen'),           ctrl.listarLotes);
router.get('/lotes/:id',        checkPermission('ver', 'almacen'),           ctrl.obtenerLote);
router.post('/lotes',           checkPermission('ingresar', 'almacen'),      ctrl.crearLote);
router.post('/lotes/:id/ajuste', checkPermission('ajustar', 'almacen'),     ctrl.ajusteInventario);
router.patch('/lotes/:id/baja', checkPermission('dar_baja_lote', 'almacen'), ctrl.darBajaLote);

// Traslados
router.get('/traslados',                    checkPermission('trasladar', 'almacen'), ctrl.listarTraslados);
router.post('/traslados',                   checkPermission('trasladar', 'almacen'), ctrl.crearTraslado);
router.patch('/traslados/:id/confirmar',    checkPermission('trasladar', 'almacen'), ctrl.confirmarTraslado);
router.patch('/traslados/:id/cancelar',     checkPermission('trasladar', 'almacen'), ctrl.cancelarTraslado);

// Alertas
router.get('/alertas', checkPermission('ver', 'almacen'), ctrl.listarAlertas);

// Auxiliares (para formularios)
router.get('/aux/productos',   checkPermission('ingresar', 'almacen'),  ctrl.listarProductosActivos);
router.get('/aux/sucursales',  checkPermission('trasladar', 'almacen'), ctrl.listarSucursalesActivas);

module.exports = router;
