const db = require('../config/db');
const codepay = require('../services/codepay.service');

const codepayWebhook = async (req, res) => {
  const firma = req.headers['x-codepay-signature'];

  if (!codepay.verificarFirmaWebhook(req.rawBody, firma)) {
    console.error('[webhooks.codepay] Firma ausente o inválida');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const { tx_id, status } = req.body ?? {};
  if (!tx_id || !status) {
    return res.status(400).json({ error: 'Payload incompleto' });
  }

  const estado = status === 'completed' ? 'COMPLETED' : status === 'failed' ? 'FAILED' : null;
  if (!estado) {
    // Otros estados (ej. 'pending') no requieren actualizar nada.
    return res.status(200).json({ ok: true });
  }

  try {
    await db.promise().query(
      "UPDATE codepay_transaccion SET estado = ? WHERE tx_id = ? AND estado = 'PENDING'",
      [estado, tx_id]
    );
  } catch (err) {
    // Se responde 2xx igual: la firma ya fue verificada, y si esto falla el
    // respaldo por polling en estadoQrCodepay termina de confirmar el pago.
    console.error('[webhooks.codepay] Error al actualizar codepay_transaccion', err);
  }

  return res.status(200).json({ ok: true });
};

module.exports = { codepayWebhook };
