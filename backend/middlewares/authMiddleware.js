const jwt                         = require('jsonwebtoken');
const { ForbiddenError }          = require('@casl/ability');
const { buildAbilityForPermisos } = require('../casl/ability.factory');
const db                          = require('../config/db');

// ── Caché de permisos por rol ─────────────────────────────────────────────
const cachePermisos = new Map();

async function getPermisosDeRol(id_rol) {
  if (cachePermisos.has(id_rol)) {
    return cachePermisos.get(id_rol);
  }

  const [rows] = await db.promise().query(
    `SELECT p.nombre_clave
     FROM rol_permiso rp
     JOIN permiso p ON p.id_permiso = rp.id_permiso
     WHERE rp.id_rol = ?`,
    [id_rol]
  );

  const claves = rows.map(r => r.nombre_clave);
  cachePermisos.set(id_rol, claves);
  return claves;
}

function invalidarCacheRol(id_rol) {
  cachePermisos.delete(id_rol);
}

// ── Auth middleware ───────────────────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('[authMiddleware] JWT_SECRET no está configurado en el entorno');
      return res.status(500).json({ error: 'Error interno de autenticación' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id_usuario, rol, id_sucursal, id_sector } = decoded; // ✅ Cambiado id_persona → id_usuario, agregado id_sector

    const claves  = await getPermisosDeRol(rol);
    const ability = buildAbilityForPermisos(claves);

    req.user = {
      id_usuario,  // ✅ Cambiado de id_persona
      rol,
      id_sucursal,
      id_sector,   // ✅ Agregado
      permisos: claves,
    };
    req.ability = ability;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.error('[authMiddleware] Error:', error);
    return res.status(500).json({ error: 'Error interno de autenticación' });
  }
};

// ── requireRole ───────────────────────────────────────────────────────────
const requireRole = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const roles = Array.isArray(rolesPermitidos)
      ? rolesPermitidos
      : [rolesPermitidos];
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Acceso denegado. Rol no autorizado.' });
    }
    next();
  };
};

// ── checkPermission ───────────────────────────────────────────────────────
const checkPermission = (action, subject) => {
  return (req, res, next) => {
    if (!req.ability) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    try {
      ForbiddenError.from(req.ability).throwUnlessCan(action, subject);
      next();
    } catch {
      return res.status(403).json({
        error: `Sin permiso para: ${action} en ${subject}`,
      });
    }
  };
};

module.exports = {
  authMiddleware,
  requireRole,
  checkPermission,
  invalidarCacheRol,
};