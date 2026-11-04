require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { getToken } = require('./helpers');

describe('authMiddleware - id_sucursal del token', () => {
  test('usa el id_sucursal actual del usuario, no el que trae un token viejo', async () => {
    // Usuario de prueba y su sucursal original
    await getToken(); // asegura que TEST_USER existe y las credenciales son válidas
    const [usuarioRows] = await db.promise().query(
      'SELECT id_usuario, id_sucursal FROM usuario WHERE correo = ?',
      [process.env.TEST_USER || 'admin@agropecuaria.bo']
    );
    expect(usuarioRows.length).toBe(1);
    const { id_usuario, id_sucursal: sucursalOriginal } = usuarioRows[0];

    const [otraSucursalRows] = await db.promise().query(
      'SELECT id_sucursal FROM sucursal WHERE id_sucursal != ? LIMIT 1',
      [sucursalOriginal]
    );
    let sucursalNueva = otraSucursalRows[0]?.id_sucursal;
    let sucursalCreadaId = null;
    if (!sucursalNueva) {
      const [insertRes] = await db.promise().query(
        `INSERT INTO sucursal (nombre, direccion, ciudad, activo)
         VALUES ('SUCURSAL_TEST_authMiddleware', 'Dirección de prueba', 'Ciudad de prueba', 1)`
      );
      sucursalCreadaId = insertRes.insertId;
      sucursalNueva = sucursalCreadaId;
    }

    // Token "viejo": firmado con la sucursal ORIGINAL
    const tokenViejo = jwt.sign(
      { id_usuario, id_sucursal: sucursalOriginal, rol: 1, rol_nombre: 'Administrador', permisos: [] },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    try {
      // Simula el cambio de sucursal del usuario DESPUÉS de haber logueado
      await db.promise().query('UPDATE usuario SET id_sucursal = ? WHERE id_usuario = ?', [sucursalNueva, id_usuario]);

      const req = { headers: { authorization: `Bearer ${tokenViejo}` } };
      const res = { status: () => res, json: () => res };
      let siguienteLlamado = false;
      await authMiddleware(req, res, () => { siguienteLlamado = true; });

      expect(siguienteLlamado).toBe(true);
      expect(req.user.id_sucursal).toBe(sucursalNueva);
    } finally {
      await db.promise().query('UPDATE usuario SET id_sucursal = ? WHERE id_usuario = ?', [sucursalOriginal, id_usuario]);
      if (sucursalCreadaId) {
        await db.promise().query('DELETE FROM sucursal WHERE id_sucursal = ?', [sucursalCreadaId]);
      }
    }
  });
});
