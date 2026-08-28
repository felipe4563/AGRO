const db = require('../config/db');
const { mensajeSeguro } = require('../utils/errorHandler');

// ==========================================
// MÓDULO DE VENTAS
// ==========================================
const obtenerReporteVentas = async (req, res) => {
  const { fechaInicio, fechaFin, id_usuario, id_producto, id_cliente } = req.query;
  const tipo = req.params.tipo || req.query.tipo;
  const sucursalId = req.user?.id_sucursal;

  try {
    let query = '';
    let params = [];

    // Base WHERE
    let whereClause = `v.estado = 'COMPLETADA' AND v.id_sucursal = ?`;
    params.push(sucursalId);

    if (fechaInicio && fechaFin) {
      whereClause += ` AND DATE(v.fecha_venta) BETWEEN ? AND ?`;
      params.push(fechaInicio, fechaFin);
    }
    if (id_usuario) {
      whereClause += ` AND v.id_usuario = ?`;
      params.push(id_usuario);
    }
    if (id_cliente) {
      whereClause += ` AND v.id_cliente = ?`;
      params.push(id_cliente);
    }

    switch (tipo) {
      case 'diarias':
        query = `
          SELECT DATE(v.fecha_venta) as fecha, COUNT(v.id_venta) as total_operaciones, SUM(v.total) as total_ingresos
          FROM venta v
          WHERE ${whereClause}
          GROUP BY DATE(v.fecha_venta)
          ORDER BY fecha DESC
        `;
        break;
      
      case 'rango':
        query = `
          SELECT v.id_venta, v.fecha_venta, v.nro_factura, v.total, 
                 c.nombre as cliente_nombre, c.apellido as cliente_apellido,
                 u.nombre as vendedor_nombre, u.apellido as vendedor_apellido
          FROM venta v
          LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
          JOIN usuario u ON v.id_usuario = u.id_usuario
          WHERE ${whereClause}
          ORDER BY v.fecha_venta DESC
        `;
        break;

      case 'vendedor':
        query = `
          SELECT u.id_usuario, u.nombre, u.apellido, COUNT(v.id_venta) as cantidad_ventas, SUM(v.total) as total_vendido
          FROM venta v
          JOIN usuario u ON v.id_usuario = u.id_usuario
          WHERE ${whereClause}
          GROUP BY u.id_usuario, u.nombre, u.apellido
          ORDER BY total_vendido DESC
        `;
        break;

      case 'producto':
        // En producto, requerimos un JOIN adicional
        let productoWhere = whereClause;
        if (id_producto) {
          productoWhere += ` AND d.id_producto = ?`;
          params.push(id_producto);
        }
        
        query = `
          SELECT p.id_producto, p.nombre, p.codigo_barras, 
                 SUM(
                   CASE WHEN d.tipo_cantidad = 'CAJA' THEN d.cantidad * l.unidades_por_caja ELSE d.cantidad END
                 ) as unidades_vendidas,
                 SUM(d.subtotal) as total_generado
          FROM detalle_venta d
          JOIN venta v ON d.id_venta = v.id_venta
          JOIN producto p ON d.id_producto = p.id_producto
          JOIN lote l ON d.id_lote = l.id_lote
          WHERE ${productoWhere}
          GROUP BY p.id_producto, p.nombre, p.codigo_barras
          ORDER BY total_generado DESC
        `;
        break;

      case 'cliente':
        query = `
          SELECT c.id_cliente, c.nombre, c.apellido, c.ci_nit, COUNT(v.id_venta) as compras_realizadas, SUM(v.total) as total_gastado
          FROM venta v
          JOIN cliente c ON v.id_cliente = c.id_cliente
          WHERE ${whereClause} AND v.id_cliente IS NOT NULL
          GROUP BY c.id_cliente, c.nombre, c.apellido, c.ci_nit
          ORDER BY total_gastado DESC
        `;
        break;

      default:
        return res.status(400).json({ error: 'Tipo de reporte de venta no válido.' });
    }

    const [rows] = await db.promise().query(query, params);
    
    // Totales estadísticos rápidos
    let resumen = { total_registros: rows.length };
    
    if (tipo === 'diarias' || tipo === 'vendedor' || tipo === 'cliente') {
      resumen.suma_total = rows.reduce((acc, r) => acc + parseFloat(r.total_ingresos || r.total_vendido || r.total_gastado || 0), 0);
    } else if (tipo === 'rango') {
      resumen.suma_total = rows.reduce((acc, r) => acc + parseFloat(r.total), 0);
    } else if (tipo === 'producto') {
      resumen.suma_total = rows.reduce((acc, r) => acc + parseFloat(r.total_generado), 0);
      resumen.unidades_total = rows.reduce((acc, r) => acc + parseFloat(r.unidades_vendidas), 0);
    }

    return res.json({ data: rows, resumen });
  } catch (err) {
    console.error('Error en obtenerReporteVentas:', err);
    return res.status(500).json({ error: 'Error interno al generar el reporte de ventas.' });
  }
};

