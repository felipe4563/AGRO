const db = require('../config/db');
const { mensajeSeguro } = require('../utils/errorHandler');

const listarLotes = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT l.*, p.nombre as producto_nombre, p.codigo_barras as producto_codigo_barras, p.stock_minimo,
              p.precio_menor, p.precio_mayor, p.descuento_menor, p.descuento_mayor,
              m.nombre as marca_nombre, c.nombre as clasificacion_nombre,
              s.nombre as sucursal_nombre
       FROM lote l
       JOIN producto p ON l.id_producto = p.id_producto
       JOIN sucursal s ON l.id_sucursal = s.id_sucursal
       LEFT JOIN marca m ON p.id_marca = m.id_marca
       LEFT JOIN clasificacion_producto c ON p.id_clasificacion = c.id_clasificacion
       WHERE l.activo = 1
       ORDER BY l.fecha_vencimiento ASC, l.id_lote DESC`
    );
    if (!req.ability.can('ver_costo_lote', 'almacen')) {
      rows.forEach(r => { delete r.precio_por_caja; });
    }
    return res.json(rows);
  } catch (err) {
    console.error('[listarLotes]', err);
    return res.status(500).json({ error: 'Error al obtener inventario del almacén' });
  }
};

const obtenerLote = async (req, res) => {
  const { id } = req.params;
  try {
    const [loteRows] = await db.promise().query(
      `SELECT l.*, p.nombre as producto_nombre
       FROM lote l
       JOIN producto p ON l.id_producto = p.id_producto
       WHERE l.id_lote = ?`,
      [id]
    );
    if (loteRows.length === 0) return res.status(404).json({ error: 'Lote no encontrado' });
    const lote = loteRows[0];

    const [movimientos] = await db.promise().query(
      `SELECT m.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM movimiento_almacen m
       LEFT JOIN usuario u ON m.id_usuario = u.id_usuario
       WHERE m.id_lote = ?
       ORDER BY m.fecha_movimiento DESC`,
      [id]
    );
    lote.movimientos = movimientos;
    return res.json(lote);
  } catch (err) {
    console.error('[obtenerLote]', err);
    return res.status(500).json({ error: 'Error al obtener detalle del lote' });
  }
};

// Genera y guarda un código de barras propio del lote, si todavía no tiene
// (lotes creados antes de esta función, o cuyo código se quiera reimprimir).
const generarCodigoBarrasLote = async (req, res) => {
  const { id } = req.params;
  const idLoteNum = Number(id);
  if (!idLoteNum) return res.status(400).json({ error: 'ID inválido' });

  try {
    const [rows] = await db.promise().query('SELECT codigo_barras FROM lote WHERE id_lote = ? LIMIT 1', [idLoteNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lote no encontrado' });

    if (rows[0].codigo_barras) {
      return res.json({ codigo_barras: rows[0].codigo_barras, generado: false });
    }

    // Mismo esquema determinístico que al confirmar una compra: 100000 + id_lote,
    // fuera del rango de los códigos de producto (900000 + id_producto).
    const codigo = String(100000 + idLoteNum);
    await db.promise().query('UPDATE lote SET codigo_barras = ? WHERE id_lote = ?', [codigo, idLoteNum]);

    return res.json({ codigo_barras: codigo, generado: true });
  } catch (err) {
    console.error('[generarCodigoBarrasLote]', err);
    return res.status(500).json({ error: 'Error al generar el código de barras del lote' });
  }
};

const ajusteInventario = async (req, res) => {
  const { id } = req.params;
  const { nueva_cantidad_unidades, motivo } = req.body;
  const id_usuario = req.user.id_usuario;

  const nuevaCantidadNum = parseFloat(nueva_cantidad_unidades);
  if (nueva_cantidad_unidades === undefined || !motivo || !Number.isFinite(nuevaCantidadNum) || nuevaCantidadNum < 0) {
    return res.status(400).json({ error: 'Debe especificar una cantidad válida (>= 0) y el motivo' });
  }

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();
    const [loteInfo] = await conn.query(
      'SELECT stock_unidades, unidades_por_caja, id_sucursal FROM lote WHERE id_lote = ? FOR UPDATE',
      [id]
    );
    if (loteInfo.length === 0) throw new Error('Lote no encontrado');
    if (loteInfo[0].id_sucursal !== req.user.id_sucursal) {
      throw new Error('No puede ajustar inventario de otra sucursal');
    }

    const stockActual = loteInfo[0].stock_unidades;
    const diferencia = nuevaCantidadNum - stockActual;
    if (diferencia === 0) {
      await conn.rollback();
      conn.release();
      return res.json({ mensaje: 'No hay cambios en el inventario' });
    }

    const nuevasCajas = Math.floor(nuevaCantidadNum / loteInfo[0].unidades_por_caja);
    await conn.query(
      'UPDATE lote SET stock_unidades = ?, stock_cajas = ? WHERE id_lote = ?',
      [nuevaCantidadNum, nuevasCajas, id]
    );
    await conn.query(
      `INSERT INTO movimiento_almacen
        (id_lote, id_sucursal, id_usuario, tipo, motivo, cantidad_cajas, cantidad_unidades, referencia_tipo)
       VALUES (?, ?, ?, 'AJUSTE', ?, ?, ?, 'MANUAL')`,
      [id, loteInfo[0].id_sucursal, id_usuario, motivo,
       Math.floor(Math.abs(diferencia) / loteInfo[0].unidades_por_caja), Math.abs(diferencia)]
    );
    await conn.commit();
    return res.json({ mensaje: 'Ajuste de inventario realizado correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('[ajusteInventario]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al ajustar inventario') });
  } finally {
    conn.release();
  }
};

const crearLote = async (req, res) => {
  const id_usuario = req.user.id_usuario;
  const id_sucursal_usuario = req.user.id_sucursal;
  const {
    id_producto, id_sucursal, numero_lote, fecha_produccion, fecha_vencimiento,
    fecha_ingreso_almacen, cantidad_cajas, unidades_por_caja, precio_por_caja, observaciones
  } = req.body;

  if (!id_producto || !fecha_ingreso_almacen || !cantidad_cajas || !unidades_por_caja) {
    return res.status(400).json({ error: 'Producto, fecha de ingreso, cajas y unidades por caja son obligatorios' });
  }

  const sucursal = id_sucursal || id_sucursal_usuario;
  const cajas = parseInt(cantidad_cajas);
  const upc = parseInt(unidades_por_caja);
  const stock_unidades = cajas * upc;

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO lote (id_producto, id_sucursal, numero_lote, fecha_produccion, fecha_vencimiento,
        fecha_ingreso_almacen, cantidad_cajas, unidades_por_caja, precio_por_caja,
        stock_cajas, stock_unidades, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_producto, sucursal, numero_lote || null, fecha_produccion || null,
       fecha_vencimiento || null, fecha_ingreso_almacen, cajas, upc,
       precio_por_caja || 0, cajas, stock_unidades, observaciones || null]
    );
    const id_lote = result.insertId;
    await conn.query(
      `INSERT INTO movimiento_almacen
        (id_lote, id_sucursal, id_usuario, tipo, motivo, cantidad_cajas, cantidad_unidades, referencia_tipo)
       VALUES (?, ?, ?, 'ENTRADA', 'Ingreso manual de lote', ?, ?, 'MANUAL')`,
      [id_lote, sucursal, id_usuario, cajas, stock_unidades]
    );
    await conn.commit();
    return res.status(201).json({ mensaje: 'Lote ingresado correctamente', id_lote });
  } catch (err) {
    await conn.rollback();
    console.error('[crearLote]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al crear lote') });
  } finally {
    conn.release();
  }
};

const darBajaLote = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!motivo) return res.status(400).json({ error: 'El motivo es obligatorio' });

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();
    const [loteRows] = await conn.query(
      'SELECT stock_unidades, stock_cajas, id_sucursal FROM lote WHERE id_lote = ? AND activo = 1 FOR UPDATE',
      [id]
    );
    if (loteRows.length === 0) throw new Error('Lote no encontrado o ya dado de baja');

    const { stock_unidades, stock_cajas, id_sucursal } = loteRows[0];
    if (stock_unidades > 0) {
      await conn.query(
        `INSERT INTO movimiento_almacen
          (id_lote, id_sucursal, id_usuario, tipo, motivo, cantidad_cajas, cantidad_unidades, referencia_tipo)
         VALUES (?, ?, ?, 'SALIDA', ?, ?, ?, 'BAJA')`,
        [id, id_sucursal, id_usuario, motivo, stock_cajas, stock_unidades]
      );
    }
    await conn.query(
      'UPDATE lote SET activo = 0, stock_cajas = 0, stock_unidades = 0 WHERE id_lote = ?',
      [id]
    );
    await conn.commit();
    return res.json({ mensaje: 'Lote dado de baja correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('[darBajaLote]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al dar de baja el lote') });
  } finally {
    conn.release();
  }
};

const listarTraslados = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT t.*,
        l.numero_lote, l.id_sucursal as id_sucursal_origen,
        p.nombre as producto_nombre,
        s_orig.nombre as sucursal_origen,
        s_dest.nombre as sucursal_destino,
        u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM traslado t
       JOIN lote l ON t.id_lote_origen = l.id_lote
       JOIN producto p ON l.id_producto = p.id_producto
       JOIN sucursal s_orig ON l.id_sucursal = s_orig.id_sucursal
       JOIN sucursal s_dest ON t.id_sucursal_dest = s_dest.id_sucursal
       LEFT JOIN usuario u ON t.id_usuario = u.id_usuario
       ORDER BY t.fecha_traslado DESC
       LIMIT 100`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[listarTraslados]', err);
    return res.status(500).json({ error: 'Error al obtener traslados' });
  }
};

