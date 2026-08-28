const db = require('../config/db');
const bcrypt = require('bcrypt');

const listarUsuarios = (req, res) => {
  const sql = `
    SELECT
      u.id_usuario,
      u.ci,
      u.nombre,
      u.apellido,
      u.celular,
      u.correo,
      u.activo,
      u.id_rol,
      r.nombre AS rol_nombre,
      u.id_sucursal,
      s.nombre AS sucursal
    FROM usuario u
    LEFT JOIN rol r ON r.id_rol = u.id_rol
    LEFT JOIN sucursal s ON s.id_sucursal = u.id_sucursal
    ORDER BY u.id_usuario DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('[listarUsuarios]', err);
      return res.status(500).json({ error: 'Error al obtener usuarios' });
    }
    return res.json(rows);
  });
};

function normalizarCorreo(correo) {
  const c = (correo ?? '').trim();
  return c ? c.toLowerCase() : null;
}

const crearUsuario = async (req, res) => {
  const {
    ci,
    nombre,
    apellido,
    correo,
    celular,
    contrasena,
    id_rol,
    id_sucursal,
    activo,
  } = req.body ?? {};

  const ciTxt = String(ci ?? '').trim();
  const nombreTxt = String(nombre ?? '').trim();
  const apellidoTxt = String(apellido ?? '').trim();
  const correoTxt = normalizarCorreo(correo);
  const celularTxt = celular ? String(celular).trim() : null;

  const idRolNum = id_rol === '' || id_rol == null ? null : Number(id_rol);
  const idSucursalNum = id_sucursal === '' || id_sucursal == null ? null : Number(id_sucursal);
  const activoNum = activo === 0 || activo === '0' ? 0 : 1;

  if (!ciTxt || !nombreTxt || !apellidoTxt || !Number.isFinite(idRolNum) || idRolNum <= 0) {
    return res.status(400).json({ error: 'Campos obligatorios: ci, nombre, apellido, id_rol' });
  }
  if (!contrasena) {
    return res.status(400).json({ error: 'La contraseña es obligatoria' });
  }

  try {
    const hash = await bcrypt.hash(String(contrasena), 10);

    // Unicidad CI
    const [exCI] = await db.promise().query('SELECT id_usuario FROM usuario WHERE ci = ? LIMIT 1', [ciTxt]);
    if (exCI.length > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese CI' });
    }

    // Unicidad correo (si viene)
    if (correoTxt) {
      const [exCorreo] = await db.promise().query('SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1', [correoTxt]);
      if (exCorreo.length > 0) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
      }
    }

    // Validar rol
    const [rolRows] = await db.promise().query('SELECT id_rol FROM rol WHERE id_rol = ? LIMIT 1', [idRolNum]);
    if (rolRows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // Validar sucursal (si viene)
    if (Number.isFinite(idSucursalNum)) {
      const [sRows] = await db.promise().query('SELECT id_sucursal FROM sucursal WHERE id_sucursal = ? LIMIT 1', [idSucursalNum]);
      if (sRows.length === 0) {
        return res.status(404).json({ error: 'Sucursal no encontrada' });
      }
    }

    const [result] = await db.promise().query(
      `INSERT INTO usuario
        (id_rol, id_sucursal, ci, nombre, apellido, celular, correo, contrasena, debe_cambiar_contrasena, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [idRolNum, Number.isFinite(idSucursalNum) ? idSucursalNum : null, ciTxt, nombreTxt, apellidoTxt, celularTxt, correoTxt, hash, activoNum]
    );

    return res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      id_usuario: result.insertId,
    });
  } catch (err) {
    console.error('[crearUsuario]', err);
    return res.status(500).json({ error: 'Error al crear usuario' });
  }
};

