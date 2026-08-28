const db = require('../config/db');

// ==========================================
// CLASIFICACIONES
// ==========================================
const listarClasificaciones = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT id_clasificacion, nombre, descripcion, activo FROM clasificacion_producto ORDER BY nombre ASC'
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener clasificaciones' });
  }
};

const crearClasificacion = async (req, res) => {
  const { nombre, descripcion } = req.body ?? {};
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const [result] = await db.promise().query(
      'INSERT INTO clasificacion_producto (nombre, descripcion) VALUES (?, ?)',
      [nombre.trim(), descripcion ? descripcion.trim() : null]
    );
    return res.status(201).json({ mensaje: 'Clasificación creada', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El nombre ya existe' });
    return res.status(500).json({ error: 'Error al crear' });
  }
};

const editarClasificacion = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body ?? {};
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    await db.promise().query(
      'UPDATE clasificacion_producto SET nombre = ?, descripcion = ? WHERE id_clasificacion = ?',
      [nombre.trim(), descripcion ? descripcion.trim() : null, id]
    );
    return res.json({ mensaje: 'Clasificación actualizada' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El nombre ya existe' });
    return res.status(500).json({ error: 'Error al actualizar' });
  }
};

const eliminarClasificacion = async (req, res) => {
  try {
    await db.promise().query('UPDATE clasificacion_producto SET activo = 0 WHERE id_clasificacion = ?', [req.params.id]);
    return res.json({ mensaje: 'Clasificación desactivada' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar' });
  }
};

const toggleActivoClasificacion = async (req, res) => {
  const { activo } = req.body;
  try {
    await db.promise().query('UPDATE clasificacion_producto SET activo = ? WHERE id_clasificacion = ?', [activo ? 1 : 0, req.params.id]);
    return res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

// ==========================================
// MARCAS
// ==========================================
const listarMarcas = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT id_marca, nombre, pais_origen, descripcion, activo FROM marca ORDER BY nombre ASC'
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener marcas' });
  }
};

const crearMarca = async (req, res) => {
  const { nombre, pais_origen, descripcion } = req.body ?? {};
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const [result] = await db.promise().query(
      'INSERT INTO marca (nombre, pais_origen, descripcion) VALUES (?, ?, ?)',
      [nombre.trim(), pais_origen ? pais_origen.trim() : null, descripcion ? descripcion.trim() : null]
    );
    return res.status(201).json({ mensaje: 'Marca creada', id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error al crear' });
  }
};

const editarMarca = async (req, res) => {
  const { id } = req.params;
  const { nombre, pais_origen, descripcion } = req.body ?? {};
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    await db.promise().query(
      'UPDATE marca SET nombre = ?, pais_origen = ?, descripcion = ? WHERE id_marca = ?',
      [nombre.trim(), pais_origen ? pais_origen.trim() : null, descripcion ? descripcion.trim() : null, id]
    );
    return res.json({ mensaje: 'Marca actualizada' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar' });
  }
};

const eliminarMarca = async (req, res) => {
  try {
    await db.promise().query('UPDATE marca SET activo = 0 WHERE id_marca = ?', [req.params.id]);
    return res.json({ mensaje: 'Marca desactivada' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar' });
  }
};

const toggleActivoMarca = async (req, res) => {
  const { activo } = req.body;
  try {
    await db.promise().query('UPDATE marca SET activo = ? WHERE id_marca = ?', [activo ? 1 : 0, req.params.id]);
    return res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

// ==========================================
// UNIDADES
// ==========================================
const listarUnidades = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT id_unidad, nombre, abreviatura FROM unidad_medida ORDER BY nombre ASC'
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener unidades' });
  }
};

const crearUnidad = async (req, res) => {
  const { nombre, abreviatura } = req.body ?? {};
  if (!nombre || !abreviatura) return res.status(400).json({ error: 'Nombre y abreviatura obligatorios' });

  try {
    const [result] = await db.promise().query(
      'INSERT INTO unidad_medida (nombre, abreviatura) VALUES (?, ?)',
      [nombre.trim(), abreviatura.trim()]
    );
    return res.status(201).json({ mensaje: 'Unidad creada', id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error al crear' });
  }
};

const editarUnidad = async (req, res) => {
  const { id } = req.params;
  const { nombre, abreviatura } = req.body ?? {};
  if (!nombre || !abreviatura) return res.status(400).json({ error: 'Nombre y abreviatura obligatorios' });

  try {
    await db.promise().query(
      'UPDATE unidad_medida SET nombre = ?, abreviatura = ? WHERE id_unidad = ?',
      [nombre.trim(), abreviatura.trim(), id]
    );
    return res.json({ mensaje: 'Unidad actualizada' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar' });
  }
};

const eliminarUnidad = async (req, res) => {
  // Eliminación física porque no hay columna activo
  try {
    await db.promise().query('DELETE FROM unidad_medida WHERE id_unidad = ?', [req.params.id]);
    return res.json({ mensaje: 'Unidad eliminada' });
  } catch (err) {
    // Si da error de FK (en uso)
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'No se puede eliminar porque está en uso' });
    }
    return res.status(500).json({ error: 'Error al eliminar' });
  }
};

module.exports = {
  listarClasificaciones, crearClasificacion, editarClasificacion, eliminarClasificacion, toggleActivoClasificacion,
  listarMarcas, crearMarca, editarMarca, eliminarMarca, toggleActivoMarca,
  listarUnidades, crearUnidad, editarUnidad, eliminarUnidad
};