const crearTraslado = async (req, res) => {
  const { id_lote_origen, id_sucursal_dest, cantidad_cajas, cantidad_unidades, observaciones } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!id_lote_origen || !id_sucursal_dest) {
    return res.status(400).json({ error: 'Lote origen y sucursal destino son obligatorios' });
  }
  const cajas = parseInt(cantidad_cajas) || 0;
  const unidades = parseInt(cantidad_unidades) || 0;
  if (cajas === 0 && unidades === 0) {
    return res.status(400).json({ error: 'Debe especificar al menos una cantidad a trasladar' });
  }

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();
    const [loteRows] = await conn.query(
      'SELECT stock_cajas, stock_unidades, id_sucursal FROM lote WHERE id_lote = ? AND activo = 1 FOR UPDATE',
      [id_lote_origen]
    );
    if (loteRows.length === 0) throw new Error('Lote no encontrado o inactivo');

    const lote = loteRows[0];
    if (lote.id_sucursal === parseInt(id_sucursal_dest)) {
      throw new Error('La sucursal de destino debe ser diferente a la de origen');
    }
    if (cajas > lote.stock_cajas) {
      throw new Error(`Stock insuficiente. Cajas disponibles: ${lote.stock_cajas}`);
    }
    if (unidades > lote.stock_unidades) {
      throw new Error(`Stock insuficiente. Unidades disponibles: ${lote.stock_unidades}`);
    }

    const [result] = await conn.query(
      `INSERT INTO traslado (id_lote_origen, id_sucursal_dest, id_usuario, cantidad_cajas, cantidad_unidades, observaciones, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
      [id_lote_origen, id_sucursal_dest, id_usuario, cajas, unidades, observaciones || null]
    );
    await conn.commit();
    return res.status(201).json({ mensaje: 'Traslado creado. Confirme en destino para mover el stock.', id_traslado: result.insertId });
  } catch (err) {
    await conn.rollback();
    console.error('[crearTraslado]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al crear traslado') });
  } finally {
    conn.release();
  }
};

const confirmarTraslado = async (req, res) => {
  const { id } = req.params;
  const id_usuario = req.user.id_usuario;

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();
    const [trasRows] = await conn.query(
      'SELECT * FROM traslado WHERE id_traslado = ? AND estado = "PENDIENTE" FOR UPDATE',
      [id]
    );
    if (trasRows.length === 0) throw new Error('Traslado no encontrado o ya procesado');

    const t = trasRows[0];
    const [loteRows] = await conn.query(
      'SELECT * FROM lote WHERE id_lote = ? FOR UPDATE',
      [t.id_lote_origen]
    );
    const lote = loteRows[0];

    if (lote.stock_unidades < t.cantidad_unidades || lote.stock_cajas < t.cantidad_cajas) {
      throw new Error('Stock insuficiente en el lote de origen al momento de confirmar');
    }

    await conn.query(
      'UPDATE lote SET stock_cajas = stock_cajas - ?, stock_unidades = stock_unidades - ? WHERE id_lote = ?',
      [t.cantidad_cajas, t.cantidad_unidades, t.id_lote_origen]
    );
    await conn.query(
      `INSERT INTO movimiento_almacen
        (id_lote, id_sucursal, id_usuario, tipo, motivo, cantidad_cajas, cantidad_unidades, referencia_id, referencia_tipo)
       VALUES (?, ?, ?, 'TRASLADO', 'Salida por traslado confirmado', ?, ?, ?, 'TRASLADO')`,
      [t.id_lote_origen, lote.id_sucursal, id_usuario, t.cantidad_cajas, t.cantidad_unidades, id]
    );

    const [loteDestRows] = await conn.query(
      'SELECT id_lote FROM lote WHERE id_producto = ? AND id_sucursal = ? AND activo = 1 AND (numero_lote = ? OR numero_lote IS NULL) LIMIT 1',
      [lote.id_producto, t.id_sucursal_dest, lote.numero_lote]
    );

    let id_lote_dest;
    if (loteDestRows.length > 0) {
      id_lote_dest = loteDestRows[0].id_lote;
      await conn.query(
        'UPDATE lote SET stock_cajas = stock_cajas + ?, stock_unidades = stock_unidades + ? WHERE id_lote = ?',
        [t.cantidad_cajas, t.cantidad_unidades, id_lote_dest]
      );
    } else {
      const [r2] = await conn.query(
        `INSERT INTO lote (id_producto, id_sucursal, numero_lote, fecha_vencimiento, fecha_ingreso_almacen,
          cantidad_cajas, unidades_por_caja, precio_por_caja, stock_cajas, stock_unidades)
         VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
        [lote.id_producto, t.id_sucursal_dest, lote.numero_lote, lote.fecha_vencimiento,
         t.cantidad_cajas, lote.unidades_por_caja, lote.precio_por_caja,
         t.cantidad_cajas, t.cantidad_unidades]
      );
      id_lote_dest = r2.insertId;
    }

    await conn.query(
      `INSERT INTO movimiento_almacen
        (id_lote, id_sucursal, id_usuario, tipo, motivo, cantidad_cajas, cantidad_unidades, referencia_id, referencia_tipo)
       VALUES (?, ?, ?, 'ENTRADA', 'Entrada por traslado confirmado', ?, ?, ?, 'TRASLADO')`,
      [id_lote_dest, t.id_sucursal_dest, id_usuario, t.cantidad_cajas, t.cantidad_unidades, id]
    );

    await conn.query('UPDATE traslado SET estado = "CONFIRMADO" WHERE id_traslado = ?', [id]);
    await conn.commit();
    return res.json({ mensaje: 'Traslado confirmado y stock actualizado correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('[confirmarTraslado]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al confirmar traslado') });
  } finally {
    conn.release();
  }
};

