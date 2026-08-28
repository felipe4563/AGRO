const db = require('../config/db');
const { mensajeSeguro } = require('../utils/errorHandler');

// Listar compras con datos del proveedor y usuario
const listar = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT c.*, p.empresa as proveedor_nombre, u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM compra c
       LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
       LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
       ORDER BY c.fecha_compra DESC, c.id_compra DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener compras' });
  }
};

// Obtener detalle completo de una compra
const obtener = async (req, res) => {
  const { id } = req.params;
  try {
    const [compraRows] = await db.promise().query(
      `SELECT c.*, p.empresa as proveedor_nombre, u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM compra c
       LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
       LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
       WHERE c.id_compra = ?`, 
      [id]
    );

    if (compraRows.length === 0) return res.status(404).json({ error: 'Compra no encontrada' });
    
    const compra = compraRows[0];

    const [detalleRows] = await db.promise().query(
      `SELECT d.*, prod.nombre as producto_nombre, prod.codigo_barras, prod.precio_menor
       FROM detalle_compra d
       JOIN producto prod ON d.id_producto = prod.id_producto
       WHERE d.id_compra = ?`,
      [id]
    );

    compra.detalles = detalleRows;
    return res.json(compra);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener la compra' });
  }
};

// Crear nueva compra (Transacción)
const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'OTRO'];

const crear = async (req, res) => {
  const { id_proveedor, nro_factura, fecha_compra, subtotal, descuento, total, metodo_pago, observaciones, detalles } = req.body;
  const id_usuario = req.user.id_usuario;
  const id_sucursal = req.user.id_sucursal; // Sucursal del usuario actual
  const metodoPagoNorm = METODOS_PAGO.includes(metodo_pago) ? metodo_pago : 'EFECTIVO';

  if (!id_proveedor || !detalles || detalles.length === 0) {
    return res.status(400).json({ error: 'Faltan datos requeridos (proveedor o detalles)' });
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insertar Cabecera
    const [compraResult] = await connection.query(
      `INSERT INTO compra (id_proveedor, id_sucursal, id_usuario, nro_factura, fecha_compra, subtotal, descuento, total, metodo_pago, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?)`,
      [id_proveedor, id_sucursal, id_usuario, nro_factura || null, fecha_compra, subtotal, descuento, total, metodoPagoNorm, observaciones || null]
    );

    const id_compra = compraResult.insertId;

    // 2. Insertar Detalles
    for (const item of detalles) {
      await connection.query(
        `INSERT INTO detalle_compra 
          (id_compra, id_producto, numero_lote_fab, fecha_produccion, fecha_vencimiento, cantidad_cajas, unidades_por_caja, precio_por_caja, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_compra,
          item.id_producto,
          item.numero_lote_fab || null,
          item.fecha_produccion || null,
          item.fecha_vencimiento || null,
          item.cantidad_cajas,
          item.unidades_por_caja,
          item.precio_por_caja,
          item.subtotal
        ]
      );
    }

    await connection.commit();
    return res.status(201).json({ mensaje: 'Compra registrada como PENDIENTE', id_compra });

  } catch (err) {
    await connection.rollback();
    console.error('Error al crear compra:', err);
    return res.status(500).json({ error: 'Error al registrar la compra' });
  } finally {
    connection.release();
  }
};

// Confirmar Compra -> Generar Lotes y Movimientos de Almacén
const confirmar = async (req, res) => {
  const { id } = req.params;
  const id_usuario = req.user.id_usuario;

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verificar estado actual
    const [compraRows] = await connection.query('SELECT estado, id_sucursal FROM compra WHERE id_compra = ? FOR UPDATE', [id]);
    if (compraRows.length === 0) throw new Error('Compra no encontrada');
    if (compraRows[0].estado !== 'PENDIENTE') throw new Error('La compra no está en estado PENDIENTE');

    const id_sucursal = compraRows[0].id_sucursal;

    // 2. Obtener detalles
    const [detalles] = await connection.query('SELECT * FROM detalle_compra WHERE id_compra = ?', [id]);

    // 3. Procesar cada detalle
    for (const det of detalles) {
      const stock_unidades = det.cantidad_cajas * det.unidades_por_caja;
      
      // a. Crear el Lote
      const [loteResult] = await connection.query(
        `INSERT INTO lote 
          (id_producto, id_sucursal, numero_lote, fecha_produccion, fecha_vencimiento, fecha_ingreso_almacen, cantidad_cajas, unidades_por_caja, precio_por_caja, stock_cajas, stock_unidades)
         VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
        [
          det.id_producto, id_sucursal, det.numero_lote_fab, det.fecha_produccion, det.fecha_vencimiento,
          det.cantidad_cajas, det.unidades_por_caja, det.precio_por_caja, det.cantidad_cajas, stock_unidades
        ]
      );
      const id_lote_nuevo = loteResult.insertId;

      // b. Actualizar el detalle de compra con el id_lote generado
      await connection.query(
        'UPDATE detalle_compra SET id_lote = ? WHERE id_detalle_compra = ?',
        [id_lote_nuevo, det.id_detalle_compra]
      );

      // c. Registrar movimiento de almacén
      await connection.query(
        `INSERT INTO movimiento_almacen 
          (id_lote, id_sucursal, id_usuario, tipo, motivo, cantidad_cajas, cantidad_unidades, referencia_id, referencia_tipo)
         VALUES (?, ?, ?, 'ENTRADA', 'INGRESO POR COMPRA', ?, ?, ?, 'COMPRA')`,
        [id_lote_nuevo, id_sucursal, id_usuario, det.cantidad_cajas, stock_unidades, id]
      );
    }

    // 4. Actualizar estado de la compra
    await connection.query('UPDATE compra SET estado = "RECIBIDO" WHERE id_compra = ?', [id]);

    await connection.commit();
    return res.json({ mensaje: 'Compra confirmada. Lotes ingresados al almacén correctamente.' });

  } catch (err) {
    await connection.rollback();
    console.error('Error al confirmar compra:', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al confirmar la compra') });
  } finally {
    connection.release();
  }
};

// Anular compra (Solo si está PENDIENTE por ahora, para no complicar el recalculo de stock si ya se vendió algo del lote)
const anular = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query('SELECT estado FROM compra WHERE id_compra = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Compra no encontrada' });
    
    if (rows[0].estado === 'RECIBIDO') {
      return res.status(400).json({ error: 'No se puede anular una compra ya RECIBIDA en esta versión. Debe hacer un ajuste de inventario manual.' });
    }
    
    if (rows[0].estado === 'ANULADA') {
      return res.status(400).json({ error: 'La compra ya está anulada.' });
    }

    await db.promise().query('UPDATE compra SET estado = "ANULADA" WHERE id_compra = ?', [id]);
    return res.json({ mensaje: 'Compra anulada correctamente' });

  } catch (err) {
    return res.status(500).json({ error: 'Error al anular compra' });
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  confirmar,
  anular
};
