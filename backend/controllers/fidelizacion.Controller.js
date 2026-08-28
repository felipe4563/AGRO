const db = require('../config/db');
const { mensajeSeguro } = require('../utils/errorHandler');

// ── Configuración ────────────────────────────────────────────────────────
const obtenerConfiguracion = async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT bs_por_punto FROM configuracion_fidelizacion WHERE id_config = 1');
    return res.json(rows[0] || { bs_por_punto: 10 });
  } catch (err) {
    console.error('[fidelizacion.obtenerConfiguracion]', err);
    return res.status(500).json({ error: 'Error al obtener la configuración' });
  }
};

const actualizarConfiguracion = async (req, res) => {
  const { bs_por_punto } = req.body ?? {};
  const valor = parseFloat(bs_por_punto);
  if (!valor || valor <= 0) return res.status(400).json({ error: 'Bs por punto debe ser mayor a 0' });
  try {
    await db.promise().query('UPDATE configuracion_fidelizacion SET bs_por_punto = ? WHERE id_config = 1', [valor]);
    return res.json({ mensaje: 'Configuración actualizada', bs_por_punto: valor });
  } catch (err) {
    console.error('[fidelizacion.actualizarConfiguracion]', err);
    return res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
};

// ── Recompensas ──────────────────────────────────────────────────────────
const listarRecompensas = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT r.*, p.nombre AS producto_nombre, c.nombre AS combo_nombre
       FROM recompensa r
       LEFT JOIN producto p ON r.id_producto = p.id_producto
       LEFT JOIN combo c ON r.id_combo = c.id_combo
       ORDER BY r.costo_puntos ASC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[fidelizacion.listarRecompensas]', err);
    return res.status(500).json({ error: 'Error al obtener recompensas' });
  }
};

const validarCamposTipo = (body) => {
  const { tipo, id_producto, id_combo, tipo_descuento, valor_descuento } = body;
  if (tipo === 'PRODUCTO') {
    if ((!id_producto && !id_combo) || (id_producto && id_combo)) {
      return 'Para tipo Producto/Combo, seleccione exactamente uno: un producto O un combo';
    }
  } else if (tipo === 'DESCUENTO') {
    if (!tipo_descuento || !['BS', 'PCT'].includes(tipo_descuento)) return 'Seleccione el tipo de descuento: Bs o %';
    if (!valor_descuento || valor_descuento <= 0) return 'El valor del descuento debe ser mayor a 0';
    if (tipo_descuento === 'PCT' && valor_descuento > 100) return 'El descuento en % no puede superar 100';
  } else {
    return 'Tipo de recompensa inválido';
  }
  return null;
};