// ==========================================
// MÓDULO DE COMPRAS
// ==========================================
const obtenerReporteCompras = async (req, res) => {
  const { fechaInicio, fechaFin, id_proveedor } = req.query;
  const tipo = req.params.tipo || req.query.tipo;
  const sucursalId = req.user?.id_sucursal;

  try {
    let query = '';
    let params = [];

    let whereClause = `c.estado != 'CANCELADO' AND c.id_sucursal = ?`;
    params.push(sucursalId);

    if (fechaInicio && fechaFin) {
      whereClause += ` AND DATE(c.fecha_compra) BETWEEN ? AND ?`;
      params.push(fechaInicio, fechaFin);
    }
    if (id_proveedor) {
      whereClause += ` AND c.id_proveedor = ?`;
      params.push(id_proveedor);
    }

    if (tipo === 'generales') {
      query = `
        SELECT c.id_compra, c.fecha_compra, c.estado, c.total,
               p.empresa
        FROM compra c
        JOIN proveedor p ON c.id_proveedor = p.id_proveedor
        WHERE ${whereClause}
        ORDER BY c.fecha_compra DESC
      `;
    } else if (tipo === 'proveedor') {
      query = `
        SELECT p.id_proveedor, p.empresa, p.nit, COUNT(c.id_compra) as cantidad_compras, SUM(c.total) as total_comprado
        FROM compra c
        JOIN proveedor p ON c.id_proveedor = p.id_proveedor
        WHERE ${whereClause}
        GROUP BY p.id_proveedor, p.empresa, p.nit
        ORDER BY total_comprado DESC
      `;
    } else {
      return res.status(400).json({ error: 'Tipo de reporte de compras no válido.' });
    }

    const [rows] = await db.promise().query(query, params);
    
    let resumen = { 
      total_registros: rows.length,
      suma_total: rows.reduce((acc, r) => acc + parseFloat(r.total || r.total_comprado || 0), 0)
    };

    return res.json({ data: rows, resumen });
  } catch (err) {
    console.error('Error en obtenerReporteCompras:', err);
    return res.status(500).json({ error: 'Error interno al generar el reporte de compras.' });
  }
};

