const router = require('express').Router();
const ctrl   = require('../controllers/backup.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Solo usuarios con permiso de ver roles (administradores)
const soloAdmin = checkPermission('ver', 'roles');

router.get('/',                    soloAdmin, ctrl.listar);
router.post('/generar',            soloAdmin, ctrl.generar);
router.get('/descargar/:filename', soloAdmin, ctrl.descargar);
router.delete('/:filename',        soloAdmin, ctrl.eliminar);

module.exports = router;
