const db = require('../config/db');

const listarSucursales = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT id_sucursal, nombre, direccion, ciudad, telefono, correo, activo, creado_en FROM sucursal ORDER BY nombre ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('[listarSucursales]', err);
    return res.status(500).json({ error: 'Error al obtener sucursales' });
  }
};

const crearSucursal = async (req, res) => {
  const { nombre, direccion, ciudad, telefono, correo, activo } = req.body ?? {};

  const nombreTxt = String(nombre ?? '').trim();
  const direccionTxt = String(direccion ?? '').trim();
  const ciudadTxt = String(ciudad ?? '').trim();
  const telefonoTxt = telefono ? String(telefono).trim() : null;
  const correoTxt = correo ? String(correo).trim() : null;
  const activoNum = activo === 0 || activo === '0' ? 0 : 1;

  if (!nombreTxt || !direccionTxt || !ciudadTxt) {
    return res.status(400).json({ error: 'Campos obligatorios: nombre, direccion, ciudad' });
  }

  try {
    // Unicidad nombre (opcional, pero buena práctica)
    const [exNombre] = await db.promise().query('SELECT id_sucursal FROM sucursal WHERE nombre = ? LIMIT 1', [nombreTxt]);
    if (exNombre.length > 0) {
      return res.status(409).json({ error: 'Ya existe una sucursal con ese nombre' });
    }

    const [result] = await db.promise().query(
      `INSERT INTO sucursal (nombre, direccion, ciudad, telefono, correo, activo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombreTxt, direccionTxt, ciudadTxt, telefonoTxt, correoTxt, activoNum]
    );

    return res.status(201).json({
      mensaje: 'Sucursal creada correctamente',
      id_sucursal: result.insertId,
    });
  } catch (err) {
    console.error('[crearSucursal]', err);
    return res.status(500).json({ error: 'Error al crear sucursal' });
  }
};

const editarSucursal = async (req, res) => {
  const { id } = req.params;
  const idSucursalNum = Number(id);
  if (!Number.isFinite(idSucursalNum) || idSucursalNum <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const { nombre, direccion, ciudad, telefono, correo, activo } = req.body ?? {};

  const nombreTxt = nombre != null ? String(nombre).trim() : null;
  const direccionTxt = direccion != null ? String(direccion).trim() : null;
  const ciudadTxt = ciudad != null ? String(ciudad).trim() : null;
  const telefonoTxt = telefono === undefined ? undefined : (telefono ? String(telefono).trim() : null);
  const correoTxt = correo === undefined ? undefined : (correo ? String(correo).trim() : null);
  const activoNum = activo === undefined ? undefined : (activo === 0 || activo === '0' ? 0 : 1);

  try {
    const [existe] = await db.promise().query('SELECT id_sucursal FROM sucursal WHERE id_sucursal = ? LIMIT 1', [idSucursalNum]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    if (nombreTxt) {
      const [dupNombre] = await db.promise().query(
        'SELECT id_sucursal FROM sucursal WHERE nombre = ? AND id_sucursal != ? LIMIT 1',
        [nombreTxt, idSucursalNum]
      );
      if (dupNombre.length > 0) return res.status(409).json({ error: 'Ya existe otra sucursal con ese nombre' });
    }

    const fields = [];
    const values = [];

    if (nombreTxt) { fields.push('nombre = ?'); values.push(nombreTxt); }
    if (direccionTxt) { fields.push('direccion = ?'); values.push(direccionTxt); }
    if (ciudadTxt) { fields.push('ciudad = ?'); values.push(ciudadTxt); }
    if (telefonoTxt !== undefined) { fields.push('telefono = ?'); values.push(telefonoTxt); }
    if (correoTxt !== undefined) { fields.push('correo = ?'); values.push(correoTxt); }
    if (activoNum !== undefined) { fields.push('activo = ?'); values.push(activoNum); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(idSucursalNum);
    await db.promise().query(`UPDATE sucursal SET ${fields.join(', ')} WHERE id_sucursal = ?`, values);

    return res.json({ mensaje: 'Sucursal actualizada correctamente' });
  } catch (err) {
    console.error('[editarSucursal]', err);
    return res.status(500).json({ error: 'Error al editar sucursal' });
  }
};

const eliminarSucursal = async (req, res) => {
  const { id } = req.params;
  const idSucursalNum = Number(id);
  if (!Number.isFinite(idSucursalNum) || idSucursalNum <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const [rows] = await db.promise().query('SELECT id_sucursal FROM sucursal WHERE id_sucursal = ? LIMIT 1', [idSucursalNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });

    // Baja lógica
    await db.promise().query('UPDATE sucursal SET activo = 0 WHERE id_sucursal = ?', [idSucursalNum]);
    return res.json({ mensaje: 'Sucursal desactivada correctamente' });
  } catch (err) {
    console.error('[eliminarSucursal]', err);
    return res.status(500).json({ error: 'Error al eliminar sucursal' });
  }
};

const toggleActivoSucursal = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body ?? {};
  const idSucursalNum = Number(id);
  
  if (!Number.isFinite(idSucursalNum) || idSucursalNum <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const activoNum = activo === 1 || activo === '1' ? 1 : (activo === 0 || activo === '0' ? 0 : null);
  if (activoNum === null) {
    return res.status(400).json({ error: '"activo" debe ser 0 o 1' });
  }

  try {
    const [rows] = await db.promise().query('SELECT id_sucursal FROM sucursal WHERE id_sucursal = ? LIMIT 1', [idSucursalNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });

    await db.promise().query('UPDATE sucursal SET activo = ? WHERE id_sucursal = ?', [activoNum, idSucursalNum]);
    return res.json({ mensaje: 'Estado actualizado correctamente', activo: activoNum });
  } catch (err) {
    console.error('[toggleActivoSucursal]', err);
    return res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

module.exports = {
  listarSucursales,
  crearSucursal,
  editarSucursal,
  eliminarSucursal,
  toggleActivoSucursal
};