// ==========================================
// MÓDULO DE INVENTARIO
// ==========================================
const obtenerReporteInventario = async (req, res) => {
  const { id_producto } = req.query;
  const tipo = req.params.tipo || req.query.tipo;
  const sucursalId = req.user?.id_sucursal;

  try {
    let query = '';
    let params = [];

    switch (tipo) {
      case 'actual':
      case 'valorizado':
        query = `
          SELECT p.id_producto, p.nombre, p.codigo_barras, c.nombre as categoria,
                 SUM(l.stock_unidades) as stock_total_unidades,
                 SUM(l.stock_unidades * l.precio_por_caja / l.unidades_por_caja) as costo_total_estimado
          FROM lote l
          JOIN producto p ON l.id_producto = p.id_producto
          LEFT JOIN clasificacion_producto c ON p.id_clasificacion = c.id_clasificacion
          WHERE l.id_sucursal = ? AND l.activo = 1 AND l.stock_unidades > 0
          GROUP BY p.id_producto, p.nombre, p.codigo_barras, c.nombre
          ORDER BY p.nombre ASC
        `;
        params.push(sucursalId);
        break;

      case 'stock_bajo':
        // LEFT JOIN (no INNER): un producto sin ningún lote en la sucursal tiene
        // 0 de stock y es justamente el caso más urgente de "stock bajo" — antes
        // quedaba invisible porque el INNER JOIN lo excluía por completo.
        query = `
          SELECT p.id_producto, p.nombre, p.codigo_barras, p.stock_minimo,
                 COALESCE(SUM(l.stock_unidades), 0) as stock_total_unidades
          FROM producto p
          LEFT JOIN lote l ON l.id_producto = p.id_producto AND l.id_sucursal = ? AND l.activo = 1
          WHERE p.activo = 1
          GROUP BY p.id_producto, p.nombre, p.codigo_barras, p.stock_minimo
          HAVING stock_total_unidades <= p.stock_minimo
          ORDER BY stock_total_unidades ASC
        `;
        params.push(sucursalId);
        break;

      case 'vencimientos':
        query = `
          SELECT l.id_lote, l.numero_lote, l.fecha_vencimiento, l.stock_unidades,
                 p.nombre as producto_nombre, DATEDIFF(l.fecha_vencimiento, CURDATE()) as dias_restantes
          FROM lote l
          JOIN producto p ON l.id_producto = p.id_producto
          WHERE l.id_sucursal = ? AND l.activo = 1 AND l.stock_unidades > 0
            AND l.fecha_vencimiento IS NOT NULL
            AND DATEDIFF(l.fecha_vencimiento, CURDATE()) <= 30
          ORDER BY dias_restantes ASC
        `;
        params.push(sucursalId);
        break;

      case 'kardex':
        if (!id_producto) return res.status(400).json({ error: 'Debe especificar un producto para el kardex' });
        query = `
          SELECT m.id_movimiento, m.fecha_movimiento as fecha, m.tipo, m.motivo, m.cantidad_unidades, m.referencia_id, m.referencia_tipo,
                 l.numero_lote, u.nombre as usuario_nombre
          FROM movimiento_almacen m
          JOIN lote l ON m.id_lote = l.id_lote
          JOIN usuario u ON m.id_usuario = u.id_usuario
          WHERE m.id_sucursal = ? AND l.id_producto = ?
          ORDER BY m.fecha_movimiento DESC
        `;
        params.push(sucursalId, id_producto);
        break;

      default:
        return res.status(400).json({ error: 'Tipo de reporte de inventario no válido.' });
    }

    const [rows] = await db.promise().query(query, params);
    
    let resumen = { total_registros: rows.length };
    if (tipo === 'valorizado') {
      resumen.valor_total = rows.reduce((acc, r) => acc + parseFloat(r.costo_total_estimado || 0), 0);
    }

    return res.json({ data: rows, resumen });
  } catch (err) {
    console.error('Error en obtenerReporteInventario:', err);
    return res.status(500).json({ error: 'Error interno al generar el reporte de inventario.' });
  }
};

