const router = require('express').Router();

const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/usuarios.Controller');

router.use(authMiddleware);

router.get('/', checkPermission('ver', 'usuarios'), ctrl.listarUsuarios);
router.post('/', checkPermission('crear', 'usuarios'), ctrl.crearUsuario);
router.put('/:id', checkPermission('editar', 'usuarios'), ctrl.editarUsuario);
router.delete('/:id', checkPermission('eliminar', 'usuarios'), ctrl.eliminarUsuario);
router.patch('/:id/activo',    checkPermission('activar',          'usuarios'), ctrl.toggleActivoUsuario);
router.patch('/:id/rol',       checkPermission('cambiar_rol',      'usuarios'), ctrl.cambiarRolUsuario);
router.patch('/:id/sucursal',  checkPermission('cambiar_sucursal', 'usuarios'), ctrl.cambiarSucursalUsuario);
router.patch('/:id/password',  checkPermission('resetear_clave',   'usuarios'), ctrl.resetearContrasena);

module.exports = router;

