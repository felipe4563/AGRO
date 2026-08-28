const db = require('../config/db');
const { mensajeSeguro } = require('../utils/errorHandler');

const listar = async (req, res) => {
  try {
    const [promos] = await db.promise().query(
      `SELECT id_promocion, nombre, valor_pct, fecha_inicio, fecha_fin, activo, creado_en FROM promocion ORDER BY fecha_inicio DESC`
    );
    const [productos] = await db.promise().query(
      `SELECT pp.id_promocion, pp.id_producto, p.nombre AS producto_nombre
       FROM promocion_producto pp JOIN producto p ON pp.id_producto = p.id_producto`
    );
    const [clasificaciones] = await db.promise().query(
      `SELECT pc.id_promocion, pc.id_clasificacion, c.nombre AS clasificacion_nombre
       FROM promocion_clasificacion pc JOIN clasificacion_producto c ON pc.id_clasificacion = c.id_clasificacion`
    );

    const prodPorPromo = {};
    productos.forEach((p) => { (prodPorPromo[p.id_promocion] ??= []).push(p); });
    const clasPorPromo = {};
    clasificaciones.forEach((c) => { (clasPorPromo[c.id_promocion] ??= []).push(c); });

    promos.forEach((p) => {
      p.productos = prodPorPromo[p.id_promocion] || [];
      p.clasificaciones = clasPorPromo[p.id_promocion] || [];
    });

    return res.json(promos);
  } catch (err) {
    console.error('[promociones.listar]', err);
    return res.status(500).json({ error: 'Error al obtener promociones' });
  }
};

const obtener = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT * FROM promocion WHERE id_promocion = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Promoción no encontrada' });
    const promo = rows[0];
    const [productos] = await db.promise().query(
      `SELECT pp.id_producto, p.nombre AS producto_nombre
       FROM promocion_producto pp JOIN producto p ON pp.id_producto = p.id_producto
       WHERE pp.id_promocion = ?`,
      [id]
    );
    const [clasificaciones] = await db.promise().query(
      `SELECT pc.id_clasificacion, c.nombre AS clasificacion_nombre
       FROM promocion_clasificacion pc JOIN clasificacion_producto c ON pc.id_clasificacion = c.id_clasificacion
       WHERE pc.id_promocion = ?`,
      [id]
    );
    promo.productos = productos;
    promo.clasificaciones = clasificaciones;
    return res.json(promo);
  } catch (err) {
    console.error('[promociones.obtener]', err);
    return res.status(500).json({ error: 'Error al obtener la promoción' });
  }
};

const validar = (body) => {
  const { nombre, valor_pct, fecha_inicio, fecha_fin, id_productos, id_clasificaciones } = body ?? {};
  if (!nombre || valor_pct == null || !fecha_inicio || !fecha_fin) {
    return 'Faltan campos obligatorios (nombre, valor_pct, fecha_inicio, fecha_fin)';
  }
  if (valor_pct <= 0 || valor_pct > 100) return 'El porcentaje debe estar entre 0 y 100';
  if (new Date(fecha_fin) < new Date(fecha_inicio)) return 'La fecha fin no puede ser anterior a la fecha inicio';
  const prods = Array.isArray(id_productos) ? id_productos : [];
  const clas = Array.isArray(id_clasificaciones) ? id_clasificaciones : [];
  if (prods.length === 0 && clas.length === 0) return 'Seleccione al menos un producto o una categoría';
  return null;
};

