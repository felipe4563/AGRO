const router = require('express').Router();
const path   = require('path');
const multer = require('multer');
const ctrl = require('../controllers/combos.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `combo_${req.params.id}_${Date.now()}${ext}`);
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

router.get('/pos', checkPermission('crear', 'ventas'), ctrl.listarParaPOS);

router.get('/', checkPermission('ver', 'combos'), ctrl.listar);
router.get('/:id', checkPermission('ver', 'combos'), ctrl.obtener);
router.post('/', checkPermission('crear', 'combos'), ctrl.crear);
router.put('/:id', checkPermission('editar', 'combos'), ctrl.editar);
router.patch('/:id/activo', checkPermission('activar', 'combos'), ctrl.toggleActivo);
router.patch('/:id/imagen', checkPermission('editar', 'combos'), upload.single('imagen'), ctrl.subirImagenCombo);
router.delete('/:id/imagen', checkPermission('editar', 'combos'), ctrl.eliminarImagenCombo);
router.delete('/:id', checkPermission('eliminar', 'combos'), ctrl.eliminar);

module.exports = router;
