const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');
const { mensajeSeguro } = require('../utils/errorHandler');

const listar = async (req, res) => {
  try {
    const [combos] = await db.promise().query(
      `SELECT id_combo, nombre, descripcion, precio_combo, fecha_inicio, fecha_fin, imagen, activo, creado_en FROM combo ORDER BY nombre ASC`
    );
    const [componentes] = await db.promise().query(
      `SELECT cp.id_combo, cp.id_producto, cp.cantidad, p.nombre AS producto_nombre, p.precio_menor
       FROM combo_producto cp
       JOIN producto p ON cp.id_producto = p.id_producto`
    );
    const porCombo = {};
    componentes.forEach((c) => {
      if (!porCombo[c.id_combo]) porCombo[c.id_combo] = [];
      porCombo[c.id_combo].push(c);
    });
    combos.forEach((c) => { c.productos = porCombo[c.id_combo] || []; });
    return res.json(combos);
  } catch (err) {
    console.error('[combos.listar]', err);
    return res.status(500).json({ error: 'Error al obtener combos' });
  }
};

const obtener = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT * FROM combo WHERE id_combo = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Combo no encontrado' });
    const combo = rows[0];
    const [productos] = await db.promise().query(
      `SELECT cp.id_producto, cp.cantidad, p.nombre AS producto_nombre, p.precio_menor
       FROM combo_producto cp
       JOIN producto p ON cp.id_producto = p.id_producto
       WHERE cp.id_combo = ?`,
      [id]
    );
    combo.productos = productos;
    return res.json(combo);
  } catch (err) {
    console.error('[combos.obtener]', err);
    return res.status(500).json({ error: 'Error al obtener el combo' });
  }
};

const crear = async (req, res) => {
  const { nombre, descripcion, precio_combo, fecha_inicio, fecha_fin, productos } = req.body ?? {};
  if (!nombre || precio_combo == null || !Array.isArray(productos) || productos.length < 2) {
    return res.status(400).json({ error: 'Un combo requiere nombre, precio y al menos 2 productos' });
  }
  if (fecha_inicio && fecha_fin && new Date(fecha_fin) < new Date(fecha_inicio)) {
    return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO combo (nombre, descripcion, precio_combo, fecha_inicio, fecha_fin, activo) VALUES (?, ?, ?, ?, ?, 1)',
      [nombre.trim(), descripcion ? descripcion.trim() : null, precio_combo, fecha_inicio || null, fecha_fin || null]
    );
    const id_combo = result.insertId;

    for (const p of productos) {
      if (!p.id_producto || !p.cantidad || p.cantidad < 1) {
        throw new Error('Cada producto del combo requiere id_producto y cantidad válida');
      }
      await connection.query(
        'INSERT INTO combo_producto (id_combo, id_producto, cantidad) VALUES (?, ?, ?)',
        [id_combo, p.id_producto, p.cantidad]
      );
    }

    await connection.commit();
    return res.status(201).json({ mensaje: 'Combo creado correctamente', id_combo });
  } catch (err) {
    await connection.rollback();
    console.error('[combos.crear]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al crear el combo') });
  } finally {
    connection.release();
  }
};

const editar = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio_combo, fecha_inicio, fecha_fin, productos } = req.body ?? {};

  if (fecha_inicio && fecha_fin && new Date(fecha_fin) < new Date(fecha_inicio)) {
    return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [existe] = await connection.query('SELECT id_combo FROM combo WHERE id_combo = ?', [id]);
    if (existe.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Combo no encontrado' });
    }

    const fields = [];
    const values = [];
    if (nombre !== undefined) { fields.push('nombre = ?'); values.push(nombre.trim()); }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); values.push(descripcion ? descripcion.trim() : null); }
    if (precio_combo !== undefined) { fields.push('precio_combo = ?'); values.push(precio_combo); }
    if (fecha_inicio !== undefined) { fields.push('fecha_inicio = ?'); values.push(fecha_inicio || null); }
    if (fecha_fin !== undefined) { fields.push('fecha_fin = ?'); values.push(fecha_fin || null); }
    if (fields.length > 0) {
      values.push(id);
      await connection.query(`UPDATE combo SET ${fields.join(', ')} WHERE id_combo = ?`, values);
    }

    if (Array.isArray(productos)) {
      if (productos.length < 2) throw new Error('Un combo requiere al menos 2 productos');
      await connection.query('DELETE FROM combo_producto WHERE id_combo = ?', [id]);
      for (const p of productos) {
        if (!p.id_producto || !p.cantidad || p.cantidad < 1) {
          throw new Error('Cada producto del combo requiere id_producto y cantidad válida');
        }
        await connection.query(
          'INSERT INTO combo_producto (id_combo, id_producto, cantidad) VALUES (?, ?, ?)',
          [id, p.id_producto, p.cantidad]
        );
      }
    }

    await connection.commit();
    return res.json({ mensaje: 'Combo actualizado correctamente' });
  } catch (err) {
    await connection.rollback();
    console.error('[combos.editar]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al editar el combo') });
  } finally {
    connection.release();
  }
};

