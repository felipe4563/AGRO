const router = require('express').Router();
const ctrl = require('../controllers/promociones.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', checkPermission('ver', 'promociones'), ctrl.listar);
router.get('/:id', checkPermission('ver', 'promociones'), ctrl.obtener);
router.post('/', checkPermission('crear', 'promociones'), ctrl.crear);
router.put('/:id', checkPermission('editar', 'promociones'), ctrl.editar);
router.patch('/:id/activo', checkPermission('activar', 'promociones'), ctrl.toggleActivo);
router.delete('/:id', checkPermission('eliminar', 'promociones'), ctrl.eliminar);

module.exports = router;
