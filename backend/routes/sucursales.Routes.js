const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/sucursales.Controller');

router.use(authMiddleware);

router.get('/', checkPermission('ver', 'sucursales'), ctrl.listarSucursales);
router.post('/', checkPermission('crear', 'sucursales'), ctrl.crearSucursal);
router.put('/:id', checkPermission('editar', 'sucursales'), ctrl.editarSucursal);
router.delete('/:id', checkPermission('eliminar', 'sucursales'), ctrl.eliminarSucursal);
router.patch('/:id/activo', checkPermission('activar', 'sucursales'), ctrl.toggleActivoSucursal);

module.exports = router;
