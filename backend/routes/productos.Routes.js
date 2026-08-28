const router = require('express').Router();
const path   = require('path');
const multer = require('multer');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl   = require('../controllers/productos.Controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `producto_${req.params.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Solo imágenes JPG, PNG o WebP'));
  },
});

router.use(authMiddleware);

router.get('/', checkPermission('ver', 'productos'), ctrl.listarProductos);
router.post('/', checkPermission('crear', 'productos'), ctrl.crearProducto);
router.put('/:id', checkPermission('editar', 'productos'), ctrl.editarProducto);
router.delete('/:id', checkPermission('eliminar', 'productos'), ctrl.eliminarProducto);
router.patch('/:id/activo',  checkPermission('activar',          'productos'), ctrl.toggleActivoProducto);
router.patch('/:id/codigo-barras', checkPermission('editar', 'productos'), ctrl.generarCodigoBarras);
router.patch('/:id/imagen',  checkPermission('gestionar_imagen', 'productos'), upload.single('imagen'), ctrl.subirImagenProducto);
router.delete('/:id/imagen', checkPermission('gestionar_imagen', 'productos'), ctrl.eliminarImagenProducto);

module.exports = router;
