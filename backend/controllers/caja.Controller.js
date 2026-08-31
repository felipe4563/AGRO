const db = require('../config/db');
const { mensajeSeguro } = require('../utils/errorHandler');

const listarCajas = async (req, res) => {
  try {
    const puedeVerTodas = req.user.permisos.includes('caja.ver_todas');
    let query = `SELECT c.*, s.nombre as sucursal_nombre
                 FROM caja c
                 JOIN sucursal s ON c.id_sucursal = s.id_sucursal`;
    const params = [];
    if (!puedeVerTodas) {
      query += ' WHERE c.id_sucursal = ?';
      params.push(req.user.id_sucursal);
    }
    query += ' ORDER BY c.id_sucursal, c.nombre';
    const [rows] = await db.promise().query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al listar cajas' });
  }
};

const crearCaja = async (req, res) => {
  const { nombre, descripcion, id_sucursal } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  const sucursal = id_sucursal || req.user.id_sucursal;
  try {
    const [result] = await db.promise().query(
      'INSERT INTO caja (id_sucursal, nombre, descripcion) VALUES (?, ?, ?)',
      [sucursal, nombre.trim(), descripcion || null]
    );
    return res.status(201).json({ mensaje: 'Caja creada', id_caja: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear caja' });
  }
};

const editarCaja = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const puedeVerTodas = req.user.permisos.includes('caja.ver_todas');
    const [rows] = await db.promise().query('SELECT id_sucursal FROM caja WHERE id_caja = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
    if (!puedeVerTodas && rows[0].id_sucursal !== req.user.id_sucursal) {
      return res.status(403).json({ error: 'No puede editar una caja de otra sucursal' });
    }
    await db.promise().query(
      'UPDATE caja SET nombre = ?, descripcion = ? WHERE id_caja = ?',
      [nombre.trim(), descripcion || null, id]
    );
    return res.json({ mensaje: 'Caja actualizada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al editar caja' });
  }
};

const toggleCaja = async (req, res) => {
  const { id } = req.params;
  try {
    const puedeVerTodas = req.user.permisos.includes('caja.ver_todas');
    const [rows] = await db.promise().query('SELECT activo, id_sucursal FROM caja WHERE id_caja = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
    if (!puedeVerTodas && rows[0].id_sucursal !== req.user.id_sucursal) {
      return res.status(403).json({ error: 'No puede modificar una caja de otra sucursal' });
    }
    const nuevoEstado = rows[0].activo ? 0 : 1;
    await db.promise().query('UPDATE caja SET activo = ? WHERE id_caja = ?', [nuevoEstado, id]);
    return res.json({ mensaje: `Caja ${nuevoEstado ? 'activada' : 'desactivada'}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al cambiar estado de caja' });
  }
};

const listarTurnos = async (req, res) => {
  try {
    const puedeVerTodas = req.user.permisos.includes('caja.ver_todas');
    let query = `SELECT ac.*, c.nombre as caja_nombre, s.nombre as sucursal_nombre,
                        u.nombre as usuario_nombre, u.apellido as usuario_apellido
                 FROM apertura_cierre_caja ac
                 JOIN caja c ON ac.id_caja = c.id_caja
                 JOIN sucursal s ON ac.id_sucursal = s.id_sucursal
                 JOIN usuario u ON ac.id_usuario = u.id_usuario`;
    const params = [];
    if (!puedeVerTodas) {
      query += ' WHERE ac.id_sucursal = ?';
      params.push(req.user.id_sucursal);
    }
    query += ' ORDER BY ac.fecha_apertura DESC LIMIT 200';
    const [rows] = await db.promise().query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al listar turnos' });
  }
};

const obtenerTurnoActivo = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT ac.*, c.nombre as caja_nombre,
              u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM apertura_cierre_caja ac
       JOIN caja c ON ac.id_caja = c.id_caja
       JOIN usuario u ON ac.id_usuario = u.id_usuario
       WHERE ac.id_sucursal = ? AND ac.estado = 'ABIERTA'
       ORDER BY ac.fecha_apertura DESC LIMIT 1`,
      [req.user.id_sucursal]
    );
    return res.json(rows.length === 0 ? null : rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener turno activo' });
  }
};

const abrirCaja = async (req, res) => {
  const { id_caja, monto_inicial, observaciones } = req.body;
  if (!id_caja) return res.status(400).json({ error: 'Debe seleccionar una caja' });
  try {
    const [abiertos] = await db.promise().query(
      `SELECT id_apertura FROM apertura_cierre_caja WHERE id_sucursal = ? AND estado = 'ABIERTA'`,
      [req.user.id_sucursal]
    );
    if (abiertos.length > 0) {
      return res.status(400).json({ error: 'Ya existe un turno abierto en esta sucursal. Cierre el turno actual primero.' });
    }
    const [cajaRows] = await db.promise().query(
      'SELECT id_caja FROM caja WHERE id_caja = ? AND id_sucursal = ? AND activo = 1',
      [id_caja, req.user.id_sucursal]
    );
    if (cajaRows.length === 0) {
      return res.status(400).json({ error: 'Caja no válida para esta sucursal' });
    }
    const [result] = await db.promise().query(
      `INSERT INTO apertura_cierre_caja (id_caja, id_usuario, id_sucursal, monto_inicial, observaciones)
       VALUES (?, ?, ?, ?, ?)`,
      [id_caja, req.user.id_usuario, req.user.id_sucursal, parseFloat(monto_inicial) || 0, observaciones || null]
    );
    return res.status(201).json({ mensaje: 'Turno abierto correctamente', id_apertura: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al abrir turno' });
  }
};

const cerrarCaja = async (req, res) => {
  const { id } = req.params;
  const { monto_final, observaciones } = req.body;
  try {
    const [turnoRows] = await db.promise().query(
      `SELECT * FROM apertura_cierre_caja WHERE id_apertura = ? AND id_sucursal = ? AND estado = 'ABIERTA'`,
      [id, req.user.id_sucursal]
    );
    if (turnoRows.length === 0) {
      return res.status(404).json({ error: 'Turno no encontrado o ya cerrado' });
    }
    const turno = turnoRows[0];

    // Cada cajero cierra su propio turno; 'cerrar_todas' habilita cerrar el
    // de otro usuario (respaldo del Administrador si el cajero no está disponible).
    if (turno.id_usuario !== req.user.id_usuario && !req.ability.can('cerrar_todas', 'caja')) {
      return res.status(403).json({ error: 'Solo el cajero que abrió este turno puede cerrarlo' });
    }

    const [ventasRows] = await db.promise().query(
      `SELECT COALESCE(SUM(total), 0) as total_efectivo
       FROM venta
       WHERE id_sucursal = ? AND metodo_pago = 'EFECTIVO' AND estado = 'COMPLETADA'
             AND fecha_venta >= ?`,
      [req.user.id_sucursal, turno.fecha_apertura]
    );
    const [abonosRows] = await db.promise().query(
      `SELECT COALESCE(SUM(monto), 0) as total_abonos
       FROM pago_credito
       WHERE id_sucursal = ? AND metodo_pago = 'EFECTIVO'
             AND fecha_pago >= ?`,
      [req.user.id_sucursal, turno.fecha_apertura]
    );
    const [gastosRows] = await db.promise().query(
      `SELECT COALESCE(SUM(monto), 0) as total_gastos FROM gasto_caja WHERE id_apertura = ? AND metodo_pago = 'EFECTIVO'`,
      [id]
    );
    const totalEfectivo = parseFloat(ventasRows[0].total_efectivo) || 0;
    const totalAbonosEfectivo = parseFloat(abonosRows[0].total_abonos) || 0;
    const totalGastos = parseFloat(gastosRows[0].total_gastos) || 0;
    const monto_esperado = parseFloat(turno.monto_inicial) + totalEfectivo + totalAbonosEfectivo - totalGastos;
    const monto_final_num = parseFloat(monto_final) || 0;
    const diferencia = monto_final_num - monto_esperado;

    await db.promise().query(
      `UPDATE apertura_cierre_caja
       SET monto_esperado = ?, monto_final = ?, diferencia = ?,
           observaciones = ?, fecha_cierre = NOW(), estado = 'CERRADA'
       WHERE id_apertura = ?`,
      [monto_esperado, monto_final_num, diferencia, observaciones || null, id]
    );
    return res.json({ mensaje: 'Turno cerrado correctamente', monto_esperado, monto_final: monto_final_num, diferencia });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al cerrar turno' });
  }
};

// ── Gastos de caja (imprevistos u otros egresos de efectivo durante el turno) ──
const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'OTRO'];

const registrarGasto = async (req, res) => {
  const { concepto, monto, metodo_pago, observaciones } = req.body ?? {};
  if (!concepto || !concepto.trim()) return res.status(400).json({ error: 'El concepto del gasto es obligatorio' });
  const montoNum = parseFloat(monto);
  if (!montoNum || montoNum <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  const metodoPagoNorm = METODOS_PAGO.includes(metodo_pago) ? metodo_pago : 'EFECTIVO';

  try {
    const [turnoRows] = await db.promise().query(
      `SELECT id_apertura FROM apertura_cierre_caja WHERE id_sucursal = ? AND estado = 'ABIERTA' LIMIT 1`,
      [req.user.id_sucursal]
    );
    const idApertura = turnoRows.length > 0 ? turnoRows[0].id_apertura : null;
    const [result] = await db.promise().query(
      `INSERT INTO gasto_caja (id_apertura, id_sucursal, id_usuario, concepto, monto, metodo_pago, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idApertura, req.user.id_sucursal, req.user.id_usuario, concepto.trim(), montoNum, metodoPagoNorm, observaciones || null]
    );
    return res.status(201).json({ mensaje: 'Gasto registrado', id_gasto: result.insertId });
  } catch (err) {
    console.error('[caja.registrarGasto]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al registrar el gasto') });
  }
};

const listarGastos = async (req, res) => {
  const { id_apertura } = req.query;
  try {
    let idApertura = id_apertura ? Number(id_apertura) : null;
    if (!idApertura) {
      const [turnoRows] = await db.promise().query(
        `SELECT id_apertura FROM apertura_cierre_caja WHERE id_sucursal = ? AND estado = 'ABIERTA' LIMIT 1`,
        [req.user.id_sucursal]
      );
      if (turnoRows.length === 0) return res.json([]);
      idApertura = turnoRows[0].id_apertura;
    }
    const puedeVerTodas = req.user.permisos.includes('caja.ver_todas');
    const [turnoCheck] = await db.promise().query(
      'SELECT id_sucursal FROM apertura_cierre_caja WHERE id_apertura = ?', [idApertura]
    );
    if (turnoCheck.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });
    if (!puedeVerTodas && turnoCheck[0].id_sucursal !== req.user.id_sucursal) {
      return res.status(403).json({ error: 'No puede ver gastos de otra sucursal' });
    }
    const [rows] = await db.promise().query(
      `SELECT g.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
       FROM gasto_caja g
       JOIN usuario u ON g.id_usuario = u.id_usuario
       WHERE g.id_apertura = ?
       ORDER BY g.fecha_gasto DESC`,
      [idApertura]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[caja.listarGastos]', err);
    return res.status(500).json({ error: 'Error al listar gastos' });
  }
};

// ── Resumen completo de un turno (para imprimir al cerrar o reimprimir del historial) ──
const obtenerResumenTurno = async (req, res) => {
  const { id } = req.params;
  try {
    const puedeVerTodas = req.user.permisos.includes('caja.ver_todas');
    const [turnoRows] = await db.promise().query(
      `SELECT ac.*, c.nombre AS caja_nombre, s.nombre AS sucursal_nombre,
              s.direccion AS sucursal_direccion, s.ciudad AS sucursal_ciudad, s.telefono AS sucursal_telefono,
              u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
       FROM apertura_cierre_caja ac
       JOIN caja c ON ac.id_caja = c.id_caja
       JOIN sucursal s ON ac.id_sucursal = s.id_sucursal
       JOIN usuario u ON ac.id_usuario = u.id_usuario
       WHERE ac.id_apertura = ?`,
      [id]
    );
    if (turnoRows.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });
    const turno = turnoRows[0];
    if (!puedeVerTodas && turno.id_sucursal !== req.user.id_sucursal) {
      return res.status(403).json({ error: 'No puede ver el resumen de un turno de otra sucursal' });
    }

    const desde = turno.fecha_apertura;
    const hasta = turno.fecha_cierre || new Date();

    const [ventasPorMetodo] = await db.promise().query(
      `SELECT metodo_pago, COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS total
       FROM venta
       WHERE id_sucursal = ? AND estado = 'COMPLETADA' AND fecha_venta BETWEEN ? AND ?
       GROUP BY metodo_pago`,
      [turno.id_sucursal, desde, hasta]
    );

    const [productosVendidos] = await db.promise().query(
      `SELECT p.nombre AS producto_nombre,
              SUM(d.cantidad) AS cantidad,
              COALESCE(SUM(d.subtotal), 0) AS subtotal
       FROM detalle_venta d
       JOIN venta v ON d.id_venta = v.id_venta
       JOIN producto p ON d.id_producto = p.id_producto
       WHERE v.id_sucursal = ? AND v.estado = 'COMPLETADA' AND v.fecha_venta BETWEEN ? AND ?
       GROUP BY d.id_producto, p.nombre
       ORDER BY subtotal DESC`,
      [turno.id_sucursal, desde, hasta]
    );

    const [abonosPorMetodo] = await db.promise().query(
      `SELECT metodo_pago, COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS total
       FROM pago_credito
       WHERE id_sucursal = ? AND fecha_pago BETWEEN ? AND ?
       GROUP BY metodo_pago`,
      [turno.id_sucursal, desde, hasta]
    );

    const [abonosDetalle] = await db.promise().query(
      `SELECT pc.id_pago, pc.id_venta, pc.monto, pc.metodo_pago, pc.fecha_pago,
              c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
       FROM pago_credito pc
       JOIN venta v ON pc.id_venta = v.id_venta
       LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
       WHERE pc.id_sucursal = ? AND pc.fecha_pago BETWEEN ? AND ?
       ORDER BY pc.fecha_pago ASC`,
      [turno.id_sucursal, desde, hasta]
    );

    const [creditosGenerados] = await db.promise().query(
      `SELECT v.id_venta, v.fecha_venta, v.total, v.monto_pagado,
              c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
              (v.total - v.monto_pagado - COALESCE(pc.total_abonado, 0)) AS saldo_pendiente
       FROM venta v
       LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
       LEFT JOIN (
         SELECT id_venta, SUM(monto) AS total_abonado FROM pago_credito GROUP BY id_venta
       ) pc ON pc.id_venta = v.id_venta
       WHERE v.metodo_pago = 'CREDITO' AND v.estado = 'COMPLETADA' AND v.id_sucursal = ?
             AND v.fecha_venta BETWEEN ? AND ?
       ORDER BY v.fecha_venta ASC`,
      [turno.id_sucursal, desde, hasta]
    );

    const [gastos] = await db.promise().query(
      `SELECT g.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
       FROM gasto_caja g
       JOIN usuario u ON g.id_usuario = u.id_usuario
       WHERE g.id_apertura = ?
       ORDER BY g.fecha_gasto ASC`,
      [id]
    );

    const totalVentas = ventasPorMetodo.reduce((acc, v) => acc + parseFloat(v.total), 0);
    const totalAbonos = abonosPorMetodo.reduce((acc, a) => acc + parseFloat(a.total), 0);
    const totalGastos = gastos.reduce((acc, g) => acc + parseFloat(g.monto), 0);
    const totalCreditosPendiente = creditosGenerados.reduce((acc, c) => acc + Math.max(0, parseFloat(c.saldo_pendiente)), 0);

    return res.json({
      turno,
      ventas_por_metodo: ventasPorMetodo,
      total_ventas: totalVentas,
      productos_vendidos: productosVendidos,
      abonos_por_metodo: abonosPorMetodo,
      total_abonos: totalAbonos,
      abonos_detalle: abonosDetalle,
      creditos_generados: creditosGenerados,
      total_creditos_pendiente: totalCreditosPendiente,
      gastos,
      total_gastos: totalGastos,
    });
  } catch (err) {
    console.error('[caja.obtenerResumenTurno]', err);
    return res.status(500).json({ error: 'Error al obtener el resumen del turno' });
  }
};

// ── Libro de caja (ledger consolidado de ingresos y egresos) ──
const obtenerLibroCaja = async (req, res) => {
  try {
    const puedeVerTodas = req.user.permisos.includes('caja.ver_todas');
    const idSucursal = puedeVerTodas && req.query.id_sucursal ? Number(req.query.id_sucursal) : req.user.id_sucursal;

    const hoy = new Date().toISOString().split('T')[0];
    const desde = req.query.desde || hoy;
    const hasta = req.query.hasta || hoy;
    const desdeFecha = `${desde} 00:00:00`;
    const hastaFecha = `${hasta} 23:59:59`;

    const [rows] = await db.promise().query(
      `SELECT * FROM (
        SELECT v.fecha_venta AS fecha, 'INGRESO' AS tipo, 'VENTA' AS origen,
               CONCAT('Venta #', v.id_venta, IF(v.estado = 'ANULADA', ' (anulada)', '')) AS concepto,
               v.metodo_pago, v.total AS monto
        FROM venta v
        WHERE v.id_sucursal = ? AND v.estado IN ('COMPLETADA', 'ANULADA') AND v.metodo_pago <> 'CREDITO'
              AND v.fecha_venta BETWEEN ? AND ?

        UNION ALL

        -- Reversión de efectivo al momento real en que se anuló la venta (no en la fecha de venta),
        -- para que el Libro de Caja muestre el ciclo completo venta → anulación y el saldo cuadre.
        SELECT v.fecha_anulacion AS fecha, 'EGRESO' AS tipo, 'ANULACION' AS origen,
               CONCAT('Anulación de venta #', v.id_venta) AS concepto, v.metodo_pago, v.total AS monto
        FROM venta v
        WHERE v.id_sucursal = ? AND v.estado = 'ANULADA' AND v.metodo_pago <> 'CREDITO'
              AND v.fecha_anulacion BETWEEN ? AND ?

        UNION ALL

        SELECT pc.fecha_pago AS fecha, 'INGRESO' AS tipo, 'ABONO' AS origen,
               CONCAT('Abono crédito - ', COALESCE(CONCAT(cl.nombre, ' ', cl.apellido), 'Cliente casual'), ' (Venta #', pc.id_venta, ')') AS concepto,
               pc.metodo_pago, pc.monto AS monto
        FROM pago_credito pc
        LEFT JOIN venta v ON pc.id_venta = v.id_venta
        LEFT JOIN cliente cl ON v.id_cliente = cl.id_cliente
        WHERE pc.id_sucursal = ? AND pc.fecha_pago BETWEEN ? AND ?

        UNION ALL

        SELECT g.fecha_gasto AS fecha, 'EGRESO' AS tipo, 'GASTO' AS origen,
               CONCAT('Gasto: ', g.concepto) AS concepto, g.metodo_pago, g.monto AS monto
        FROM gasto_caja g
        WHERE g.id_sucursal = ? AND g.fecha_gasto BETWEEN ? AND ?

        UNION ALL

        SELECT CAST(c.fecha_compra AS DATETIME) AS fecha, 'EGRESO' AS tipo, 'COMPRA' AS origen,
               CONCAT('Compra #', c.id_compra, COALESCE(CONCAT(' - ', p.empresa), '')) AS concepto,
               c.metodo_pago, c.total AS monto
        FROM compra c
        LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
        WHERE c.id_sucursal = ? AND c.estado = 'RECIBIDO' AND c.fecha_compra BETWEEN ? AND ?
      ) libro
      WHERE (? IS NULL OR metodo_pago = ?) AND (? IS NULL OR tipo = ?)
      ORDER BY fecha ASC, origen ASC`,
      [
        idSucursal, desdeFecha, hastaFecha,
        idSucursal, desdeFecha, hastaFecha,
        idSucursal, desdeFecha, hastaFecha,
        idSucursal, desdeFecha, hastaFecha,
        idSucursal, desde, hasta,
        req.query.metodo_pago || null, req.query.metodo_pago || null,
        req.query.tipo || null, req.query.tipo || null,
      ]
    );

    let saldo = 0;
    const movimientos = rows
      .map((r) => {
        const monto = parseFloat(r.monto);
        saldo += r.tipo === 'INGRESO' ? monto : -monto;
        return { ...r, monto, saldo_acumulado: saldo };
      })
      .reverse(); // más recientes primero, saldo ya calculado en orden cronológico

    const totalIngresos = movimientos.filter((m) => m.tipo === 'INGRESO').reduce((acc, m) => acc + m.monto, 0);
    const totalEgresos = movimientos.filter((m) => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.monto, 0);

    return res.json({
      movimientos,
      total_ingresos: totalIngresos,
      total_egresos: totalEgresos,
      saldo_neto: totalIngresos - totalEgresos,
    });
  } catch (err) {
    console.error('[caja.obtenerLibroCaja]', err);
    return res.status(500).json({ error: 'Error al obtener el libro de caja' });
  }
};

module.exports = {
  listarCajas, crearCaja, editarCaja, toggleCaja, listarTurnos, obtenerTurnoActivo, abrirCaja, cerrarCaja,
  registrarGasto, listarGastos, obtenerResumenTurno, obtenerLibroCaja,
};
