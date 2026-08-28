const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/catalogos.Controller');

// Protegemos con token.
router.use(authMiddleware);

// --- CLASIFICACIONES ---
// Listar es público para usuarios logueados (necesario para selects de productos)
router.get('/clasificaciones', ctrl.listarClasificaciones);
// Mutaciones protegidas
router.post('/clasificaciones', checkPermission('crear', 'clasificaciones'), ctrl.crearClasificacion);
router.put('/clasificaciones/:id', checkPermission('editar', 'clasificaciones'), ctrl.editarClasificacion);
router.delete('/clasificaciones/:id', checkPermission('eliminar', 'clasificaciones'), ctrl.eliminarClasificacion);
router.patch('/clasificaciones/:id/activo', checkPermission('editar', 'clasificaciones'), ctrl.toggleActivoClasificacion);

// --- MARCAS ---
router.get('/marcas', ctrl.listarMarcas);
router.post('/marcas', checkPermission('crear', 'marcas'), ctrl.crearMarca);
router.put('/marcas/:id', checkPermission('editar', 'marcas'), ctrl.editarMarca);
router.delete('/marcas/:id', checkPermission('eliminar', 'marcas'), ctrl.eliminarMarca);
router.patch('/marcas/:id/activo', checkPermission('editar', 'marcas'), ctrl.toggleActivoMarca);

// --- UNIDADES ---
router.get('/unidades', ctrl.listarUnidades);
router.post('/unidades', checkPermission('crear', 'unidades'), ctrl.crearUnidad);
router.put('/unidades/:id', checkPermission('editar', 'unidades'), ctrl.editarUnidad);
router.delete('/unidades/:id', checkPermission('eliminar', 'unidades'), ctrl.eliminarUnidad);

module.exports = router;
