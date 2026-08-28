require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app     = require('../app');

// Credenciales del usuario admin para pruebas (configurar en .env o exportar como var de entorno)
const TEST_USER     = process.env.TEST_USER     || 'admin@agropecuaria.bo';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

let _token = null;

/**
 * Realiza login y devuelve el token JWT.
 * Cachea el token para reutilizarlo en toda la suite.
 */
async function getToken() {
  if (_token) return _token;

  const res = await request(app)
    .post('/api/auth/login')
    .send({ identificador: TEST_USER, contrasena: TEST_PASSWORD });

  if (res.status !== 200 || !res.body.token) {
    throw new Error(
      `No se pudo obtener token de prueba. Status: ${res.status}. ` +
      `Configura TEST_USER y TEST_PASSWORD en el archivo .env con credenciales de admin válidas.\n` +
      `Respuesta: ${JSON.stringify(res.body)}`
    );
  }

  _token = res.body.token;
  return _token;
}

/**
 * Encabezado Authorization listo para usar en supertest.
 */
async function authHeader() {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
}

module.exports = { app, request, getToken, authHeader };