// ==========================================
// MÓDULO DE GANANCIAS (Dashboard original mantenido para UI)
// ==========================================
const obtenerResumenFinanciero = async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  const sucursalId = req.query.id_sucursal || req.user?.id_sucursal;

  try {
    let ventaFechaClause = '';
    let ventaFechaParams = [];
    let compraFechaClause = '';
    let compraFechaParams = [];

    if (fechaInicio && fechaFin) {
      ventaFechaClause  = 'AND DATE(fecha_venta)  BETWEEN ? AND ?';
      ventaFechaParams  = [fechaInicio, fechaFin];
      compraFechaClause = 'AND DATE(fecha_compra) BETWEEN ? AND ?';
      compraFechaParams = [fechaInicio, fechaFin];
    } else {
      ventaFechaClause  = 'AND MONTH(fecha_venta)  = MONTH(CURDATE()) AND YEAR(fecha_venta)  = YEAR(CURDATE())';
      compraFechaClause = 'AND MONTH(fecha_compra) = MONTH(CURDATE()) AND YEAR(fecha_compra) = YEAR(CURDATE())';
    }

    const [ventasRows] = await db.promise().query(
      `SELECT COALESCE(SUM(total), 0) as total_ventas
       FROM venta WHERE estado = 'COMPLETADA' AND id_sucursal = ? ${ventaFechaClause}`,
      [sucursalId, ...ventaFechaParams]
    );

    const [comprasRows] = await db.promise().query(
      `SELECT COALESCE(SUM(total), 0) as total_compras
       FROM compra WHERE estado != 'CANCELADO' AND id_sucursal = ? ${compraFechaClause}`,
      [sucursalId, ...compraFechaParams]
    );

    const [ventasHoyRows] = await db.promise().query(
      `SELECT COUNT(*) as cantidad_ventas_hoy, COALESCE(SUM(total), 0) as ingresos_hoy
       FROM venta WHERE estado = 'COMPLETADA' AND id_sucursal = ? AND DATE(fecha_venta) = CURDATE()`,
      [sucursalId]
    );

    return res.json({
      ingresos_mes:        ventasRows[0].total_ventas,
      egresos_mes:         comprasRows[0].total_compras,
      utilidad_bruta_mes:  ventasRows[0].total_ventas - comprasRows[0].total_compras,
      ventas_hoy_cantidad: ventasHoyRows[0].cantidad_ventas_hoy,
      ingresos_hoy:        ventasHoyRows[0].ingresos_hoy
    });
  } catch (err) {
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al obtener el resumen del dashboard') });
  }
};

const obtenerTopProductos = async (req, res) => {
  const { id_sucursal, ordenar_por } = req.query;
  const sucursalId = id_sucursal || req.user?.id_sucursal;
  const orderColumn = ordenar_por === 'ingresos' ? 'ingresos_generados' : 'unidades_vendidas';

  try {
    const [rows] = await db.promise().query(`
      SELECT p.id_producto, p.nombre, p.codigo_barras,
        SUM(CASE WHEN d.tipo_cantidad = 'CAJA' THEN d.cantidad * l.unidades_por_caja ELSE d.cantidad END) as unidades_vendidas,
        SUM(d.subtotal) as ingresos_generados
      FROM detalle_venta d
      JOIN venta v ON d.id_venta = v.id_venta
      JOIN producto p ON d.id_producto = p.id_producto
      JOIN lote l ON d.id_lote = l.id_lote
      WHERE v.estado = 'COMPLETADA' AND v.id_sucursal = ?
      GROUP BY p.id_producto, p.nombre, p.codigo_barras
      ORDER BY ${orderColumn} DESC LIMIT 10
    `, [sucursalId]);

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al obtener el top de productos') });
  }
};

