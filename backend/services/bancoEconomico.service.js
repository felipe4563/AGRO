const jwt = require('jsonwebtoken');

let tokenCache = null; // { token, exp }

function baseUrl() {
  return process.env.BANCO_ECONOMICO_BASE_URL || 'https://apimktdesa.baneco.com.bo/ApiGateway';
}

async function encriptar(texto) {
  const url = `${baseUrl()}/api/authentication/encrypt?text=${encodeURIComponent(texto)}&aesKey=${encodeURIComponent(process.env.BANCO_ECONOMICO_AES_KEY)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Error al cifrar datos con el Banco Económico (HTTP ${res.status})`);
  const raw = (await res.text()).trim();
  // El banco devuelve el texto cifrado como string JSON (entre comillas dobles);
  // hay que quitarlas o esas comillas terminan viajando como parte del valor "cifrado".
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function obtenerToken() {
  const ahora = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp > ahora + 60) {
    return tokenCache.token;
  }

  const passwordCifrado = await encriptar(process.env.BANCO_ECONOMICO_PASSWORD);

  const res = await fetch(`${baseUrl()}/api/authentication/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: process.env.BANCO_ECONOMICO_USER, password: passwordCifrado }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Error al autenticar con el Banco Económico (HTTP ${res.status})`);
  const data = await res.json();
  if (data.responseCode !== 0) throw new Error(data.message || 'Autenticación rechazada por el Banco Económico');

  const decoded = jwt.decode(data.token) || {};
  tokenCache = { token: data.token, exp: decoded.exp || ahora + 300 };
  return tokenCache.token;
}

async function llamadaAutenticada(path, opciones = {}) {
  const token = await obtenerToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opciones.headers || {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  return res;
}

async function generarQR({ transactionId, monto, moneda, descripcion, dueDate, branchCode }) {
  await obtenerToken();
  const accountCredit = await encriptar(process.env.BANCO_ECONOMICO_ACCOUNT_CREDIT);

  const body = {
    transactionId,
    accountCredit,
    currency: moneda,
    amount: monto,
    description: descripcion,
    dueDate,
    singleUse: true,
    modifyAmount: false,
  };
  if (branchCode) body.branchCode = branchCode;

  const res = await llamadaAutenticada('/api/qrsimple/generateQR', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error al generar el QR (HTTP ${res.status})`);
  const data = await res.json();
  if (data.responseCode !== 0) throw new Error(data.message || 'El Banco Económico rechazó la generación del QR');

  return { qrId: data.qrId, qrImage: data.qrImage };
}

async function estadoQR(qrId) {
  const res = await llamadaAutenticada(`/api/qrsimple/v2/statusQR/${encodeURIComponent(qrId)}`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error(`Error al consultar el estado del QR (HTTP ${res.status})`);
  const data = await res.json();
  const codigo = data.statusQRCode ?? data.statusQrCode;
  return { pagado: codigo === 1, payment: data.payment || null };
}

async function anularQR(qrId) {
  try {
    const res = await llamadaAutenticada('/api/qrsimple/cancelQR', {
      method: 'DELETE',
      body: JSON.stringify({ qrId }),
    });
    if (!res.ok) {
      console.error(`[bancoEconomico.anularQR] HTTP ${res.status} al anular QR ${qrId}`);
    }
  } catch (err) {
    console.error('[bancoEconomico.anularQR]', err.message);
  }
}

module.exports = { encriptar, generarQR, estadoQR, anularQR };
