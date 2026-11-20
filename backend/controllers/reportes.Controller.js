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
  const { id_producto, id_marca, id_clasificacion } = req.query;
  const tipo = req.params.tipo || req.query.tipo;
  const sucursalId = req.user?.id_sucursal;

  try {
    let query = '';
    let params = [];

    switch (tipo) {
      case 'global': {
        // Reporte comparativo entre TODAS las sucursales por diseño: no se filtra por sucursal aquí.
        let filtroProductoClause = '';
        if (id_producto)      { filtroProductoClause += ' AND p.id_producto = ?';      params.push(id_producto); }
        if (id_marca)         { filtroProductoClause += ' AND p.id_marca = ?';         params.push(id_marca); }
        if (id_clasificacion) { filtroProductoClause += ' AND p.id_clasificacion = ?'; params.push(id_clasificacion); }

        query = `
          SELECT
            p.id_producto,
            p.nombre,
            p.codigo_barras,
            c.nombre as categoria,
            SUM(stock_por_suc.total_sucursal) as stock_total_unidades,
            CONCAT('[', GROUP_CONCAT(
              JSON_OBJECT('id_sucursal', stock_por_suc.id_sucursal, 'sucursal_nombre', stock_por_suc.sucursal_nombre, 'stock', stock_por_suc.total_sucursal)
            ), ']') as detalle_sucursales
          FROM producto p
          LEFT JOIN clasificacion_producto c ON p.id_clasificacion = c.id_clasificacion
          JOIN (
            SELECT id_producto, s.id_sucursal, s.nombre as sucursal_nombre, SUM(stock_unidades) as total_sucursal
            FROM lote l
            JOIN sucursal s ON l.id_sucursal = s.id_sucursal
            WHERE l.activo = 1 AND l.stock_unidades > 0
            GROUP BY id_producto, s.id_sucursal
          ) stock_por_suc ON p.id_producto = stock_por_suc.id_producto
          WHERE 1=1 ${filtroProductoClause}
          GROUP BY p.id_producto, p.nombre, p.codigo_barras, c.nombre
          ORDER BY p.nombre ASC
        `;
        break;
      }

      case 'actual':
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

      case 'valorizado': {
        // Reporte gerencial comparativo entre TODAS las sucursales, igual que 'global'
        // pero con el valor (costo) desglosado por sucursal además del stock.
        let filtroProductoClauseValorizado = '';
        if (id_producto)      { filtroProductoClauseValorizado += ' AND p.id_producto = ?';      params.push(id_producto); }
        if (id_marca)         { filtroProductoClauseValorizado += ' AND p.id_marca = ?';         params.push(id_marca); }
        if (id_clasificacion) { filtroProductoClauseValorizado += ' AND p.id_clasificacion = ?'; params.push(id_clasificacion); }

        query = `
          SELECT
            p.id_producto,
            p.nombre,
            p.codigo_barras,
            c.nombre as categoria,
            SUM(stock_por_suc.total_sucursal) as stock_total_unidades,
            SUM(stock_por_suc.costo_sucursal) as costo_total_estimado,
            CONCAT('[', GROUP_CONCAT(
              JSON_OBJECT(
                'id_sucursal', stock_por_suc.id_sucursal,
                'sucursal_nombre', stock_por_suc.sucursal_nombre,
                'stock', stock_por_suc.total_sucursal,
                'valor', stock_por_suc.costo_sucursal
              )
            ), ']') as detalle_sucursales
          FROM producto p
          LEFT JOIN clasificacion_producto c ON p.id_clasificacion = c.id_clasificacion
          JOIN (
            SELECT id_producto, s.id_sucursal, s.nombre as sucursal_nombre,
                   SUM(stock_unidades) as total_sucursal,
                   SUM(stock_unidades * precio_por_caja / unidades_por_caja) as costo_sucursal
            FROM lote l
            JOIN sucursal s ON l.id_sucursal = s.id_sucursal
            WHERE l.activo = 1 AND l.stock_unidades > 0
            GROUP BY id_producto, s.id_sucursal
          ) stock_por_suc ON p.id_producto = stock_por_suc.id_producto
          WHERE 1=1 ${filtroProductoClauseValorizado}
          GROUP BY p.id_producto, p.nombre, p.codigo_barras, c.nombre
          ORDER BY p.nombre ASC
        `;
        break;
      }

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

      case 'rentabilidad': {
        // Costo y margen por lote activo — a diferencia de 'actual'/'valorizado'
        // (que agregan todo el stock de un producto en una sola fila), acá cada
        // lote va por separado porque cada uno puede tener un costo de compra
        // distinto, y por lo tanto un margen distinto, aunque sea el mismo producto.
        let filtroProductoClauseRent = '';
        if (id_producto)      { filtroProductoClauseRent += ' AND p.id_producto = ?';      params.push(id_producto); }
        if (id_marca)         { filtroProductoClauseRent += ' AND p.id_marca = ?';         params.push(id_marca); }
        if (id_clasificacion) { filtroProductoClauseRent += ' AND p.id_clasificacion = ?'; params.push(id_clasificacion); }

        query = `
          SELECT p.id_producto, p.nombre, p.codigo_barras, c.nombre as categoria,
                 l.id_lote, l.numero_lote, l.stock_unidades,
                 ROUND(l.precio_por_caja / l.unidades_por_caja, 2) as costo_unitario,
                 p.precio_menor, p.precio_mayor,
                 ROUND(p.precio_menor - (l.precio_por_caja / l.unidades_por_caja), 2) as margen_menor
          FROM lote l
          JOIN producto p ON l.id_producto = p.id_producto
          LEFT JOIN clasificacion_producto c ON p.id_clasificacion = c.id_clasificacion
          WHERE l.id_sucursal = ? AND l.activo = 1 AND l.stock_unidades > 0 ${filtroProductoClauseRent}
          ORDER BY margen_menor ASC, p.nombre ASC
        `;
        params.unshift(sucursalId);
        break;
      }

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
    } else if (tipo === 'global') {
      resumen.unidades_total = rows.reduce((acc, r) => acc + parseFloat(r.stock_total_unidades || 0), 0);
    } else if (tipo === 'rentabilidad') {
      resumen.lotes_en_perdida = rows.filter(r => parseFloat(r.margen_menor) < 0).length;
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
    let ventaFechaAnteriorClause = '';
    let ventaFechaAnteriorParams = [];
    let compraFechaAnteriorClause = '';
    let compraFechaAnteriorParams = [];

    if (fechaInicio && fechaFin) {
      ventaFechaClause  = 'AND DATE(fecha_venta)  BETWEEN ? AND ?';
      ventaFechaParams  = [fechaInicio, fechaFin];
      compraFechaClause = 'AND DATE(fecha_compra) BETWEEN ? AND ?';
      compraFechaParams = [fechaInicio, fechaFin];

      // Período anterior equivalente, de la misma duración, inmediatamente antes del rango elegido.
      ventaFechaAnteriorClause  = 'AND DATE(fecha_venta)  BETWEEN DATE_SUB(?, INTERVAL DATEDIFF(?, ?) + 1 DAY) AND DATE_SUB(?, INTERVAL 1 DAY)';
      ventaFechaAnteriorParams  = [fechaInicio, fechaFin, fechaInicio, fechaInicio];
      compraFechaAnteriorClause = 'AND DATE(fecha_compra) BETWEEN DATE_SUB(?, INTERVAL DATEDIFF(?, ?) + 1 DAY) AND DATE_SUB(?, INTERVAL 1 DAY)';
      compraFechaAnteriorParams = [fechaInicio, fechaFin, fechaInicio, fechaInicio];
    } else {
      ventaFechaClause  = 'AND MONTH(fecha_venta)  = MONTH(CURDATE()) AND YEAR(fecha_venta)  = YEAR(CURDATE())';
      compraFechaClause = 'AND MONTH(fecha_compra) = MONTH(CURDATE()) AND YEAR(fecha_compra) = YEAR(CURDATE())';

      // Mes calendario anterior al actual.
      ventaFechaAnteriorClause  = 'AND MONTH(fecha_venta)  = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(fecha_venta)  = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))';
      compraFechaAnteriorClause = 'AND MONTH(fecha_compra) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(fecha_compra) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))';
    }

    const [ventasRows] = await db.promise().query(
      `SELECT COUNT(*) as cantidad_ventas, COALESCE(SUM(total), 0) as total_ventas
       FROM venta WHERE estado = 'COMPLETADA' AND id_sucursal = ? ${ventaFechaClause}`,
      [sucursalId, ...ventaFechaParams]
    );

    const [comprasRows] = await db.promise().query(
      `SELECT COALESCE(SUM(total), 0) as total_compras
       FROM compra WHERE estado != 'CANCELADO' AND id_sucursal = ? ${compraFechaClause}`,
      [sucursalId, ...compraFechaParams]
    );

    const [ventasAnteriorRows] = await db.promise().query(
      `SELECT COALESCE(SUM(total), 0) as total_ventas
       FROM venta WHERE estado = 'COMPLETADA' AND id_sucursal = ? ${ventaFechaAnteriorClause}`,
      [sucursalId, ...ventaFechaAnteriorParams]
    );

    const [comprasAnteriorRows] = await db.promise().query(
      `SELECT COALESCE(SUM(total), 0) as total_compras
       FROM compra WHERE estado != 'CANCELADO' AND id_sucursal = ? ${compraFechaAnteriorClause}`,
      [sucursalId, ...compraFechaAnteriorParams]
    );

    const [ventasHoyRows] = await db.promise().query(
      `SELECT COUNT(*) as cantidad_ventas_hoy, COALESCE(SUM(total), 0) as ingresos_hoy
       FROM venta WHERE estado = 'COMPLETADA' AND id_sucursal = ? AND DATE(fecha_venta) = CURDATE()`,
      [sucursalId]
    );

    const [porCobrarRows] = await db.promise().query(
      `SELECT COALESCE(SUM(v.total - v.monto_pagado - COALESCE(pc.total_abonado, 0)), 0) as total_por_cobrar
       FROM venta v
       LEFT JOIN (
         SELECT id_venta, SUM(monto) AS total_abonado FROM pago_credito GROUP BY id_venta
       ) pc ON pc.id_venta = v.id_venta
       WHERE v.metodo_pago = 'CREDITO' AND v.estado = 'COMPLETADA' AND v.id_sucursal = ?`,
      [sucursalId]
    );

    const [porPagarRows] = await db.promise().query(
      `SELECT COALESCE(SUM(c.total - c.monto_pagado - COALESCE(pp.total_abonado, 0)), 0) as total_por_pagar
       FROM compra c
       LEFT JOIN (
         SELECT id_compra, SUM(monto) AS total_abonado FROM pago_proveedor GROUP BY id_compra
       ) pp ON pp.id_compra = c.id_compra
       WHERE c.metodo_pago = 'CREDITO' AND c.estado != 'CANCELADO' AND c.id_sucursal = ?`,
      [sucursalId]
    );

    const [stockBajoRows] = await db.promise().query(
      `SELECT COUNT(DISTINCT p.id_producto) as cantidad
       FROM lote l
       JOIN producto p ON l.id_producto = p.id_producto
       WHERE l.activo = 1 AND l.id_sucursal = ? AND p.stock_minimo > 0 AND l.stock_unidades < p.stock_minimo`,
      [sucursalId]
    );

    const totalVentas = parseFloat(ventasRows[0].total_ventas);
    const totalCompras = parseFloat(comprasRows[0].total_compras);
    const totalVentasAnterior = parseFloat(ventasAnteriorRows[0].total_ventas);
    const totalComprasAnterior = parseFloat(comprasAnteriorRows[0].total_compras);
    const cantidadVentas = ventasRows[0].cantidad_ventas;

    const variacion = (actual, anterior) => {
      if (anterior <= 0) return actual > 0 ? 100 : 0;
      return ((actual - anterior) / anterior) * 100;
    };

    return res.json({
      ingresos_mes:         totalVentas,
      egresos_mes:          totalCompras,
      utilidad_bruta_mes:   totalVentas - totalCompras,
      ventas_hoy_cantidad:  ventasHoyRows[0].cantidad_ventas_hoy,
      ingresos_hoy:         ventasHoyRows[0].ingresos_hoy,
      cantidad_ventas:      cantidadVentas,
      ticket_promedio:      cantidadVentas > 0 ? totalVentas / cantidadVentas : 0,
      variacion_ventas:     variacion(totalVentas, totalVentasAnterior),
      variacion_compras:    variacion(totalCompras, totalComprasAnterior),
      total_por_cobrar:     porCobrarRows[0].total_por_cobrar,
      total_por_pagar:      porPagarRows[0].total_por_pagar,
      productos_stock_bajo: stockBajoRows[0].cantidad
    });
  } catch (err) {
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al obtener el resumen del dashboard') });
  }
};

