const db = require('../config/db');

// Listar compras a crédito con saldo pendiente > 0
const listar = async (req, res) => {
  const id_sucursal = req.user.id_sucursal;
  try {
    const [rows] = await db.promise().query(
      `SELECT
         c.id_compra, c.fecha_compra, c.total, c.monto_pagado,
         p.id_proveedor, p.empresa AS proveedor_nombre, p.nit,
         (c.total - c.monto_pagado - COALESCE(pp.total_abonado, 0)) AS saldo_pendiente
       FROM compra c
       LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
       LEFT JOIN (
         SELECT id_compra, SUM(monto) AS total_abonado
         FROM pago_proveedor
         GROUP BY id_compra
       ) pp ON pp.id_compra = c.id_compra
       WHERE c.metodo_pago = 'CREDITO' AND c.estado = 'RECIBIDO' AND c.id_sucursal = ?
       HAVING saldo_pendiente > 0
       ORDER BY c.fecha_compra ASC`,
      [id_sucursal]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[cuentasPagar.listar]', err);
    return res.status(500).json({ error: 'Error al obtener cuentas por pagar' });
  }
};

// Detalle de una compra a crédito + historial de abonos
const obtener = async (req, res) => {
  const { id } = req.params;
  const id_sucursal = req.user.id_sucursal;
  try {
    const [compraRows] = await db.promise().query(
      `SELECT c.*, p.empresa AS proveedor_nombre, p.nit
       FROM compra c
       LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
       WHERE c.id_compra = ? AND c.metodo_pago = 'CREDITO' AND c.id_sucursal = ?`,
      [id, id_sucursal]
    );
    if (compraRows.length === 0) return res.status(404).json({ error: 'Compra a crédito no encontrada' });

    const compra = compraRows[0];

    const [pagos] = await db.promise().query(
      `SELECT pp.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
       FROM pago_proveedor pp
       LEFT JOIN usuario u ON pp.id_usuario = u.id_usuario
       WHERE pp.id_compra = ?
       ORDER BY pp.fecha_pago ASC`,
      [id]
    );

    const totalAbonado = pagos.reduce((acc, p) => acc + parseFloat(p.monto), 0);
    compra.pagos = pagos;
    compra.saldo_pendiente = parseFloat(compra.total) - parseFloat(compra.monto_pagado) - totalAbonado;

    return res.json(compra);
  } catch (err) {
    console.error('[cuentasPagar.obtener]', err);
    return res.status(500).json({ error: 'Error al obtener la compra a crédito' });
  }
};

// Registrar un abono a una compra a crédito
const registrarPago = async (req, res) => {
  const { id } = req.params; // id_compra
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

    const [compraRows] = await connection.query(
      `SELECT total, monto_pagado FROM compra WHERE id_compra = ? AND metodo_pago = 'CREDITO' AND estado = 'RECIBIDO' AND id_sucursal = ? FOR UPDATE`,
      [id, id_sucursal]
    );
    if (compraRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Compra a crédito no encontrada' });
    }

    const [abonosRows] = await connection.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_abonado FROM pago_proveedor WHERE id_compra = ?`,
      [id]
    );
    const totalAbonado = parseFloat(abonosRows[0].total_abonado);
    const saldoPendiente = parseFloat(compraRows[0].total) - parseFloat(compraRows[0].monto_pagado) - totalAbonado;

    if (montoNum > saldoPendiente + 0.01) {
      await connection.rollback();
      return res.status(400).json({ error: `El abono excede el saldo pendiente (Bs ${saldoPendiente.toFixed(2)})` });
    }

    const [pagoResult] = await connection.query(
      `INSERT INTO pago_proveedor (id_compra, id_sucursal, id_usuario, monto, metodo_pago, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, id_sucursal, id_usuario, montoNum, metodo_pago || 'EFECTIVO', observaciones || null]
    );

    await connection.commit();
    return res.status(201).json({
      mensaje: 'Abono registrado correctamente',
      id_pago_proveedor: pagoResult.insertId,
      saldo_pendiente: Math.max(0, saldoPendiente - montoNum),
    });
  } catch (err) {
    await connection.rollback();
    console.error('[cuentasPagar.registrarPago]', err);
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
         pp.id_pago_proveedor, pp.id_compra, pp.monto, pp.metodo_pago, pp.fecha_pago,
         p.empresa AS proveedor_nombre,
         u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
       FROM pago_proveedor pp
       JOIN compra c ON pp.id_compra = c.id_compra
       LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
       LEFT JOIN usuario u ON pp.id_usuario = u.id_usuario
       WHERE pp.id_sucursal = ?
       ORDER BY pp.fecha_pago DESC
       LIMIT 200`,
      [id_sucursal]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[cuentasPagar.listarHistorial]', err);
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
         pp.id_pago_proveedor, pp.monto, pp.metodo_pago, pp.fecha_pago, pp.observaciones,
         u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
         c.id_compra, c.total AS compra_total, c.monto_pagado AS compra_monto_pagado, c.fecha_compra,
         p.empresa AS proveedor_nombre, p.nit,
         s.nombre AS sucursal_nombre, s.direccion AS sucursal_direccion,
         s.ciudad AS sucursal_ciudad, s.telefono AS sucursal_telefono
       FROM pago_proveedor pp
       JOIN compra c ON pp.id_compra = c.id_compra
       LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
       LEFT JOIN usuario u ON pp.id_usuario = u.id_usuario
       LEFT JOIN sucursal s ON pp.id_sucursal = s.id_sucursal
       WHERE pp.id_pago_proveedor = ? AND pp.id_sucursal = ?`,
      [id_pago, id_sucursal]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Abono no encontrado' });

    const pago = rows[0];

    const [abonosPrevios] = await db.promise().query(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM pago_proveedor WHERE id_compra = ? AND fecha_pago <= ? AND id_pago_proveedor <= ?`,
      [pago.id_compra, pago.fecha_pago, pago.id_pago_proveedor]
    );
    const totalAbonadoHastaAhora = parseFloat(abonosPrevios[0].total);
    pago.saldo_anterior = parseFloat(pago.compra_total) - parseFloat(pago.compra_monto_pagado) - (totalAbonadoHastaAhora - parseFloat(pago.monto));
    pago.saldo_restante = pago.saldo_anterior - parseFloat(pago.monto);

    return res.json(pago);
  } catch (err) {
    console.error('[cuentasPagar.obtenerPago]', err);
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