const crearRecompensa = async (req, res) => {
  const { nombre, descripcion, costo_puntos, tipo, id_producto, id_combo, tipo_descuento, valor_descuento } = req.body ?? {};
  if (!nombre || !costo_puntos || costo_puntos <= 0) {
    return res.status(400).json({ error: 'Faltan datos: nombre y costo en puntos (mayor a 0)' });
  }
  const errorTipo = validarCamposTipo(req.body ?? {});
  if (errorTipo) return res.status(400).json({ error: errorTipo });

  try {
    const [result] = await db.promise().query(
      `INSERT INTO recompensa (nombre, descripcion, tipo, id_producto, id_combo, tipo_descuento, valor_descuento, costo_puntos, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nombre.trim(), descripcion ? descripcion.trim() : null, tipo,
        tipo === 'PRODUCTO' ? (id_producto || null) : null,
        tipo === 'PRODUCTO' ? (id_combo || null) : null,
        tipo === 'DESCUENTO' ? tipo_descuento : null,
        tipo === 'DESCUENTO' ? valor_descuento : null,
        costo_puntos,
      ]
    );
    return res.status(201).json({ mensaje: 'Recompensa creada', id_recompensa: result.insertId });
  } catch (err) {
    console.error('[fidelizacion.crearRecompensa]', err);
    return res.status(500).json({ error: 'Error al crear la recompensa' });
  }
};

const editarRecompensa = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, costo_puntos, tipo, id_producto, id_combo, tipo_descuento, valor_descuento } = req.body ?? {};
  try {
    const [existe] = await db.promise().query('SELECT id_recompensa FROM recompensa WHERE id_recompensa = ?', [id]);
    if (existe.length === 0) return res.status(404).json({ error: 'Recompensa no encontrada' });

    if (tipo !== undefined) {
      const errorTipo = validarCamposTipo(req.body ?? {});
      if (errorTipo) return res.status(400).json({ error: errorTipo });
    }

    const fields = [];
    const values = [];
    if (nombre !== undefined) { fields.push('nombre = ?'); values.push(nombre.trim()); }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); values.push(descripcion ? descripcion.trim() : null); }
    if (costo_puntos !== undefined) { fields.push('costo_puntos = ?'); values.push(costo_puntos); }
    if (tipo !== undefined) {
      fields.push('tipo = ?'); values.push(tipo);
      fields.push('id_producto = ?'); values.push(tipo === 'PRODUCTO' ? (id_producto || null) : null);
      fields.push('id_combo = ?'); values.push(tipo === 'PRODUCTO' ? (id_combo || null) : null);
      fields.push('tipo_descuento = ?'); values.push(tipo === 'DESCUENTO' ? tipo_descuento : null);
      fields.push('valor_descuento = ?'); values.push(tipo === 'DESCUENTO' ? valor_descuento : null);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay datos para actualizar' });

    values.push(id);
    await db.promise().query(`UPDATE recompensa SET ${fields.join(', ')} WHERE id_recompensa = ?`, values);
    return res.json({ mensaje: 'Recompensa actualizada' });
  } catch (err) {
    console.error('[fidelizacion.editarRecompensa]', err);
    return res.status(500).json({ error: 'Error al editar la recompensa' });
  }
};

const toggleActivoRecompensa = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body ?? {};
  const activoNum = activo === 1 || activo === '1' ? 1 : 0;
  try {
    const [rows] = await db.promise().query('SELECT id_recompensa FROM recompensa WHERE id_recompensa = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Recompensa no encontrada' });
    await db.promise().query('UPDATE recompensa SET activo = ? WHERE id_recompensa = ?', [activoNum, id]);
    return res.json({ mensaje: 'Estado actualizado', activo: activoNum });
  } catch (err) {
    console.error('[fidelizacion.toggleActivoRecompensa]', err);
    return res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

const eliminarRecompensa = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT id_recompensa FROM recompensa WHERE id_recompensa = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Recompensa no encontrada' });
    await db.promise().query('UPDATE recompensa SET activo = 0 WHERE id_recompensa = ?', [id]);
    return res.json({ mensaje: 'Recompensa desactivada' });
  } catch (err) {
    console.error('[fidelizacion.eliminarRecompensa]', err);
    return res.status(500).json({ error: 'Error al eliminar la recompensa' });
  }
};

// ── Cliente: saldo y movimientos ────────────────────────────────────────
const obtenerCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const [clienteRows] = await db.promise().query(
      'SELECT id_cliente, nombre, apellido, ci_nit, puntos_fidelidad FROM cliente WHERE id_cliente = ?', [id]
    );
    if (clienteRows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    const [movimientos] = await db.promise().query(
      `SELECT mp.*, r.nombre AS recompensa_nombre
       FROM movimiento_puntos mp
       LEFT JOIN canje c ON mp.id_canje = c.id_canje
       LEFT JOIN recompensa r ON c.id_recompensa = r.id_recompensa
       WHERE mp.id_cliente = ? ORDER BY mp.fecha DESC LIMIT 50`,
      [id]
    );

    const cliente = clienteRows[0];
    cliente.movimientos = movimientos;
    return res.json(cliente);
  } catch (err) {
    console.error('[fidelizacion.obtenerCliente]', err);
    return res.status(500).json({ error: 'Error al obtener el cliente' });
  }
};

// Descuenta stock FIFO de un producto puntual (usado para canjes fuera de una venta)
const descontarStockFIFO = async (connection, id_producto, cantidadUnidades, id_sucursal, id_usuario, referencia_id) => {
  const [lotes] = await connection.query(
    `SELECT id_lote, stock_unidades, unidades_por_caja FROM lote
     WHERE id_producto = ? AND id_sucursal = ? AND stock_unidades > 0 AND activo = 1
     ORDER BY fecha_vencimiento ASC, id_lote ASC FOR UPDATE`,
    [id_producto, id_sucursal]
  );
  const disponible = lotes.reduce((acc, l) => acc + l.stock_unidades, 0);
  if (disponible < cantidadUnidades) {
    throw new Error(`Stock insuficiente para entregar la recompensa (producto ID ${id_producto})`);
  }
  let restante = cantidadUnidades;
  for (const lote of lotes) {
    if (restante <= 0) break;
    const descontar = Math.min(restante, lote.stock_unidades);
    const nuevoStock = lote.stock_unidades - descontar;
    const nuevasCajas = Math.floor(nuevoStock / lote.unidades_por_caja);
    await connection.query('UPDATE lote SET stock_unidades = ?, stock_cajas = ? WHERE id_lote = ?', [nuevoStock, nuevasCajas, lote.id_lote]);
    await connection.query(
      `INSERT INTO movimiento_almacen (id_lote, id_sucursal, id_usuario, tipo, motivo, cantidad_cajas, cantidad_unidades, referencia_id, referencia_tipo)
       VALUES (?, ?, ?, 'SALIDA', 'CANJE FIDELIZACION', ?, ?, ?, 'CANJE')`,
      [lote.id_lote, id_sucursal, id_usuario, Math.floor(descontar / lote.unidades_por_caja), descontar, referencia_id]
    );
    restante -= descontar;
  }
};

// ── Canje independiente (sin venta): solo recompensas tipo PRODUCTO ──────
const canjear = async (req, res) => {
  const { id_cliente, id_recompensa } = req.body ?? {};
  const id_usuario = req.user.id_usuario;
  const id_sucursal = req.user.id_sucursal;

  if (!id_cliente || !id_recompensa) {
    return res.status(400).json({ error: 'Faltan datos: id_cliente e id_recompensa' });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [clienteRows] = await connection.query('SELECT puntos_fidelidad FROM cliente WHERE id_cliente = ? FOR UPDATE', [id_cliente]);
    if (clienteRows.length === 0) { await connection.rollback(); return res.status(404).json({ error: 'Cliente no encontrado' }); }

    const [recompensaRows] = await connection.query('SELECT * FROM recompensa WHERE id_recompensa = ? AND activo = 1', [id_recompensa]);
    if (recompensaRows.length === 0) { await connection.rollback(); return res.status(404).json({ error: 'Recompensa no encontrada o inactiva' }); }

    const recompensa = recompensaRows[0];
    if (recompensa.tipo !== 'PRODUCTO') {
      await connection.rollback();
      return res.status(400).json({ error: 'Las recompensas de tipo Descuento solo se canjean durante una venta en el POS' });
    }

    const puntosDisponibles = clienteRows[0].puntos_fidelidad;
    if (puntosDisponibles < recompensa.costo_puntos) {
      await connection.rollback();
      return res.status(400).json({ error: `Puntos insuficientes. Disponibles: ${puntosDisponibles}, requeridos: ${recompensa.costo_puntos}` });
    }

    const [canjeResult] = await connection.query(
      'INSERT INTO canje (id_cliente, id_recompensa, id_usuario, id_sucursal, puntos_usados) VALUES (?, ?, ?, ?, ?)',
      [id_cliente, id_recompensa, id_usuario, id_sucursal, recompensa.costo_puntos]
    );
    const id_canje = canjeResult.insertId;

    // Entregar el producto/combo: descontar stock real
    if (recompensa.id_producto) {
      await descontarStockFIFO(connection, recompensa.id_producto, 1, id_sucursal, id_usuario, id_canje);
    } else if (recompensa.id_combo) {
      const [componentes] = await connection.query('SELECT id_producto, cantidad FROM combo_producto WHERE id_combo = ?', [recompensa.id_combo]);
      for (const comp of componentes) {
        await descontarStockFIFO(connection, comp.id_producto, comp.cantidad, id_sucursal, id_usuario, id_canje);
      }
    }

    await connection.query('UPDATE cliente SET puntos_fidelidad = puntos_fidelidad - ? WHERE id_cliente = ?', [recompensa.costo_puntos, id_cliente]);

    await connection.query(
      `INSERT INTO movimiento_puntos (id_cliente, tipo, puntos, id_canje, descripcion) VALUES (?, 'CANJEADO', ?, ?, ?)`,
      [id_cliente, -recompensa.costo_puntos, id_canje, `Canje: ${recompensa.nombre}`]
    );

    await connection.commit();
    return res.status(201).json({
      mensaje: 'Canje registrado correctamente',
      id_canje,
      saldo_restante: puntosDisponibles - recompensa.costo_puntos,
    });
  } catch (err) {
    await connection.rollback();
    console.error('[fidelizacion.canjear]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al procesar el canje') });
  } finally {
    connection.release();
  }
};

module.exports = {
  obtenerConfiguracion,
  actualizarConfiguracion,
  listarRecompensas,
  crearRecompensa,
  editarRecompensa,
  toggleActivoRecompensa,
  eliminarRecompensa,
  obtenerCliente,
  canjear,
};
