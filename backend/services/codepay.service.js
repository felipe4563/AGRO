const crypto = require('crypto');

function baseUrl() {
  return process.env.CODEPAY_API_URL || 'https://payapi.codewave.com.bo/api';
}

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signPaymentToken(payload, secretKey) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = base64url(Buffer.from(JSON.stringify(header)));
  const p = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = base64url(crypto.createHmac('sha256', secretKey).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

async function generarQR({ orderId, amount, descripcion, currency = 'BOB', expiraEnMinutos = 30 }) {
  const publicKey = process.env.CODEPAY_PUBLIC_KEY;
  const secretKey = process.env.CODEPAY_SECRET_KEY;
  if (!publicKey || !secretKey) throw new Error('CodePay no está configurado (faltan credenciales)');

  const payload = {
    app_key: publicKey,
    order_id: orderId,
    amount,
    currency,
    description: descripcion,
    expires_at: new Date(Date.now() + expiraEnMinutos * 60_000).toISOString(),
  };
  const token = signPaymentToken(payload, secretKey);

  const res = await fetch(`${baseUrl()}/v1/payments/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, pk: publicKey }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`CodePay rechazó la generación del QR (HTTP ${res.status})`);
  const data = await res.json();

  return {
    tx_id: data.tx_id,
    qr_code: data.qr_code,
    net_amount: data.net_amount,
    commission_amount: data.commission_amount,
    amount: data.amount,
    expires_at: data.expires_at,
  };
}

async function consultarEstado(txId) {
  const res = await fetch(`${baseUrl()}/checkout/status/${encodeURIComponent(txId)}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Error al consultar el estado del pago (HTTP ${res.status})`);
  const data = await res.json();
  return data.status; // 'pending' | 'completed' | 'failed'
}

// La verificación exacta del algoritmo de firma del webhook (header
// X-Codepay-Signature) no está confirmada contra la documentación real de
// CodePay — se implementa el patrón estándar HMAC-SHA256 del body crudo con
// notification_secret. Si CodePay usa un esquema distinto, esta función
// rechazará todos los webhooks (fail-safe: el pago sigue confirmándose por
// el respaldo de polling a consultarEstado, no se rompe el flujo).
function verificarFirmaWebhook(rawBody, firmaRecibida) {
  const secret = process.env.CODEPAY_NOTIFICATION_SECRET;
  if (!secret || !firmaRecibida) return false;

  const firmaEsperada = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const bufEsperada = Buffer.from(firmaEsperada, 'utf8');
  const bufRecibida = Buffer.from(String(firmaRecibida), 'utf8');
  if (bufEsperada.length !== bufRecibida.length) return false;
  return crypto.timingSafeEqual(bufEsperada, bufRecibida);
}

module.exports = { signPaymentToken, generarQR, consultarEstado, verificarFirmaWebhook };
