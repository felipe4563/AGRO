const router = require('express').Router();
const ctrl = require('../controllers/compras.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/sucursales-destino', checkPermission('crear', 'compras'), ctrl.listarSucursalesDestino);
router.get('/', checkPermission('ver', 'compras'), ctrl.listar);
router.get('/:id', checkPermission('ver', 'compras'), ctrl.obtener);
router.post('/', checkPermission('crear', 'compras'), ctrl.crear);
router.post('/:id/confirmar', checkPermission('confirmar', 'compras'), ctrl.confirmar);
router.patch('/:id/anular', checkPermission('anular', 'compras'), ctrl.anular);

module.exports = router;
