const router = require('express').Router();
const ctrl = require('../controllers/proveedores.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', checkPermission('ver', 'proveedores'), ctrl.listar);
router.get('/:id', checkPermission('ver', 'proveedores'), ctrl.obtener);
router.post('/', checkPermission('crear', 'proveedores'), ctrl.crear);
router.put('/:id', checkPermission('editar', 'proveedores'), ctrl.editar);
router.delete('/:id', checkPermission('eliminar', 'proveedores'), ctrl.eliminar);
router.patch('/:id/activo', checkPermission('activar', 'proveedores'), ctrl.toggleActivo);

module.exports = router;
