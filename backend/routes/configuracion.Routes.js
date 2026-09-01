const router = require('express').Router();
const path   = require('path');
const multer = require('multer');
const ctrl   = require('../controllers/configuracion.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_negocio_${Date.now()}${ext}`);
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

// Público: el Login todavía no tiene sesión y necesita el logo/nombre de la empresa.
router.get('/', ctrl.obtener);

// Público: el manifest/íconos de la PWA se piden al instalar, sin sesión.
router.get('/pwa/manifest.webmanifest', ctrl.obtenerManifestPWA);
router.get('/pwa/icono/:size', ctrl.obtenerIconoPWA);

// El resto requiere sesión + permiso de edición.
router.put('/', authMiddleware, checkPermission('editar', 'configuracion'), ctrl.actualizar);
router.patch('/logo', authMiddleware, checkPermission('editar', 'configuracion'), upload.single('logo'), ctrl.subirLogo);
router.delete('/logo', authMiddleware, checkPermission('editar', 'configuracion'), ctrl.eliminarLogo);

module.exports = router;
