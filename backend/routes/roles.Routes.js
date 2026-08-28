const router = require('express').Router();
// ← Unificado con el resto de rutas
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/roles.Controller');

router.use(authMiddleware);

router.get('/permisos',       checkPermission('ver',                'roles'), ctrl.listarPermisos);
router.get('/',               checkPermission('ver',                'roles'), ctrl.listarRoles);
router.get('/:id',            checkPermission('ver',                'roles'), ctrl.obtenerRol);
router.post('/',              checkPermission('crear',              'roles'), ctrl.crearRol);
router.put('/:id',            checkPermission('editar',             'roles'), ctrl.editarRol);
router.delete('/:id',         checkPermission('eliminar',           'roles'), ctrl.eliminarRol);
router.put('/:id/permisos',   checkPermission('gestionar_permisos', 'roles'), ctrl.actualizarPermisosRol);

module.exports = router;