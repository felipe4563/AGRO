// Hace login contra la API real y devuelve { token, usuario } tal cual los
// guarda el frontend en localStorage (ver frontend/src/contexts/AuthContext.jsx).
// motor.cjs los inyecta antes de cada grabación — así nunca se escribe la
// contraseña real en pantalla (el video 1 solo simula el tipeo con una de
// prueba, ver guiones/01-introduccion.cjs).
//
// SIS-AGRO es stateless (JWT sin sesión en el servidor): no hace falta
// "cerrar" nada al terminar, a diferencia de sistemas con límite de
// dispositivos conectados.

const API_URL = process.env.TUTORIAL_API_URL || 'http://localhost:3001/api';
const USUARIO = process.env.TUTORIAL_USER || 'admin@tuempresa.com';
const PASSWORD = process.env.TUTORIAL_PASSWORD || 'CambiarAhora123!';

async function obtenerSesion() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identificador: USUARIO, contrasena: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`[sesion] Login falló (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return { token: data.token, usuario: data.usuario };
}

module.exports = { obtenerSesion };
