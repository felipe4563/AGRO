const router = require('express').Router();
const ctrl = require('../controllers/clientes.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', checkPermission('ver', 'clientes'), ctrl.listar);
router.get('/buscar-persona/:codigo', checkPermission('crear', 'clientes'), ctrl.buscarPersona);
router.get('/:id', checkPermission('ver', 'clientes'), ctrl.obtener);
router.post('/', checkPermission('crear', 'clientes'), ctrl.crear);
router.put('/:id', checkPermission('editar', 'clientes'), ctrl.editar);
router.delete('/:id', checkPermission('eliminar', 'clientes'), ctrl.eliminar);
router.patch('/:id/activo',    checkPermission('activar',       'clientes'), ctrl.toggleActivo);
router.get('/:id/historial',   checkPermission('ver_historial', 'clientes'), ctrl.historialCliente);

module.exports = router;