const editarUsuario = async (req, res) => {
  const { id } = req.params;
  const idUsuarioNum = Number(id);
  if (!Number.isFinite(idUsuarioNum) || idUsuarioNum <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const {
    ci,
    nombre,
    apellido,
    correo,
    celular,
    contrasena,
    id_rol,
    id_sucursal,
    activo,
  } = req.body ?? {};

  const ciTxt = ci != null ? String(ci).trim() : null;
  const nombreTxt = nombre != null ? String(nombre).trim() : null;
  const apellidoTxt = apellido != null ? String(apellido).trim() : null;
  const correoTxt = correo === undefined ? undefined : normalizarCorreo(correo);
  const celularTxt = celular === undefined ? undefined : (celular ? String(celular).trim() : null);

  const idRolNum = id_rol === undefined ? undefined : (id_rol === '' || id_rol == null ? null : Number(id_rol));
  const idSucursalNum = id_sucursal === undefined ? undefined : (id_sucursal === '' || id_sucursal == null ? null : Number(id_sucursal));
  const activoNum = activo === undefined ? undefined : (activo === 0 || activo === '0' ? 0 : 1);

  try {
    const [existe] = await db.promise().query('SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1', [idUsuarioNum]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar CI único (si se manda)
    if (ciTxt) {
      const [dupCI] = await db.promise().query(
        'SELECT id_usuario FROM usuario WHERE ci = ? AND id_usuario != ? LIMIT 1',
        [ciTxt, idUsuarioNum]
      );
      if (dupCI.length > 0) return res.status(409).json({ error: 'Ya existe otro usuario con ese CI' });
    }

    // Validar correo único (si se manda)
    if (correoTxt !== undefined && correoTxt) {
      const [dupCorreo] = await db.promise().query(
        'SELECT id_usuario FROM usuario WHERE correo = ? AND id_usuario != ? LIMIT 1',
        [correoTxt, idUsuarioNum]
      );
      if (dupCorreo.length > 0) return res.status(409).json({ error: 'Ya existe otro usuario con ese correo' });
    }

    // Validar rol (si se manda)
    if (idRolNum !== undefined) {
      if (!Number.isFinite(idRolNum) || idRolNum <= 0) return res.status(400).json({ error: '"id_rol" inválido' });
      const [rolRows] = await db.promise().query('SELECT id_rol FROM rol WHERE id_rol = ? LIMIT 1', [idRolNum]);
      if (rolRows.length === 0) return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // Validar sucursal (si se manda)
    if (idSucursalNum !== undefined && idSucursalNum !== null) {
      if (!Number.isFinite(idSucursalNum) || idSucursalNum <= 0) return res.status(400).json({ error: '"id_sucursal" inválido' });
      const [sRows] = await db.promise().query('SELECT id_sucursal FROM sucursal WHERE id_sucursal = ? LIMIT 1', [idSucursalNum]);
      if (sRows.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    const fields = [];
    const values = [];

    if (ciTxt) { fields.push('ci = ?'); values.push(ciTxt); }
    if (nombreTxt) { fields.push('nombre = ?'); values.push(nombreTxt); }
    if (apellidoTxt) { fields.push('apellido = ?'); values.push(apellidoTxt); }
    if (celularTxt !== undefined) { fields.push('celular = ?'); values.push(celularTxt); }
    if (correoTxt !== undefined) { fields.push('correo = ?'); values.push(correoTxt || null); }
    if (idRolNum !== undefined) { fields.push('id_rol = ?'); values.push(idRolNum); }
    if (idSucursalNum !== undefined) { fields.push('id_sucursal = ?'); values.push(idSucursalNum); }
    if (activoNum !== undefined) { fields.push('activo = ?'); values.push(activoNum); }

    if (contrasena) {
      const hash = await bcrypt.hash(String(contrasena), 10);
      fields.push('contrasena = ?');
      values.push(hash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(idUsuarioNum);
    await db.promise().query(`UPDATE usuario SET ${fields.join(', ')} WHERE id_usuario = ?`, values);

    return res.json({ mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error('[editarUsuario]', err);
    return res.status(500).json({ error: 'Error al editar usuario' });
  }
};

const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  const idUsuarioNum = Number(id);
  if (!Number.isFinite(idUsuarioNum) || idUsuarioNum <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const [rows] = await db.promise().query('SELECT id_usuario, activo FROM usuario WHERE id_usuario = ? LIMIT 1', [idUsuarioNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Baja lógica: activo=0
    await db.promise().query('UPDATE usuario SET activo = 0 WHERE id_usuario = ?', [idUsuarioNum]);
    return res.json({ mensaje: 'Usuario desactivado correctamente' });
  } catch (err) {
    console.error('[eliminarUsuario]', err);
    return res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

const toggleActivoUsuario = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body ?? {};

  const idUsuarioNum = Number(id);
  if (!Number.isFinite(idUsuarioNum) || idUsuarioNum <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const activoNum = activo === 1 || activo === '1' ? 1 : (activo === 0 || activo === '0' ? 0 : null);
  if (activoNum === null) {
    return res.status(400).json({ error: '"activo" debe ser 0 o 1' });
  }

  try {
    const [rows] = await db.promise().query('SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1', [idUsuarioNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    await db.promise().query('UPDATE usuario SET activo = ? WHERE id_usuario = ?', [activoNum, idUsuarioNum]);
    return res.json({ mensaje: 'Estado actualizado correctamente', activo: activoNum });
  } catch (err) {
    console.error('[toggleActivoUsuario]', err);
    return res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

const cambiarSucursalUsuario = async (req, res) => {
  const { id } = req.params;
  const { id_sucursal } = req.body;

  const idUsuarioNum = Number(id);
  if (!Number.isFinite(idUsuarioNum) || idUsuarioNum <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const idSucursalNum = id_sucursal === '' || id_sucursal == null ? null : Number(id_sucursal);

  try {
    const [userRows] = await db.promise().query('SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1', [idUsuarioNum]);
    if (userRows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (idSucursalNum !== null) {
      if (!Number.isFinite(idSucursalNum) || idSucursalNum <= 0) return res.status(400).json({ error: '"id_sucursal" inválido' });
      const [sRows] = await db.promise().query('SELECT id_sucursal FROM sucursal WHERE id_sucursal = ? AND activo = 1 LIMIT 1', [idSucursalNum]);
      if (sRows.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada o inactiva' });
    }

    await db.promise().query('UPDATE usuario SET id_sucursal = ? WHERE id_usuario = ?', [idSucursalNum, idUsuarioNum]);
    return res.json({ mensaje: 'Sucursal actualizada correctamente', id_usuario: idUsuarioNum, id_sucursal: idSucursalNum });
  } catch (err) {
    console.error('[cambiarSucursalUsuario]', err);
    return res.status(500).json({ error: 'Error al cambiar sucursal' });
  }
};

const resetearContrasena = async (req, res) => {
  const { id } = req.params;
  const { nueva_contrasena } = req.body;

  const idUsuarioNum = Number(id);
  if (!Number.isFinite(idUsuarioNum) || idUsuarioNum <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  if (!nueva_contrasena || String(nueva_contrasena).trim().length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const [rows] = await db.promise().query('SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1', [idUsuarioNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const hash = await bcrypt.hash(String(nueva_contrasena), 10);
    await db.promise().query('UPDATE usuario SET contrasena = ?, debe_cambiar_contrasena = 1 WHERE id_usuario = ?', [hash, idUsuarioNum]);
    return res.json({ mensaje: 'Contraseña restablecida correctamente' });
  } catch (err) {
    console.error('[resetearContrasena]', err);
    return res.status(500).json({ error: 'Error al resetear contraseña' });
  }
};

const cambiarRolUsuario = (req, res) => {
  const { id } = req.params;
  const { id_rol } = req.body;

  const idRolNum = Number(id_rol);
  if (!Number.isFinite(idRolNum) || idRolNum <= 0) {
    return res.status(400).json({ error: '"id_rol" debe ser un número válido' });
  }

  db.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id], (errU, rowsU) => {
    if (errU) {
      console.error('[cambiarRolUsuario] usuario:', errU);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    if (rowsU.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    db.query('SELECT id_rol, nombre FROM rol WHERE id_rol = ?', [idRolNum], (errR, rowsR) => {
      if (errR) {
        console.error('[cambiarRolUsuario] rol:', errR);
        return res.status(500).json({ error: 'Error en el servidor' });
      }
      if (rowsR.length === 0) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      db.query(
        'UPDATE usuario SET id_rol = ? WHERE id_usuario = ?',
        [idRolNum, id],
        (errUp) => {
          if (errUp) {
            console.error('[cambiarRolUsuario] update:', errUp);
            return res.status(500).json({ error: 'Error al actualizar rol del usuario' });
          }

          return res.json({
            mensaje: 'Rol actualizado correctamente',
            id_usuario: Number(id),
            id_rol: idRolNum,
            rol_nombre: rowsR[0].nombre,
          });
        }
      );
    });
  });
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  eliminarUsuario,
  toggleActivoUsuario,
  cambiarRolUsuario,
  cambiarSucursalUsuario,
  resetearContrasena,
};