const obtenerAlertasVencimiento = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT l.id_lote, l.numero_lote, l.fecha_vencimiento, l.stock_unidades, p.nombre as producto_nombre,
             DATEDIFF(l.fecha_vencimiento, CURDATE()) as dias_restantes
      FROM lote l
      JOIN producto p ON l.id_producto = p.id_producto
      WHERE l.activo = 1 AND l.stock_unidades > 0 AND l.fecha_vencimiento IS NOT NULL AND DATEDIFF(l.fecha_vencimiento, CURDATE()) <= 30
      ORDER BY dias_restantes ASC
    `);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al obtener alertas de vencimiento') });
  }
};

// ==========================================
// GANANCIAS POR PRODUCTO
// ==========================================
const obtenerReporteGananciasProducto = async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  const sucursalId = req.user?.id_sucursal;

  try {
    let whereClause = `v.estado = 'COMPLETADA' AND v.id_sucursal = ?`;
    const params = [sucursalId];

    if (fechaInicio && fechaFin) {
      whereClause += ` AND DATE(v.fecha_venta) BETWEEN ? AND ?`;
      params.push(fechaInicio, fechaFin);
    }

    const query = `
      SELECT p.id_producto, p.nombre, p.codigo_barras,
        SUM(CASE WHEN dv.tipo_cantidad = 'CAJA' THEN dv.cantidad * l.unidades_por_caja ELSE dv.cantidad END) as unidades_vendidas,
        SUM(dv.subtotal) as total_ingresos,
        SUM(CASE WHEN dv.tipo_cantidad = 'CAJA'
          THEN dv.cantidad * l.precio_por_caja
          ELSE dv.cantidad * (l.precio_por_caja / l.unidades_por_caja)
        END) as costo_total,
        SUM(dv.subtotal) - SUM(CASE WHEN dv.tipo_cantidad = 'CAJA'
          THEN dv.cantidad * l.precio_por_caja
          ELSE dv.cantidad * (l.precio_por_caja / l.unidades_por_caja)
        END) as ganancia_bruta
      FROM detalle_venta dv
      JOIN venta v ON dv.id_venta = v.id_venta
      JOIN producto p ON dv.id_producto = p.id_producto
      JOIN lote l ON dv.id_lote = l.id_lote
      WHERE ${whereClause}
      GROUP BY p.id_producto, p.nombre, p.codigo_barras
      ORDER BY ganancia_bruta DESC
    `;

    const [rows] = await db.promise().query(query, params);
    const resumen = {
      total_registros: rows.length,
      total_ingresos: rows.reduce((a, r) => a + parseFloat(r.total_ingresos || 0), 0),
      costo_total:    rows.reduce((a, r) => a + parseFloat(r.costo_total || 0), 0),
      ganancia_total: rows.reduce((a, r) => a + parseFloat(r.ganancia_bruta || 0), 0)
    };

    return res.json({ data: rows, resumen });
  } catch (err) {
    console.error('Error en obtenerReporteGananciasProducto:', err);
    return res.status(500).json({ error: 'Error interno al generar reporte de ganancias por producto.' });
  }
};

// ==========================================
// TRASLADOS ENTRE SUCURSALES
// ==========================================
const obtenerReporteTraslados = async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  const sucursalId = req.user?.id_sucursal;

  try {
    let whereClause = `(l.id_sucursal = ? OR t.id_sucursal_dest = ?)`;
    const params = [sucursalId, sucursalId];

    if (fechaInicio && fechaFin) {
      whereClause += ` AND DATE(t.fecha_traslado) BETWEEN ? AND ?`;
      params.push(fechaInicio, fechaFin);
    }

    const query = `
      SELECT t.id_traslado, t.fecha_traslado, t.estado, t.observaciones,
        t.cantidad_cajas, t.cantidad_unidades,
        p.nombre as producto_nombre,
        l.numero_lote,
        s_orig.nombre as sucursal_origen,
        s_dest.nombre as sucursal_destino,
        u.nombre as usuario_nombre, u.apellido as usuario_apellido
      FROM traslado t
      JOIN lote l ON t.id_lote_origen = l.id_lote
      JOIN producto p ON l.id_producto = p.id_producto
      JOIN sucursal s_orig ON l.id_sucursal = s_orig.id_sucursal
      JOIN sucursal s_dest ON t.id_sucursal_dest = s_dest.id_sucursal
      JOIN usuario u ON t.id_usuario = u.id_usuario
      WHERE ${whereClause}
      ORDER BY t.fecha_traslado DESC
    `;

    const [rows] = await db.promise().query(query, params);
    return res.json({ data: rows, resumen: { total_registros: rows.length } });
  } catch (err) {
    console.error('Error en obtenerReporteTraslados:', err);
    return res.status(500).json({ error: 'Error interno al generar reporte de traslados.' });
  }
};

// ==========================================
// COMPARATIVO ENTRE SUCURSALES
// ==========================================
const obtenerReporteComparativoSucursales = async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;

  try {
    const params = [];
    let ventaJoinWhere = `v.estado = 'COMPLETADA'`;

    if (fechaInicio && fechaFin) {
      ventaJoinWhere += ` AND DATE(v.fecha_venta) BETWEEN ? AND ?`;
      params.push(fechaInicio, fechaFin);
    }

    const query = `
      SELECT s.id_sucursal, s.nombre as sucursal, s.ciudad,
        COUNT(DISTINCT v.id_venta) as total_ventas,
        COALESCE(SUM(v.total), 0) as total_ingresos,
        COALESCE(SUM(v.descuento_total), 0) as total_descuentos,
        COALESCE(SUM(v.total), 0) - COALESCE(SUM(
          CASE WHEN dv.tipo_cantidad = 'CAJA'
            THEN dv.cantidad * l.precio_por_caja
            ELSE dv.cantidad * (l.precio_por_caja / l.unidades_por_caja)
          END
        ), 0) as ganancia_bruta
      FROM sucursal s
      LEFT JOIN venta v ON s.id_sucursal = v.id_sucursal AND ${ventaJoinWhere}
      LEFT JOIN detalle_venta dv ON v.id_venta = dv.id_venta
      LEFT JOIN lote l ON dv.id_lote = l.id_lote
      WHERE s.activo = 1
      GROUP BY s.id_sucursal, s.nombre, s.ciudad
      ORDER BY total_ingresos DESC
    `;

    const [rows] = await db.promise().query(query, params);
    const resumen = {
      total_registros: rows.length,
      total_global: rows.reduce((a, r) => a + parseFloat(r.total_ingresos || 0), 0)
    };

    return res.json({ data: rows, resumen });
  } catch (err) {
    console.error('Error en obtenerReporteComparativoSucursales:', err);
    return res.status(500).json({ error: 'Error interno al generar comparativo de sucursales.' });
  }
};

// ==========================================
// ARQUEOS DE CAJA
// ==========================================
const obtenerReporteCaja = async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  const sucursalId = req.user?.id_sucursal;

  try {
    let whereClause = `acc.id_sucursal = ?`;
    const params = [sucursalId];

    if (fechaInicio && fechaFin) {
      whereClause += ` AND DATE(acc.fecha_apertura) BETWEEN ? AND ?`;
      params.push(fechaInicio, fechaFin);
    }

    const query = `
      SELECT acc.id_apertura, acc.fecha_apertura, acc.fecha_cierre,
        acc.monto_inicial, acc.monto_esperado, acc.monto_final, acc.diferencia,
        acc.estado, acc.observaciones,
        c.nombre as caja_nombre,
        u.nombre as cajero_nombre, u.apellido as cajero_apellido
      FROM apertura_cierre_caja acc
      JOIN caja c ON acc.id_caja = c.id_caja
      JOIN usuario u ON acc.id_usuario = u.id_usuario
      WHERE ${whereClause}
      ORDER BY acc.fecha_apertura DESC
    `;

    const [rows] = await db.promise().query(query, params);
    const resumen = {
      total_registros: rows.length,
      total_diferencia: rows.reduce((a, r) => a + parseFloat(r.diferencia || 0), 0),
      arqueos_con_diferencia: rows.filter(r => parseFloat(r.diferencia || 0) !== 0).length
    };

    return res.json({ data: rows, resumen });
  } catch (err) {
    console.error('Error en obtenerReporteCaja:', err);
    return res.status(500).json({ error: 'Error interno al generar reporte de caja.' });
  }
};

module.exports = {
  obtenerReporteVentas,
  obtenerReporteCompras,
  obtenerReporteInventario,
  obtenerResumenFinanciero,
  obtenerTopProductos,
  obtenerAlertasVencimiento,
  obtenerReporteGananciasProducto,
  obtenerReporteTraslados,
  obtenerReporteComparativoSucursales,
  obtenerReporteCaja
};
