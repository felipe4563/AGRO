const db = require('../config/db');

// Listar ventas a crédito con saldo pendiente > 0
const listar = async (req, res) => {
  const id_sucursal = req.user.id_sucursal;
  try {
    const [rows] = await db.promise().query(
      `SELECT
         v.id_venta, v.fecha_venta, v.total, v.monto_pagado,
         c.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.ci_nit,
         (v.total - v.monto_pagado - COALESCE(pc.total_abonado, 0)) AS saldo_pendiente
       FROM venta v
       LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
       LEFT JOIN (
         SELECT id_venta, SUM(monto) AS total_abonado
         FROM pago_credito
         GROUP BY id_venta
       ) pc ON pc.id_venta = v.id_venta
       WHERE v.metodo_pago = 'CREDITO' AND v.estado = 'COMPLETADA' AND v.id_sucursal = ?
       HAVING saldo_pendiente > 0
       ORDER BY v.fecha_venta ASC`,
      [id_sucursal]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[cobros.listar]', err);
    return res.status(500).json({ error: 'Error al obtener cuentas por cobrar' });
  }
};

// Detalle de una venta a crédito + historial de abonos
const obtener = async (req, res) => {
  const { id } = req.params;
  const id_sucursal = req.user.id_sucursal;
  try {
    const [ventaRows] = await db.promise().query(
      `SELECT v.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.ci_nit
       FROM venta v
       LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
       WHERE v.id_venta = ? AND v.metodo_pago = 'CREDITO' AND v.id_sucursal = ?`,
      [id, id_sucursal]
    );
    if (ventaRows.length === 0) return res.status(404).json({ error: 'Venta a crédito no encontrada' });

    const venta = ventaRows[0];

    const [pagos] = await db.promise().query(
      `SELECT pc.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
       FROM pago_credito pc
       LEFT JOIN usuario u ON pc.id_usuario = u.id_usuario
       WHERE pc.id_venta = ?
       ORDER BY pc.fecha_pago ASC`,
      [id]
    );

    const totalAbonado = pagos.reduce((acc, p) => acc + parseFloat(p.monto), 0);
    venta.pagos = pagos;
    venta.saldo_pendiente = parseFloat(venta.total) - parseFloat(venta.monto_pagado) - totalAbonado;

    return res.json(venta);
  } catch (err) {
    console.error('[cobros.obtener]', err);
    return res.status(500).json({ error: 'Error al obtener la venta a crédito' });
  }
};

// Registrar un abono a una venta a crédito
const registrarPago = async (req, res) => {
  const { id } = req.params; // id_venta
  const { monto, metodo_pago, observaciones } = req.body;
  const id_usuario = req.user.id_usuario;
  const id_sucursal = req.user.id_sucursal;

  const montoNum = parseFloat(monto);
  if (!montoNum || montoNum <= 0) {
    return res.status(400).json({ error: 'El monto del abono debe ser mayor a 0' });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [ventaRows] = await connection.query(
      `SELECT total, monto_pagado FROM venta WHERE id_venta = ? AND metodo_pago = 'CREDITO' AND estado = 'COMPLETADA' AND id_sucursal = ? FOR UPDATE`,
      [id, id_sucursal]
    );
    if (ventaRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Venta a crédito no encontrada' });
    }

    const [abonosRows] = await connection.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_abonado FROM pago_credito WHERE id_venta = ?`,
      [id]
    );
    const totalAbonado = parseFloat(abonosRows[0].total_abonado);
    const saldoPendiente = parseFloat(ventaRows[0].total) - parseFloat(ventaRows[0].monto_pagado) - totalAbonado;

    if (montoNum > saldoPendiente + 0.01) {
      await connection.rollback();
      return res.status(400).json({ error: `El abono excede el saldo pendiente (Bs ${saldoPendiente.toFixed(2)})` });
    }

    const [pagoResult] = await connection.query(
      `INSERT INTO pago_credito (id_venta, id_sucursal, id_usuario, monto, metodo_pago, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, id_sucursal, id_usuario, montoNum, metodo_pago || 'EFECTIVO', observaciones || null]
    );

    await connection.commit();
    return res.status(201).json({
      mensaje: 'Abono registrado correctamente',
      id_pago: pagoResult.insertId,
      saldo_pendiente: Math.max(0, saldoPendiente - montoNum),
    });
  } catch (err) {
    await connection.rollback();
    console.error('[cobros.registrarPago]', err);
    return res.status(500).json({ error: 'Error al registrar el abono' });
  } finally {
    connection.release();
  }
};

// Historial de abonos registrados (para poder reimprimir comprobantes pasados)
const listarHistorial = async (req, res) => {
  const id_sucursal = req.user.id_sucursal;
  try {
    const [rows] = await db.promise().query(
      `SELECT
         pc.id_pago, pc.id_venta, pc.monto, pc.metodo_pago, pc.fecha_pago,
         c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
         u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
       FROM pago_credito pc
       JOIN venta v ON pc.id_venta = v.id_venta
       LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
       LEFT JOIN usuario u ON pc.id_usuario = u.id_usuario
       WHERE pc.id_sucursal = ?
       ORDER BY pc.fecha_pago DESC
       LIMIT 200`,
      [id_sucursal]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[cobros.listarHistorial]', err);
    return res.status(500).json({ error: 'Error al obtener el historial de abonos' });
  }
};

// Comprobante de un abono puntual (para impresión)
const obtenerPago = async (req, res) => {
  const { id_pago } = req.params;
  const id_sucursal = req.user.id_sucursal;
  try {
    const [rows] = await db.promise().query(
      `SELECT
         pc.id_pago, pc.monto, pc.metodo_pago, pc.fecha_pago, pc.observaciones,
         u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
         v.id_venta, v.total AS venta_total, v.monto_pagado AS venta_monto_pagado, v.fecha_venta,
         c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.ci_nit,
         s.nombre AS sucursal_nombre, s.direccion AS sucursal_direccion,
         s.ciudad AS sucursal_ciudad, s.telefono AS sucursal_telefono
       FROM pago_credito pc
       JOIN venta v ON pc.id_venta = v.id_venta
       LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
       LEFT JOIN usuario u ON pc.id_usuario = u.id_usuario
       LEFT JOIN sucursal s ON pc.id_sucursal = s.id_sucursal
       WHERE pc.id_pago = ? AND pc.id_sucursal = ?`,
      [id_pago, id_sucursal]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Abono no encontrado' });

    const pago = rows[0];

    const [abonosPrevios] = await db.promise().query(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM pago_credito WHERE id_venta = ? AND fecha_pago <= ? AND id_pago <= ?`,
      [pago.id_venta, pago.fecha_pago, pago.id_pago]
    );
    const totalAbonadoHastaAhora = parseFloat(abonosPrevios[0].total);
    pago.saldo_anterior = parseFloat(pago.venta_total) - parseFloat(pago.venta_monto_pagado) - (totalAbonadoHastaAhora - parseFloat(pago.monto));
    pago.saldo_restante = pago.saldo_anterior - parseFloat(pago.monto);

    return res.json(pago);
  } catch (err) {
    console.error('[cobros.obtenerPago]', err);
    return res.status(500).json({ error: 'Error al obtener el comprobante del abono' });
  }
};

module.exports = {
  listar,
  obtener,
  registrarPago,
  listarHistorial,
  obtenerPago,
};