const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body ?? {};
  const activoNum = activo === 1 || activo === '1' ? 1 : 0;
  try {
    const [rows] = await db.promise().query('SELECT id_combo FROM combo WHERE id_combo = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Combo no encontrado' });
    await db.promise().query('UPDATE combo SET activo = ? WHERE id_combo = ?', [activoNum, id]);
    return res.json({ mensaje: 'Estado del combo actualizado', activo: activoNum });
  } catch (err) {
    console.error('[combos.toggleActivo]', err);
    return res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

const eliminar = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT id_combo FROM combo WHERE id_combo = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Combo no encontrado' });
    await db.promise().query('UPDATE combo SET activo = 0 WHERE id_combo = ?', [id]);
    return res.json({ mensaje: 'Combo desactivado correctamente' });
  } catch (err) {
    console.error('[combos.eliminar]', err);
    return res.status(500).json({ error: 'Error al eliminar el combo' });
  }
};

const subirImagenCombo = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

  try {
    const [rows] = await db.promise().query('SELECT imagen FROM combo WHERE id_combo = ? LIMIT 1', [Number(id)]);
    if (rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Combo no encontrado' });
    }

    const imagenAnterior = rows[0].imagen;
    await db.promise().query('UPDATE combo SET imagen = ? WHERE id_combo = ?', [req.file.filename, Number(id)]);

    if (imagenAnterior) {
      const rutaAnterior = path.join(__dirname, '..', 'uploads', imagenAnterior);
      if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
    }

    return res.json({ mensaje: 'Imagen actualizada', imagen: req.file.filename });
  } catch (err) {
    console.error('[subirImagenCombo]', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: 'Error al subir imagen' });
  }
};

const eliminarImagenCombo = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT imagen FROM combo WHERE id_combo = ? LIMIT 1', [Number(id)]);
    if (rows.length === 0) return res.status(404).json({ error: 'Combo no encontrado' });

    const imagen = rows[0].imagen;
    await db.promise().query('UPDATE combo SET imagen = NULL WHERE id_combo = ?', [Number(id)]);

    if (imagen) {
      const ruta = path.join(__dirname, '..', 'uploads', imagen);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    return res.json({ mensaje: 'Imagen eliminada' });
  } catch (err) {
    console.error('[eliminarImagenCombo]', err);
    return res.status(500).json({ error: 'Error al eliminar imagen' });
  }
};

// Combos disponibles para el POS: solo los que tienen stock suficiente de TODOS sus componentes
// y cuya fecha de vigencia (si se definió) incluya el día de hoy.
const listarParaPOS = async (req, res) => {
  const id_sucursal = req.user.id_sucursal;
  try {
    const [combos] = await db.promise().query(
      `SELECT id_combo, nombre, descripcion, precio_combo, imagen FROM combo
       WHERE activo = 1
         AND (fecha_inicio IS NULL OR fecha_inicio <= CURDATE())
         AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())`
    );
    if (combos.length === 0) return res.json([]);

    const [componentes] = await db.promise().query(
      `SELECT cp.id_combo, cp.id_producto, cp.cantidad, p.nombre AS producto_nombre, p.precio_menor,
         COALESCE((
           SELECT SUM(l.stock_unidades) FROM lote l
           WHERE l.id_producto = cp.id_producto AND l.id_sucursal = ? AND l.activo = 1
         ), 0) AS stock_producto
       FROM combo_producto cp
       JOIN producto p ON cp.id_producto = p.id_producto
       WHERE cp.id_combo IN (?)`,
      [id_sucursal, combos.map((c) => c.id_combo)]
    );

    const porCombo = {};
    componentes.forEach((c) => {
      if (!porCombo[c.id_combo]) porCombo[c.id_combo] = [];
      porCombo[c.id_combo].push(c);
    });

    const disponibles = combos
      .map((combo) => {
        const productos = porCombo[combo.id_combo] || [];
        const disponible = productos.length > 0
          ? Math.min(...productos.map((p) => Math.floor(p.stock_producto / p.cantidad)))
          : 0;
        return { ...combo, productos, disponible };
      })
      .filter((c) => c.disponible > 0);

    return res.json(disponibles);
  } catch (err) {
    console.error('[combos.listarParaPOS]', err);
    return res.status(500).json({ error: 'Error al obtener combos disponibles' });
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  editar,
  toggleActivo,
  eliminar,
  listarParaPOS,
  subirImagenCombo,
  eliminarImagenCombo,
};
