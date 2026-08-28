let tokenCache = null; // { token, exp } — exp en milisegundos (Date.now())

function baseUrl() {
  return process.env.PERSONAS_API_BASE_URL || 'https://perapi.codewave.com.bo';
}

async function login() {
  const res = await fetch(`${baseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.PERSONAS_API_USER,
      password: process.env.PERSONAS_API_PASSWORD,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Error al autenticar con la API de Personas (HTTP ${res.status})`);
  const data = await res.json();
  tokenCache = { token: data.token, exp: new Date(data.expiraEn).getTime() };
  return tokenCache.token;
}

async function obtenerToken() {
  const ahora = Date.now();
  if (tokenCache && tokenCache.exp > ahora + 60000) {
    return tokenCache.token;
  }
  return login();
}

async function consultarPersona(codigo, token) {
  return fetch(`${baseUrl()}/personas/${encodeURIComponent(codigo)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
}

async function buscarPorCodigo(codigo) {
  const token = await obtenerToken();
  let res = await consultarPersona(codigo, token);

  if (res.status === 401) {
    const tokenNuevo = await login();
    res = await consultarPersona(codigo, tokenNuevo);
  }

  if (res.status === 404) {
    const err = new Error('Persona no encontrada');
    err.noEncontrado = true;
    throw err;
  }
  if (!res.ok) throw new Error(`Error al consultar la API de Personas (HTTP ${res.status})`);

  return res.json();
}

module.exports = { buscarPorCodigo };