const cancelarTraslado = async (req, res) => {
  const { id } = req.params;
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT id_traslado FROM traslado WHERE id_traslado = ? AND estado = "PENDIENTE" FOR UPDATE',
      [id]
    );
    if (rows.length === 0) throw new Error('Traslado no encontrado o ya procesado');
    await conn.query('UPDATE traslado SET estado = "CANCELADO" WHERE id_traslado = ?', [id]);
    await conn.commit();
    return res.json({ mensaje: 'Traslado cancelado correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('[cancelarTraslado]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al cancelar traslado') });
  } finally {
    conn.release();
  }
};

const listarAlertas = async (req, res) => {
  try {
    const [bajoStock] = await db.promise().query(
      `SELECT l.id_lote, l.numero_lote, l.stock_unidades, l.id_sucursal,
        p.nombre as producto_nombre, p.stock_minimo,
        s.nombre as sucursal_nombre
       FROM lote l
       JOIN producto p ON l.id_producto = p.id_producto
       JOIN sucursal s ON l.id_sucursal = s.id_sucursal
       WHERE l.activo = 1 AND p.stock_minimo > 0 AND l.stock_unidades < p.stock_minimo
       ORDER BY l.stock_unidades ASC`
    );
    let proxVencer = [];
    if (req.ability.can('ver_vencimientos', 'almacen')) {
      [proxVencer] = await db.promise().query(
        `SELECT l.id_lote, l.numero_lote, l.fecha_vencimiento, l.stock_unidades,
          p.nombre as producto_nombre,
          s.nombre as sucursal_nombre,
          DATEDIFF(l.fecha_vencimiento, CURDATE()) as dias_restantes
         FROM lote l
         JOIN producto p ON l.id_producto = p.id_producto
         JOIN sucursal s ON l.id_sucursal = s.id_sucursal
         WHERE l.activo = 1 AND l.fecha_vencimiento IS NOT NULL
           AND l.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
           AND l.stock_unidades > 0
         ORDER BY l.fecha_vencimiento ASC`
      );
    }
    return res.json({ bajo_stock: bajoStock, prox_vencer: proxVencer });
  } catch (err) {
    console.error('[listarAlertas]', err);
    return res.status(500).json({ error: 'Error al obtener alertas' });
  }
};

const listarProductosActivos = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT id_producto, nombre, codigo_barras FROM producto WHERE activo = 1 ORDER BY nombre ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('[listarProductosActivos]', err);
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
};

const listarSucursalesActivas = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT id_sucursal, nombre FROM sucursal WHERE activo = 1 ORDER BY nombre ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('[listarSucursalesActivas]', err);
    return res.status(500).json({ error: 'Error al obtener sucursales' });
  }
};

module.exports = {
  listarLotes,
  obtenerLote,
  generarCodigoBarrasLote,
  ajusteInventario,
  crearLote,
  darBajaLote,
  listarTraslados,
  crearTraslado,
  confirmarTraslado,
  cancelarTraslado,
  listarAlertas,
  listarProductosActivos,
  listarSucursalesActivas,
};
