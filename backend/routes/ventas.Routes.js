const router = require('express').Router();
const ctrl = require('../controllers/ventas.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/pos-productos', checkPermission('crear', 'ventas'), ctrl.listarProductosPOS);
router.get('/pos-productos/:id/lotes', checkPermission('crear', 'ventas'), ctrl.listarLotesProductoPOS);

router.get('/', checkPermission('ver', 'ventas'), ctrl.listar);
router.get('/:id', checkPermission('ver', 'ventas'), ctrl.obtener);
router.post('/', checkPermission('crear', 'ventas'), ctrl.crear);
router.patch('/:id/anular', checkPermission('anular', 'ventas'), ctrl.anular);

router.post('/qr-banco/generar', checkPermission('crear', 'ventas'), ctrl.generarQrBanco);
router.get('/qr-banco/estado/:qrId', checkPermission('crear', 'ventas'), ctrl.estadoQrBanco);
router.delete('/qr-banco/:qrId', checkPermission('crear', 'ventas'), ctrl.anularQrBanco);

module.exports = router;