const obtenerTopProductos = async (req, res) => {
  const { id_sucursal, ordenar_por, fechaInicio, fechaFin } = req.query;
  const sucursalId = id_sucursal || req.user?.id_sucursal;
  const orderColumn = ordenar_por === 'ingresos' ? 'ingresos_generados' : 'unidades_vendidas';

  let fechaClause = '';
  let fechaParams = [];
  if (fechaInicio && fechaFin) {
    fechaClause = 'AND DATE(v.fecha_venta) BETWEEN ? AND ?';
    fechaParams = [fechaInicio, fechaFin];
  } else {
    fechaClause = 'AND MONTH(v.fecha_venta) = MONTH(CURDATE()) AND YEAR(v.fecha_venta) = YEAR(CURDATE())';
  }

  try {
    const [rows] = await db.promise().query(`
      SELECT p.id_producto, p.nombre, p.codigo_barras,
        SUM(CASE WHEN d.tipo_cantidad = 'CAJA' THEN d.cantidad * l.unidades_por_caja ELSE d.cantidad END) as unidades_vendidas,
        SUM(d.subtotal) as ingresos_generados
      FROM detalle_venta d
      JOIN venta v ON d.id_venta = v.id_venta
      JOIN producto p ON d.id_producto = p.id_producto
      JOIN lote l ON d.id_lote = l.id_lote
      WHERE v.estado = 'COMPLETADA' AND v.id_sucursal = ? ${fechaClause}
      GROUP BY p.id_producto, p.nombre, p.codigo_barras
      ORDER BY ${orderColumn} DESC LIMIT 10
    `, [sucursalId, ...fechaParams]);

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

// Flujo de caja detallado de un mes, estilo planilla (días en columnas,
// categorías en filas, expandibles): ingresos (ventas + cobros de crédito +
// ingresos manuales) vs egresos categorizados (Costo variable, Costo fijo,
// Otros gastos, Retiros y fuera del negocio), desglosados en Efectivo/Digital,
// con saldo al empezar/cerrar cada día. Inspirado en bd/Flujodecaja.xlsx.
const obtenerFlujoCaja = async (req, res) => {
  const id_sucursal = req.user?.id_sucursal;
  const ahora = new Date();
  const mesParam = /^\d{4}-\d{2}$/.test(req.query.mes || '') ? req.query.mes : null;
  const anio = mesParam ? parseInt(mesParam.slice(0, 4)) : ahora.getUTCFullYear();
  const mes = mesParam ? parseInt(mesParam.slice(5, 7)) : ahora.getUTCMonth() + 1;

  const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDiaNum = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const ultimoDia = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`;

  // EFECTIVO queda aparte; TRANSFERENCIA/QR/OTRO se agrupan como "digital".
  const grupoMetodo = `CASE WHEN metodo_pago = 'EFECTIVO' THEN 'efectivo' ELSE 'digital' END`;

  try {
    const [ventasRows] = await db.promise().query(
      `SELECT DATE_FORMAT(fecha_venta, '%Y-%m-%d') AS fecha, ${grupoMetodo} AS grupo, SUM(total) AS monto
       FROM venta
       WHERE id_sucursal = ? AND estado = 'COMPLETADA' AND metodo_pago != 'CREDITO'
         AND fecha_venta >= ? AND fecha_venta < ? + INTERVAL 1 DAY
       GROUP BY fecha, grupo`,
      [id_sucursal, primerDia, ultimoDia]
    );
    const [cobrosRows] = await db.promise().query(
      `SELECT DATE_FORMAT(fecha_pago, '%Y-%m-%d') AS fecha, ${grupoMetodo} AS grupo, SUM(monto) AS monto
       FROM pago_credito
       WHERE id_sucursal = ? AND fecha_pago >= ? AND fecha_pago < ? + INTERVAL 1 DAY
       GROUP BY fecha, grupo`,
      [id_sucursal, primerDia, ultimoDia]
    );
    const [comprasRows] = await db.promise().query(
      `SELECT DATE_FORMAT(fecha_compra, '%Y-%m-%d') AS fecha, ${grupoMetodo} AS grupo, SUM(total) AS monto
       FROM compra
       WHERE id_sucursal = ? AND estado != 'ANULADA' AND metodo_pago != 'CREDITO'
         AND fecha_compra BETWEEN ? AND ?
       GROUP BY fecha, grupo`,
      [id_sucursal, primerDia, ultimoDia]
    );
    const [pagosProvRows] = await db.promise().query(
      `SELECT DATE_FORMAT(fecha_pago, '%Y-%m-%d') AS fecha, ${grupoMetodo} AS grupo, SUM(monto) AS monto
       FROM pago_proveedor
       WHERE id_sucursal = ? AND fecha_pago >= ? AND fecha_pago < ? + INTERVAL 1 DAY
       GROUP BY fecha, grupo`,
      [id_sucursal, primerDia, ultimoDia]
    );
    const [gastosRows] = await db.promise().query(
      `SELECT DATE_FORMAT(fecha_gasto, '%Y-%m-%d') AS fecha, ${grupoMetodo} AS grupo, tipo, categoria, concepto, SUM(monto) AS monto
       FROM gasto_caja
       WHERE id_sucursal = ? AND fecha_gasto >= ? AND fecha_gasto < ? + INTERVAL 1 DAY
       GROUP BY fecha, grupo, tipo, categoria, concepto`,
      [id_sucursal, primerDia, ultimoDia]
    );

    // ── Saldo antes del mes (acumulado de toda la historia previa) ──────
    const [saldoPrevioRows] = await db.promise().query(
      `SELECT grupo, SUM(monto) AS monto FROM (
         SELECT ${grupoMetodo} AS grupo, total AS monto FROM venta
           WHERE id_sucursal = ? AND estado = 'COMPLETADA' AND metodo_pago != 'CREDITO' AND fecha_venta < ?
         UNION ALL
         SELECT ${grupoMetodo} AS grupo, monto FROM pago_credito WHERE id_sucursal = ? AND fecha_pago < ?
         UNION ALL
         SELECT ${grupoMetodo} AS grupo, -total AS monto FROM compra
           WHERE id_sucursal = ? AND estado != 'ANULADA' AND metodo_pago != 'CREDITO' AND fecha_compra < ?
         UNION ALL
         SELECT ${grupoMetodo} AS grupo, -monto AS monto FROM pago_proveedor WHERE id_sucursal = ? AND fecha_pago < ?
         UNION ALL
         SELECT ${grupoMetodo} AS grupo, (CASE WHEN tipo = 'INGRESO' THEN monto ELSE -monto END) AS monto
           FROM gasto_caja WHERE id_sucursal = ? AND fecha_gasto < ?
       ) previo
       GROUP BY grupo`,
      [id_sucursal, primerDia, id_sucursal, primerDia, id_sucursal, primerDia, id_sucursal, primerDia, id_sucursal, primerDia]
    );
    const saldoInicial = { efectivo: 0, digital: 0 };
    saldoPrevioRows.forEach((r) => { saldoInicial[r.grupo] += parseFloat(r.monto) || 0; });

    // ── Arma los días del mes completo ───────────────────────────────────
    const dias = [];
    for (let d = 1; d <= ultimoDiaNum; d++) dias.push(`${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

    const vacioDia = () => ({ efectivo: 0, digital: 0 });
    const nuevaFila = (id, label, auto = false) => ({ id, label, auto, dias: Object.fromEntries(dias.map(f => [f, vacioDia()])), mes: vacioDia() });
    const sumar = (fila, fecha, grupo, monto) => {
      if (!fila.dias[fecha]) return;
      fila.dias[fecha][grupo] += monto;
      fila.mes[grupo] += monto;
    };

    const filaVentas = nuevaFila('ventas', 'Ventas', true);
    const filaCobros = nuevaFila('cobros_credito', 'Cobros de crédito', true);
    const filaCompras = nuevaFila('compras', 'Compras', true);
    const filaPagosProv = nuevaFila('pagos_proveedor', 'Pagos a proveedores', true);
    ventasRows.forEach(r => sumar(filaVentas, r.fecha, r.grupo, parseFloat(r.monto) || 0));
    cobrosRows.forEach(r => sumar(filaCobros, r.fecha, r.grupo, parseFloat(r.monto) || 0));
    comprasRows.forEach(r => sumar(filaCompras, r.fecha, r.grupo, parseFloat(r.monto) || 0));
    pagosProvRows.forEach(r => sumar(filaPagosProv, r.fecha, r.grupo, parseFloat(r.monto) || 0));

    // Filas manuales (una por concepto distinto), separadas en 4 baldes:
    // ingresos manuales, costo variable, costo fijo, otros gastos, retiros.
    const filasPorConcepto = {}; // key: `${balde}::${concepto}`
    const obtenerFilaConcepto = (balde, concepto) => {
      const key = `${balde}::${concepto}`;
      if (!filasPorConcepto[key]) filasPorConcepto[key] = nuevaFila(`gasto::${key}`, concepto, false);
      return filasPorConcepto[key];
    };
    const baldeDe = (tipo, categoria) => {
      if (tipo === 'INGRESO') return 'ingresos';
      return { VARIABLE: 'variable', FIJO: 'fijo', RETIRO: 'retiros', OTRO: 'otros' }[categoria] || 'otros';
    };
    gastosRows.forEach(r => {
      const balde = baldeDe(r.tipo, r.categoria);
      const fila = obtenerFilaConcepto(balde, r.concepto);
      sumar(fila, r.fecha, r.grupo, parseFloat(r.monto) || 0);
    });
    const filasDeBalde = (balde) => Object.entries(filasPorConcepto)
      .filter(([key]) => key.startsWith(`${balde}::`))
      .map(([, fila]) => fila)
      .sort((a, b) => (b.mes.efectivo + b.mes.digital) - (a.mes.efectivo + a.mes.digital));

    const sumarFilas = (filas) => {
      const total = vacioDia();
      const porDia = Object.fromEntries(dias.map(f => [f, vacioDia()]));
      filas.forEach(f => {
        total.efectivo += f.mes.efectivo; total.digital += f.mes.digital;
        dias.forEach(fecha => { porDia[fecha].efectivo += f.dias[fecha].efectivo; porDia[fecha].digital += f.dias[fecha].digital; });
      });
      return { total, porDia };
    };

    const armarGrupo = (id, label, filas) => {
      const { total, porDia } = sumarFilas(filas);
      return { id, label, filas, mes: total, dias: porDia };
    };

    const grupoIngresos = armarGrupo('ingresos', '(+) Ingresos', [filaVentas, filaCobros, ...filasDeBalde('ingresos')]);
    const grupoVariable = armarGrupo('variable', '(-) Costo variable', [filaCompras, filaPagosProv, ...filasDeBalde('variable')]);
    const grupoFijo = armarGrupo('fijo', '(-) Costo fijo', filasDeBalde('fijo'));
    const grupoOtros = armarGrupo('otros', '(-) Otros gastos', filasDeBalde('otros'));
    const grupoRetiros = armarGrupo('retiros', '(-) Retiros y fuera del negocio', filasDeBalde('retiros'));

    // ── Saldo al empezar/cerrar cada día (para la primera fila y el gráfico) ──
    const saldoPorDia = {};
    let corrEfectivo = saldoInicial.efectivo, corrDigital = saldoInicial.digital;
    const saldoInicioDias = {};
    dias.forEach((fecha) => {
      saldoInicioDias[fecha] = { efectivo: corrEfectivo, digital: corrDigital };
      const netoDiaEfectivo = grupoIngresos.dias[fecha].efectivo - grupoVariable.dias[fecha].efectivo
        - grupoFijo.dias[fecha].efectivo - grupoOtros.dias[fecha].efectivo - grupoRetiros.dias[fecha].efectivo;
      const netoDiaDigital = grupoIngresos.dias[fecha].digital - grupoVariable.dias[fecha].digital
        - grupoFijo.dias[fecha].digital - grupoOtros.dias[fecha].digital - grupoRetiros.dias[fecha].digital;
      corrEfectivo += netoDiaEfectivo;
      corrDigital += netoDiaDigital;
      saldoPorDia[fecha] = { efectivo: corrEfectivo, digital: corrDigital };
    });

    const filaSaldoInicio = { id: 'saldo_inicio', label: 'Saldo al empezar el día', dias: saldoInicioDias, mes: saldoInicial };

    const serie = dias.map((fecha) => ({ fecha, efectivo: saldoPorDia[fecha].efectivo, digital: saldoPorDia[fecha].digital }));

    // ── Tarjetas resumen ──────────────────────────────────────────────────
    const gastosOperacion = {
      efectivo: grupoVariable.mes.efectivo + grupoFijo.mes.efectivo + grupoOtros.mes.efectivo,
      digital: grupoVariable.mes.digital + grupoFijo.mes.digital + grupoOtros.mes.digital,
    };
    const todasLasFilasDeGasto = [filaCompras, filaPagosProv, ...filasDeBalde('variable'), ...filasDeBalde('fijo'), ...filasDeBalde('otros')];
    let mayor = null;
    todasLasFilasDeGasto.forEach((f) => {
      const total = f.mes.efectivo + f.mes.digital;
      if (total > 0 && (!mayor || total > mayor.total)) mayor = { concepto: f.label, total };
    });
    const saldoFinal = saldoPorDia[dias[dias.length - 1]] || saldoInicial;

    const tarjetas = {
      saldo_empezar: saldoInicial,
      entro: grupoIngresos.mes,
      gastos_operacion: { ...gastosOperacion, mayor_concepto: mayor?.concepto || null },
      retiros: grupoRetiros.mes,
      saldo_hoy: saldoFinal,
    };

    return res.json({
      mes: `${anio}-${String(mes).padStart(2, '0')}`,
      dias,
      saldo_inicial: saldoInicial,
      tarjetas,
      serie,
      filas_saldo: filaSaldoInicio,
      grupos: [grupoIngresos, grupoVariable, grupoFijo, grupoOtros, grupoRetiros],
    });
  } catch (err) {
    console.error('Error en obtenerFlujoCaja:', err);
    return res.status(500).json({ error: 'Error interno al generar el flujo de caja.' });
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
  obtenerReporteCaja,
  obtenerFlujoCaja
};
