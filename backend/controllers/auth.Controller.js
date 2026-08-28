const db     = require('../config/db');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

// ── Rate limiting en memoria (5 intentos / 15 min por IP) ────────────────
const intentosFallidos = new Map();
const MAX_INTENTOS = 5;
const VENTANA_MS   = 15 * 60 * 1000;

function verificarRateLimit(ip) {
  const ahora = Date.now();
  const registro = intentosFallidos.get(ip);
  if (!registro || ahora - registro.inicio > VENTANA_MS) {
    return { bloqueado: false };
  }
  if (registro.intentos >= MAX_INTENTOS) {
    const restanteMs = VENTANA_MS - (ahora - registro.inicio);
    const restanteMin = Math.ceil(restanteMs / 60000);
    return { bloqueado: true, restanteMin };
  }
  return { bloqueado: false };
}

function registrarIntentoFallido(ip) {
  const ahora = Date.now();
  const registro = intentosFallidos.get(ip);
  if (!registro || ahora - registro.inicio > VENTANA_MS) {
    intentosFallidos.set(ip, { intentos: 1, inicio: ahora });
  } else {
    registro.intentos++;
  }
}

function limpiarIntentos(ip) {
  intentosFallidos.delete(ip);
}

const login = (req, res) => {
  const { identificador, contrasena } = req.body;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  if (!identificador || !contrasena) {
    return res.status(400).json({ error: 'Correo/CI y contraseña son requeridos' });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const { bloqueado, restanteMin } = verificarRateLimit(ip);
  if (bloqueado) {
    return res.status(429).json({
      error: `Demasiados intentos fallidos. Intenta en ${restanteMin} minuto(s).`,
    });
  }

  // ── 1. Buscar usuario activo por correo o CI ──────────────────────────────
  const sqlUsuario = `
    SELECT u.*, r.nombre AS rol_nombre
    FROM usuario u
    LEFT JOIN rol r ON u.id_rol = r.id_rol
    WHERE (u.correo = ? OR u.ci = ?) AND u.activo = 1
  `;

  db.query(sqlUsuario, [identificador, identificador], async (err, results) => {
    if (err) {
      console.error('[login] Error al buscar usuario:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (results.length === 0) {
      registrarIntentoFallido(ip);
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    const usuario = results[0];

    // ── 2. Verificar contraseña (solo bcrypt) ─────────────────────────────────
    try {
      const hash = usuario.contrasena ?? '';
      const coincide = await bcrypt.compare(String(contrasena), hash);
      if (!coincide) {
        registrarIntentoFallido(ip);
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
      limpiarIntentos(ip);
    } catch (bcryptErr) {
      console.error('[login] Error en bcrypt:', bcryptErr);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
      // ── 4. Cargar permisos del rol ────────────────────────────────────────
      const sqlPermisos = `
        SELECT p.nombre_clave
        FROM rol_permiso rp
        JOIN permiso p ON p.id_permiso = rp.id_permiso
        WHERE rp.id_rol = ?
      `;

      db.query(sqlPermisos, [usuario.id_rol ?? -1], (errPermisos, rowsPermisos) => {
        if (errPermisos) {
          console.error('[login] Error al cargar permisos:', errPermisos);
          return res.status(500).json({ error: 'Error al cargar permisos' });
        }

        const permisos = rowsPermisos.map(p => p.nombre_clave);

        // ── 5. Generar JWT ────────────────────────────────────────────────
        const token = jwt.sign(
          {
            id_usuario:  usuario.id_usuario,
            id_sucursal: usuario.id_sucursal,
            rol:         usuario.id_rol,       
            rol_nombre:  usuario.rol_nombre,   
            permisos,                          
          },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }                  
        );

        // ── 6. Responder ──────────────────────────────────────────────────
        return res.json({
          token,
          usuario: {
            id:                      usuario.id_usuario,
            nombre:                  usuario.nombre,
            apellido:                usuario.apellido,
            correo:                  usuario.correo,
            celular:                 usuario.celular,
            foto:                    usuario.foto,
            rol:                     usuario.id_rol,
            id_sucursal:             usuario.id_sucursal,
            rol_nombre:              usuario.rol_nombre,
            debe_cambiar_contrasena: !!usuario.debe_cambiar_contrasena,
            permisos,
          },
        });
      });
    });
};

module.exports = { login };