const crear = async (req, res) => {
  const errorMsg = validar(req.body);
  if (errorMsg) return res.status(400).json({ error: errorMsg });

  const { nombre, descripcion, valor_pct, fecha_inicio, fecha_fin, id_productos = [], id_clasificaciones = [] } = req.body;

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO promocion (nombre, valor_pct, fecha_inicio, fecha_fin, activo) VALUES (?, ?, ?, ?, 1)',
      [nombre.trim(), valor_pct, fecha_inicio, fecha_fin]
    );
    const id_promocion = result.insertId;

    for (const id_producto of id_productos) {
      await connection.query('INSERT INTO promocion_producto (id_promocion, id_producto) VALUES (?, ?)', [id_promocion, id_producto]);
    }
    for (const id_clasificacion of id_clasificaciones) {
      await connection.query('INSERT INTO promocion_clasificacion (id_promocion, id_clasificacion) VALUES (?, ?)', [id_promocion, id_clasificacion]);
    }

    await connection.commit();
    return res.status(201).json({ mensaje: 'Promoción creada correctamente', id_promocion });
  } catch (err) {
    await connection.rollback();
    console.error('[promociones.crear]', err);
    return res.status(500).json({ error: 'Error al crear la promoción' });
  } finally {
    connection.release();
  }
};

const editar = async (req, res) => {
  const { id } = req.params;
  const { nombre, valor_pct, fecha_inicio, fecha_fin, id_productos, id_clasificaciones } = req.body ?? {};

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [existe] = await connection.query('SELECT id_promocion FROM promocion WHERE id_promocion = ?', [id]);
    if (existe.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Promoción no encontrada' });
    }

    const fields = [];
    const values = [];
    if (nombre !== undefined) { fields.push('nombre = ?'); values.push(nombre.trim()); }
    if (valor_pct !== undefined) { fields.push('valor_pct = ?'); values.push(valor_pct); }
    if (fecha_inicio !== undefined) { fields.push('fecha_inicio = ?'); values.push(fecha_inicio); }
    if (fecha_fin !== undefined) { fields.push('fecha_fin = ?'); values.push(fecha_fin); }
    if (fields.length > 0) {
      values.push(id);
      await connection.query(`UPDATE promocion SET ${fields.join(', ')} WHERE id_promocion = ?`, values);
    }

    if (Array.isArray(id_productos) || Array.isArray(id_clasificaciones)) {
      const prods = Array.isArray(id_productos) ? id_productos : [];
      const clas = Array.isArray(id_clasificaciones) ? id_clasificaciones : [];
      if (prods.length === 0 && clas.length === 0) throw new Error('Seleccione al menos un producto o una categoría');

      await connection.query('DELETE FROM promocion_producto WHERE id_promocion = ?', [id]);
      await connection.query('DELETE FROM promocion_clasificacion WHERE id_promocion = ?', [id]);
      for (const id_producto of prods) {
        await connection.query('INSERT INTO promocion_producto (id_promocion, id_producto) VALUES (?, ?)', [id, id_producto]);
      }
      for (const id_clasificacion of clas) {
        await connection.query('INSERT INTO promocion_clasificacion (id_promocion, id_clasificacion) VALUES (?, ?)', [id, id_clasificacion]);
      }
    }

    await connection.commit();
    return res.json({ mensaje: 'Promoción actualizada correctamente' });
  } catch (err) {
    await connection.rollback();
    console.error('[promociones.editar]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al editar la promoción') });
  } finally {
    connection.release();
  }
};

const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body ?? {};
  const activoNum = activo === 1 || activo === '1' ? 1 : 0;
  try {
    const [rows] = await db.promise().query('SELECT id_promocion FROM promocion WHERE id_promocion = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Promoción no encontrada' });
    await db.promise().query('UPDATE promocion SET activo = ? WHERE id_promocion = ?', [activoNum, id]);
    return res.json({ mensaje: 'Estado actualizado', activo: activoNum });
  } catch (err) {
    console.error('[promociones.toggleActivo]', err);
    return res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

const eliminar = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT id_promocion FROM promocion WHERE id_promocion = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Promoción no encontrada' });
    await db.promise().query('UPDATE promocion SET activo = 0 WHERE id_promocion = ?', [id]);
    return res.json({ mensaje: 'Promoción desactivada correctamente' });
  } catch (err) {
    console.error('[promociones.eliminar]', err);
    return res.status(500).json({ error: 'Error al eliminar la promoción' });
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  editar,
  toggleActivo,
  eliminar,
};
