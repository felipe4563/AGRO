const router = require('express').Router();
const path   = require('path');
const multer = require('multer');
const ctrl   = require('../controllers/perfil.Controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `usuario_${req.user.id_usuario}_${Date.now()}${ext}`);
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

router.get('/', ctrl.obtener);
router.patch('/password', ctrl.cambiarPassword);
router.patch('/foto', upload.single('foto'), ctrl.subirFoto);

module.exports = router;
