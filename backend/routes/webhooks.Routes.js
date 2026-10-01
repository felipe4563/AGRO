const router = require('express').Router();
const ctrl = require('../controllers/webhooks.Controller');

// Sin authMiddleware: estas rutas las llama el proveedor externo, no un
// usuario logueado. La autenticidad se valida por firma HMAC dentro de cada
// handler (ver codepay.service.verificarFirmaWebhook).
router.post('/codepay', ctrl.codepayWebhook);

module.exports = router;
