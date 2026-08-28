const db = require('../config/db');
const { mensajeSeguro } = require('../utils/errorHandler');

// Listar todas las ventas
const listar = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT v.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.ci_nit,
              u.nombre as usuario_nombre, u.apellido as usuario_apellido
       FROM venta v
       LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
       LEFT JOIN usuario u ON v.id_usuario = u.id_usuario
       WHERE v.id_sucursal = ?
       ORDER BY v.fecha_venta DESC, v.id_venta DESC`,
      [req.user.id_sucursal]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener historial de ventas' });
  }
};

// Obtener detalle completo de una venta
const obtener = async (req, res) => {
  const { id } = req.params;
  try {
    const [ventaRows] = await db.promise().query(
      `SELECT v.*,
              c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.ci_nit, c.empresa,
              u.nombre as usuario_nombre, u.apellido as usuario_apellido,
              s.nombre as sucursal_nombre, s.direccion as sucursal_direccion,
              s.ciudad as sucursal_ciudad, s.telefono as sucursal_telefono
       FROM venta v
       LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
       LEFT JOIN usuario u ON v.id_usuario = u.id_usuario
       LEFT JOIN sucursal s ON v.id_sucursal = s.id_sucursal
       WHERE v.id_venta = ? AND v.id_sucursal = ?`,
      [id, req.user.id_sucursal]
    );

    if (ventaRows.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
    
    const venta = ventaRows[0];

    const [detalleRows] = await db.promise().query(
      `SELECT d.*, p.nombre as producto_nombre, p.codigo_barras, l.numero_lote, c.nombre as combo_nombre
       FROM detalle_venta d
       JOIN producto p ON d.id_producto = p.id_producto
       JOIN lote l ON d.id_lote = l.id_lote
       LEFT JOIN combo c ON d.id_combo = c.id_combo
       WHERE d.id_venta = ?`,
      [id]
    );

    venta.detalles = detalleRows;
    return res.json(venta);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener detalle de venta' });
  }
};

// Reconstruye el mejor % de descuento por promoción activa hoy, igual que listarProductosPOS
function mejorDescuentoPromo(promos, id_producto, id_clasificacion) {
  let mejor = 0;
  for (const p of promos) {
    if (p.id_producto === id_producto || (p.id_clasificacion && p.id_clasificacion === id_clasificacion)) {
      if (parseFloat(p.valor_pct) > mejor) mejor = parseFloat(p.valor_pct);
    }
  }
  return mejor;
}

// Crear nueva venta con lógica FIFO para Lotes
const crear = async (req, res) => {
  const {
    id_cliente, nro_factura, tipo_venta, monto_pagado, cambio,
    metodo_pago, observaciones, detalles, canje_recompensa,
    qr_tipo, qr_referencia
  } = req.body;

  const id_usuario = req.user.id_usuario;
  const id_sucursal = req.user.id_sucursal;
  const EPS = 0.01;

  if (!detalles || detalles.length === 0) {
    return res.status(400).json({ error: 'El carrito de ventas está vacío.' });
  }
  for (const item of detalles) {
    if (!item.id_producto || !(parseFloat(item.cantidad) > 0)) {
      return res.status(400).json({ error: 'Cantidad inválida en el carrito' });
    }
  }

  // El descuento manual (%) solo es válido si el usuario tiene el permiso correspondiente
  const descuentoPct = Math.max(0, Math.min(100, parseFloat(detalles[0]?.descuento_pct) || 0));
  if (descuentoPct > 0 && !req.ability.can('aplicar_descuento', 'ventas')) {
    return res.status(403).json({ error: 'Sin permiso para aplicar descuentos' });
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    // 0. Validar que haya un turno de caja ABIERTO en esta sucursal
    const [turnoRows] = await connection.query(
      `SELECT id_apertura FROM apertura_cierre_caja WHERE id_sucursal = ? AND estado = 'ABIERTA' LIMIT 1`,
      [id_sucursal]
    );
    if (turnoRows.length === 0) {
      throw new Error('No hay una caja abierta en esta sucursal. Abra un turno de caja antes de vender.');
    }
    const id_apertura = turnoRows[0].id_apertura;

    // 0.1 Recalcular precios reales en el servidor (nunca confiar en los que manda el carrito)
    const idsProducto = [...new Set(detalles.map(d => d.id_producto))];
    const [productosDb] = await connection.query(
      `SELECT id_producto, id_clasificacion, precio_menor, precio_mayor FROM producto WHERE id_producto IN (?)`,
      [idsProducto]
    );
    const productoPorId = new Map(productosDb.map(p => [p.id_producto, p]));

    // Unidades por caja reales (del lote en esta sucursal), nunca las que manda el carrito
    const [unidadesCajaDb] = await connection.query(
      `SELECT id_producto, MIN(unidades_por_caja) AS unidades_por_caja
       FROM lote WHERE id_producto IN (?) AND id_sucursal = ? AND activo = 1
       GROUP BY id_producto`,
      [idsProducto, id_sucursal]
    );
    const unidadesPorCajaPorId = new Map(unidadesCajaDb.map(r => [r.id_producto, r.unidades_por_caja]));

    const [promos] = await connection.query(
      `SELECT pr.valor_pct, pp.id_producto, pc.id_clasificacion
       FROM promocion pr
       LEFT JOIN promocion_producto pp ON pp.id_promocion = pr.id_promocion
       LEFT JOIN promocion_clasificacion pc ON pc.id_promocion = pr.id_promocion
       WHERE pr.activo = 1 AND CURDATE() BETWEEN pr.fecha_inicio AND pr.fecha_fin`
    );

    const promoPctDe = (id_producto) => {
      const prod = productoPorId.get(id_producto);
      if (!prod) return 0;
      return mejorDescuentoPromo(promos, prod.id_producto, prod.id_clasificacion);
    };

    const precioRealDe = (id_producto, tipoCantidad) => {
      const prod = productoPorId.get(id_producto);
      if (!prod) return null;
      const base = parseFloat(tipo_venta === 'MAYOR' ? prod.precio_mayor : prod.precio_menor);
      const pct = mejorDescuentoPromo(promos, prod.id_producto, prod.id_clasificacion);
      const precioUnidad = pct > 0 ? Math.round(base * (1 - pct / 100) * 100) / 100 : base;
      if (tipoCantidad === 'CAJA') {
        const unidadesPorCaja = unidadesPorCajaPorId.get(id_producto);
        if (!unidadesPorCaja) return null;
        return Math.round(precioUnidad * unidadesPorCaja * 100) / 100;
      }
      return precioUnidad;
    };

    // 0.2 Combos referenciados: traer precio y composición reales
    const idsCombo = [...new Set(detalles.filter(d => d.id_combo).map(d => d.id_combo))];
    const combosPorId = new Map();
    const comboProductoPorCombo = new Map();
    if (idsCombo.length > 0) {
      const [combosDb] = await connection.query(
        `SELECT id_combo, precio_combo FROM combo WHERE id_combo IN (?) AND activo = 1`, [idsCombo]
      );
      for (const c of combosDb) combosPorId.set(c.id_combo, c);
      const [comboProdDb] = await connection.query(
        `SELECT id_combo, id_producto, cantidad FROM combo_producto WHERE id_combo IN (?)`, [idsCombo]
      );
      for (const cp of comboProdDb) {
        if (!comboProductoPorCombo.has(cp.id_combo)) comboProductoPorCombo.set(cp.id_combo, []);
        comboProductoPorCombo.get(cp.id_combo).push(cp);
      }
    }

    // 0.3 Recompensa de fidelización canjeada como línea gratuita (si aplica)
    let recompensaValidada = null;
    if (canje_recompensa && canje_recompensa.id_recompensa) {
      const [recompensaRows] = await connection.query(
        'SELECT * FROM recompensa WHERE id_recompensa = ? AND activo = 1', [canje_recompensa.id_recompensa]
      );
      if (recompensaRows.length === 0) throw new Error('Recompensa no encontrada o inactiva');
      recompensaValidada = recompensaRows[0];
    }

    // 0.4 Validar cada línea del carrito contra los precios reales y recalcular sus montos
    for (const item of detalles) {
      const cantidad = parseFloat(item.cantidad);

      if (item.id_recompensa) {
        if (!recompensaValidada || recompensaValidada.id_recompensa !== item.id_recompensa) {
          throw new Error('Línea de recompensa inválida en el carrito');
        }
        if (recompensaValidada.tipo !== 'PRODUCTO') {
          throw new Error('Recompensa inválida para canje de producto');
        }
        const perteneceAlProducto = recompensaValidada.id_producto === item.id_producto;
        const perteneceAlCombo = recompensaValidada.id_combo && recompensaValidada.id_combo === item.id_combo;
        if (!perteneceAlProducto && !perteneceAlCombo) {
          throw new Error('La recompensa no corresponde al producto/combo canjeado');
        }
        item.precio_unitario = 0;
        item.descuento_pct = 0;
        item.descuento_monto = 0;
        item.subtotal = 0;
        continue;
      }

      if (item.id_combo) continue; // se valida por grupo justo abajo

      const precioReal = precioRealDe(item.id_producto, item.tipo_cantidad);
      if (precioReal === null) throw new Error(`Producto ID ${item.id_producto} no existe o no tiene unidades_por_caja definidas`);
      if (Math.abs(parseFloat(item.precio_unitario) - precioReal) > EPS) {
        throw new Error(`El precio del producto ID ${item.id_producto} no coincide con el catálogo`);
      }
      item.precio_unitario = precioReal;
      item.descuento_pct = descuentoPct;
      item.promocion_pct = promoPctDe(item.id_producto);
      item.subtotal = Math.round(cantidad * precioReal * (1 - descuentoPct / 100) * 100) / 100;
      item.descuento_monto = Math.round(cantidad * precioReal * (descuentoPct / 100) * 100) / 100;
    }

    // 0.5 Validar grupos de combo (el total del grupo debe coincidir con precio_combo × veces agregado)
    const gruposCombo = new Map();
    for (const item of detalles) {
      if (!item.id_combo || item.id_recompensa) continue;
      if (!gruposCombo.has(item.id_combo)) gruposCombo.set(item.id_combo, []);
      gruposCombo.get(item.id_combo).push(item);
    }
    for (const [id_combo, items] of gruposCombo) {
      const combo = combosPorId.get(id_combo);
      const composicion = comboProductoPorCombo.get(id_combo);
      if (!combo || !composicion || composicion.length === 0) {
        throw new Error(`Combo ID ${id_combo} no existe o está inactivo`);
      }
      const primerComponente = composicion[0];
      const cantidadEnCarrito = items
        .filter(i => i.id_producto === primerComponente.id_producto)
        .reduce((acc, i) => acc + parseFloat(i.cantidad), 0);
      const vecesAgregado = cantidadEnCarrito / parseFloat(primerComponente.cantidad);
      if (!Number.isFinite(vecesAgregado) || vecesAgregado <= 0) {
        throw new Error(`Composición de combo inválida para ID ${id_combo}`);
      }
      const totalDeclaradoGrupo = items.reduce(
        (acc, i) => acc + parseFloat(i.cantidad) * parseFloat(i.precio_unitario), 0
      );
      const totalEsperadoGrupo = vecesAgregado * parseFloat(combo.precio_combo);
      if (Math.abs(totalDeclaradoGrupo - totalEsperadoGrupo) > EPS * items.length) {
        throw new Error(`El precio del combo ID ${id_combo} no coincide con el catálogo`);
      }
      for (const i of items) {
        i.descuento_pct = descuentoPct;
        i.subtotal = Math.round(parseFloat(i.cantidad) * parseFloat(i.precio_unitario) * (1 - descuentoPct / 100) * 100) / 100;
        i.descuento_monto = Math.round(parseFloat(i.cantidad) * parseFloat(i.precio_unitario) * (descuentoPct / 100) * 100) / 100;
      }
    }

    // 0.6 Totales de la venta, recalculados 100% en el servidor
    const subtotalReal = detalles.reduce(
      (acc, i) => acc + parseFloat(i.cantidad) * parseFloat(i.precio_unitario), 0
    );
    const descuentoTotalReal = Math.round(subtotalReal * (descuentoPct / 100) * 100) / 100;
    let totalReal = Math.max(0, Math.round((subtotalReal - descuentoTotalReal) * 100) / 100);

    if (recompensaValidada && recompensaValidada.tipo === 'DESCUENTO') {
      const descuentoRecompensa = recompensaValidada.tipo_descuento === 'PCT'
        ? totalReal * (parseFloat(recompensaValidada.valor_descuento) / 100)
        : parseFloat(recompensaValidada.valor_descuento);
      totalReal = Math.max(0, Math.round((totalReal - descuentoRecompensa) * 100) / 100);
    }

    const subtotal = Math.round(subtotalReal * 100) / 100;
    const descuento_total = descuentoTotalReal;
    const total = totalReal;

    // 1. Validar Stock General antes de insertar la cabecera
    // Acumular la cantidad total requerida por producto (convirtiendo cajas a unidades si es necesario)
    const requerimientos = {};
    for (const item of detalles) {
      if (!requerimientos[item.id_producto]) {
        requerimientos[item.id_producto] = {
          cantidadRequerida: 0,
          itemsOriginales: [] // Guardamos las referencias para repartir los montos luego
        };
      }
      
      // Obtener unidades por caja del producto si el tipo es CAJA
      let unidades_a_descontar = parseFloat(item.cantidad);
      if (item.tipo_cantidad === 'CAJA') {
        // Necesitamos saber cuántas unidades tiene la caja de ese producto.
        // Asumiremos que el frontend envía item.unidades_por_caja para facilitar, o consultamos el catálogo/lote.
        // Para mayor precisión, consultaremos la tabla de lotes durante el FIFO, pero como estimación:
        if (!item.unidades_por_caja) {
           throw new Error(`Falta el parámetro unidades_por_caja para el producto ID ${item.id_producto} que se vende por CAJA.`);
        }
        unidades_a_descontar = parseFloat(item.cantidad) * parseFloat(item.unidades_por_caja);
      }

      requerimientos[item.id_producto].cantidadRequerida += unidades_a_descontar;
      requerimientos[item.id_producto].itemsOriginales.push({
        ...item,
        unidades_totales: unidades_a_descontar
      });
    }

    // 2. Insertar Cabecera de la Venta
    const montoPagadoNum = Math.max(0, parseFloat(monto_pagado) || 0);
    const cambioNum = Math.max(0, parseFloat(cambio) || 0);
    const [ventaResult] = await connection.query(
      `INSERT INTO venta
        (id_sucursal, id_usuario, id_cliente, id_apertura, nro_factura, tipo_venta, subtotal, descuento_total, total, monto_pagado, cambio, metodo_pago, qr_tipo, qr_referencia, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETADA', ?)`,
      [
        id_sucursal, id_usuario, id_cliente || null, id_apertura, nro_factura || null,
        tipo_venta || 'MENOR', subtotal, descuento_total, total,
        montoPagadoNum, cambioNum, metodo_pago || 'EFECTIVO',
        qr_tipo || null, qr_referencia || null, observaciones || null
      ]
    );
    const id_venta = ventaResult.insertId;

    // 3. Procesar FIFO por Producto
    for (const id_producto in requerimientos) {
      let unidadesFaltantes = requerimientos[id_producto].cantidadRequerida;

      // Obtener lotes activos del producto ordenados por vencimiento (FIFO)
      const [lotes] = await connection.query(
        `SELECT id_lote, stock_unidades, unidades_por_caja, numero_lote 
         FROM lote 
         WHERE id_producto = ? AND id_sucursal = ? AND stock_unidades > 0 AND activo = 1 
         ORDER BY fecha_vencimiento ASC, id_lote ASC FOR UPDATE`,
        [id_producto, id_sucursal]
      );

      // Calcular stock total disponible
      const stockDisponible = lotes.reduce((acc, l) => acc + l.stock_unidades, 0);
      if (stockDisponible < unidadesFaltantes) {
        throw new Error(`Stock insuficiente para el producto ID ${id_producto}. Requerido: ${unidadesFaltantes}, Disponible: ${stockDisponible}`);
      }

      // Descontar FIFO
      // Como un itemOriginal en el carrito puede abarcar varios lotes (o fracciones), 
      // generamos detalles de venta divididos por lote.
      
      let indexLote = 0;
      for (const itemOriginal of requerimientos[id_producto].itemsOriginales) {
        let unidadesItemFaltantes = itemOriginal.unidades_totales;

        while (unidadesItemFaltantes > 0 && indexLote < lotes.length) {
          const loteActual = lotes[indexLote];
          const descontarDeEsteLote = Math.min(unidadesItemFaltantes, loteActual.stock_unidades);

          // Actualizar memoria del lote
          loteActual.stock_unidades -= descontarDeEsteLote;
          unidadesItemFaltantes -= descontarDeEsteLote;

          // Prorratear precios y descuentos para el detalle de venta
          const proporcion = descontarDeEsteLote / itemOriginal.unidades_totales;
          const cantParaDetalle = parseFloat(itemOriginal.cantidad) * proporcion;
          const subtotalDetalle = parseFloat(itemOriginal.subtotal) * proporcion;
          const descMontoDetalle = parseFloat(itemOriginal.descuento_monto || 0) * proporcion;

          // Insertar Detalle Venta con ID Lote
          await connection.query(
            `INSERT INTO detalle_venta
              (id_venta, id_lote, id_producto, id_combo, tipo_cantidad, cantidad, precio_unitario, descuento_pct, promocion_pct, descuento_monto, subtotal)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id_venta, loteActual.id_lote, id_producto, itemOriginal.id_combo || null, itemOriginal.tipo_cantidad,
              cantParaDetalle, itemOriginal.precio_unitario, itemOriginal.descuento_pct || 0, itemOriginal.promocion_pct || 0, descMontoDetalle, subtotalDetalle
            ]
          );

          // Actualizar Lote en BD
          const nuevasCajas = Math.floor(loteActual.stock_unidades / loteActual.unidades_por_caja);
          await connection.query(
            'UPDATE lote SET stock_unidades = ?, stock_cajas = ? WHERE id_lote = ?',
            [loteActual.stock_unidades, nuevasCajas, loteActual.id_lote]
          );

          // Insertar Movimiento Almacén (SALIDA)
          await connection.query(
            `INSERT INTO movimiento_almacen 
              (id_lote, id_sucursal, id_usuario, tipo, motivo, cantidad_cajas, cantidad_unidades, referencia_id, referencia_tipo)
             VALUES (?, ?, ?, 'SALIDA', 'VENTA', ?, ?, ?, 'VENTA')`,
            [
              loteActual.id_lote, id_sucursal, id_usuario, 
              Math.floor(descontarDeEsteLote / loteActual.unidades_por_caja), descontarDeEsteLote, 
              id_venta
            ]
          );

          // Si el lote se agotó, pasar al siguiente en la próxima iteración del while
          if (loteActual.stock_unidades === 0) {
            indexLote++;
          }
        }
      }
    }

    // 4. Fidelización: canjear una recompensa como parte de esta venta (opcional)
    if (canje_recompensa && canje_recompensa.id_recompensa) {
      if (!id_cliente) throw new Error('Debe seleccionar un cliente para canjear una recompensa');

      const [clienteRows] = await connection.query('SELECT puntos_fidelidad FROM cliente WHERE id_cliente = ? FOR UPDATE', [id_cliente]);
      if (clienteRows.length === 0) throw new Error('Cliente no encontrado');

      const [recompensaRows] = await connection.query(
        'SELECT * FROM recompensa WHERE id_recompensa = ? AND activo = 1', [canje_recompensa.id_recompensa]
      );
      if (recompensaRows.length === 0) throw new Error('Recompensa no encontrada o inactiva');

      const recompensa = recompensaRows[0];
      const puntosDisponibles = clienteRows[0].puntos_fidelidad;
      if (puntosDisponibles < recompensa.costo_puntos) {
        throw new Error(`Puntos insuficientes para el canje. Disponibles: ${puntosDisponibles}, requeridos: ${recompensa.costo_puntos}`);
      }

      const [canjeResult] = await connection.query(
        'INSERT INTO canje (id_cliente, id_recompensa, id_usuario, id_sucursal, puntos_usados, id_venta) VALUES (?, ?, ?, ?, ?, ?)',
        [id_cliente, canje_recompensa.id_recompensa, id_usuario, id_sucursal, recompensa.costo_puntos, id_venta]
      );

      await connection.query('UPDATE cliente SET puntos_fidelidad = puntos_fidelidad - ? WHERE id_cliente = ?', [recompensa.costo_puntos, id_cliente]);
      await connection.query(
        `INSERT INTO movimiento_puntos (id_cliente, tipo, puntos, id_venta, id_canje, descripcion) VALUES (?, 'CANJEADO', ?, ?, ?, ?)`,
        [id_cliente, -recompensa.costo_puntos, id_venta, canjeResult.insertId, `Canje: ${recompensa.nombre}`]
      );
    }

    // 5. Fidelización: otorgar puntos si la venta tiene cliente registrado
    if (id_cliente) {
      const [configRows] = await connection.query('SELECT bs_por_punto FROM configuracion_fidelizacion WHERE id_config = 1');
      const bsPorPunto = parseFloat(configRows[0]?.bs_por_punto) || 10;
      const puntosGanados = Math.floor(parseFloat(total) / bsPorPunto);
      if (puntosGanados > 0) {
        await connection.query('UPDATE cliente SET puntos_fidelidad = puntos_fidelidad + ? WHERE id_cliente = ?', [puntosGanados, id_cliente]);
        await connection.query(
          `INSERT INTO movimiento_puntos (id_cliente, tipo, puntos, id_venta, descripcion) VALUES (?, 'GANADO', ?, ?, ?)`,
          [id_cliente, puntosGanados, id_venta, `Compra #${id_venta}`]
        );
      }
    }

    await connection.commit();
    return res.status(201).json({ mensaje: 'Venta registrada con éxito', id_venta });

  } catch (err) {
    await connection.rollback();
    console.error('Error al procesar venta:', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error interno al registrar la venta') });
  } finally {
    connection.release();
  }
};

// Anular venta (Reversión completa de stock)
const anular = async (req, res) => {
  const { id } = req.params;
  const id_usuario = req.user.id_usuario;

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    // 1. Validar estado de la venta
    const [ventaRows] = await connection.query('SELECT estado, id_sucursal, id_cliente FROM venta WHERE id_venta = ? FOR UPDATE', [id]);
    if (ventaRows.length === 0) throw new Error('Venta no encontrada');
    if (ventaRows[0].id_sucursal !== req.user.id_sucursal) throw new Error('No puede anular una venta de otra sucursal');
    if (ventaRows[0].estado === 'ANULADA') throw new Error('La venta ya se encuentra anulada');

    const id_sucursal = ventaRows[0].id_sucursal;

    // 2. Recuperar detalles para revertir stock
    const [detalles] = await connection.query('SELECT * FROM detalle_venta WHERE id_venta = ?', [id]);

    for (const det of detalles) {
      // Necesitamos las unidades por caja del lote para el recalculo de cajas
      const [loteInfo] = await connection.query('SELECT stock_unidades, unidades_por_caja FROM lote WHERE id_lote = ? FOR UPDATE', [det.id_lote]);
      if (loteInfo.length === 0) continue;

      let unidades_a_devolver = parseFloat(det.cantidad);
      if (det.tipo_cantidad === 'CAJA') {
        unidades_a_devolver = parseFloat(det.cantidad) * loteInfo[0].unidades_por_caja;
      }

      const nuevoStockUnidades = loteInfo[0].stock_unidades + unidades_a_devolver;
      const nuevoStockCajas = Math.floor(nuevoStockUnidades / loteInfo[0].unidades_por_caja);

      // Actualizar stock del lote
      await connection.query(
        'UPDATE lote SET stock_unidades = ?, stock_cajas = ? WHERE id_lote = ?',
        [nuevoStockUnidades, nuevoStockCajas, det.id_lote]
      );

      // Registrar movimiento de almacén (ENTRADA por Anulación)
      await connection.query(
        `INSERT INTO movimiento_almacen 
          (id_lote, id_sucursal, id_usuario, tipo, motivo, cantidad_cajas, cantidad_unidades, referencia_id, referencia_tipo)
         VALUES (?, ?, ?, 'ENTRADA', 'ANULACION DE VENTA', ?, ?, ?, 'ANULACION')`,
        [
          det.id_lote, id_sucursal, id_usuario,
          Math.floor(unidades_a_devolver / loteInfo[0].unidades_por_caja), unidades_a_devolver,
          id
        ]
      );
    }

    // 3. Cambiar estado de la cabecera
    await connection.query('UPDATE venta SET estado = "ANULADA" WHERE id_venta = ?', [id]);

    // 4. Revertir puntos de fidelización ganados por esta venta (si los hubo)
    const id_cliente = ventaRows[0].id_cliente;
    if (id_cliente) {
      const [movRows] = await connection.query(
        `SELECT COALESCE(SUM(puntos), 0) AS total FROM movimiento_puntos WHERE id_venta = ? AND tipo = 'GANADO'`,
        [id]
      );
      const puntosAGanados = parseInt(movRows[0].total) || 0;
      if (puntosAGanados > 0) {
        const [clienteRows] = await connection.query('SELECT puntos_fidelidad FROM cliente WHERE id_cliente = ? FOR UPDATE', [id_cliente]);
        const puntosARevertir = Math.min(puntosAGanados, clienteRows[0]?.puntos_fidelidad || 0);
        if (puntosARevertir > 0) {
          await connection.query('UPDATE cliente SET puntos_fidelidad = puntos_fidelidad - ? WHERE id_cliente = ?', [puntosARevertir, id_cliente]);
          await connection.query(
            `INSERT INTO movimiento_puntos (id_cliente, tipo, puntos, id_venta, descripcion) VALUES (?, 'REVERSION', ?, ?, ?)`,
            [id_cliente, -puntosARevertir, id, `Anulación de venta #${id}`]
          );
        }
      }

      // 5. Devolver puntos gastados en un canje realizado durante esta venta (si lo hubo)
      const [canjeRows] = await connection.query(
        `SELECT COALESCE(SUM(puntos_usados), 0) AS total FROM canje WHERE id_venta = ?`, [id]
      );
      const puntosACanjeados = parseInt(canjeRows[0].total) || 0;
      if (puntosACanjeados > 0) {
        await connection.query('UPDATE cliente SET puntos_fidelidad = puntos_fidelidad + ? WHERE id_cliente = ?', [puntosACanjeados, id_cliente]);
        await connection.query(
          `INSERT INTO movimiento_puntos (id_cliente, tipo, puntos, id_venta, descripcion) VALUES (?, 'REVERSION', ?, ?, ?)`,
          [id_cliente, puntosACanjeados, id, `Devolución por anulación de venta #${id}`]
        );
      }
    }

    await connection.commit();
    return res.json({ mensaje: 'Venta anulada y stock retornado correctamente' });

  } catch (err) {
    await connection.rollback();
    console.error('Error al anular venta:', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error interno al anular la venta') });
  } finally {
    connection.release();
  }
};

// Productos disponibles para el POS — agrupados por producto, stock de la sucursal del usuario
const listarProductosPOS = async (req, res) => {
  const id_sucursal = req.user.id_sucursal;
  try {
    const [rows] = await db.promise().query(
      `SELECT
         p.id_producto,
         p.id_clasificacion,
         p.id_marca,
         c.nombre AS clasificacion_nombre,
         m.nombre AS marca_nombre,
         p.nombre,
         p.codigo_barras,
         p.imagen,
         p.precio_menor,
         p.precio_mayor,
         p.descuento_menor,
         p.descuento_mayor,
         MIN(l.unidades_por_caja) AS unidades_por_caja,
         SUM(l.stock_unidades)   AS stock_unidades_total
       FROM lote l
       JOIN producto p ON l.id_producto = p.id_producto
       LEFT JOIN clasificacion_producto c ON p.id_clasificacion = c.id_clasificacion
       LEFT JOIN marca m ON p.id_marca = m.id_marca
       WHERE l.id_sucursal = ?
         AND l.activo = 1
         AND l.stock_unidades > 0
         AND p.activo = 1
       GROUP BY
         p.id_producto, p.id_clasificacion, p.id_marca, c.nombre, m.nombre,
         p.nombre, p.codigo_barras, p.imagen,
         p.precio_menor, p.precio_mayor,
         p.descuento_menor, p.descuento_mayor
       ORDER BY p.nombre ASC`,
      [id_sucursal]
    );

    // Promociones activas hoy, por producto puntual o por categoría completa
    const [promos] = await db.promise().query(
      `SELECT pr.id_promocion, pr.valor_pct, pp.id_producto, pc.id_clasificacion
       FROM promocion pr
       LEFT JOIN promocion_producto pp ON pp.id_promocion = pr.id_promocion
       LEFT JOIN promocion_clasificacion pc ON pc.id_promocion = pr.id_promocion
       WHERE pr.activo = 1 AND CURDATE() BETWEEN pr.fecha_inicio AND pr.fecha_fin`
    );

    const mejorDescuentoPorProducto = (id_producto, id_clasificacion) => {
      let mejor = 0;
      for (const p of promos) {
        if (p.id_producto === id_producto || (p.id_clasificacion && p.id_clasificacion === id_clasificacion)) {
          if (parseFloat(p.valor_pct) > mejor) mejor = parseFloat(p.valor_pct);
        }
      }
      return mejor;
    };

    const conPromociones = rows.map((p) => {
      const pct = mejorDescuentoPorProducto(p.id_producto, p.id_clasificacion);
      if (pct <= 0) return { ...p, en_promocion: false };
      return {
        ...p,
        en_promocion: true,
        descuento_promocion_pct: pct,
        precio_menor_original: p.precio_menor,
        precio_mayor_original: p.precio_mayor,
        precio_menor: Math.round(p.precio_menor * (1 - pct / 100) * 100) / 100,
        precio_mayor: Math.round(p.precio_mayor * (1 - pct / 100) * 100) / 100,
      };
    });

    return res.json(conPromociones);
  } catch (err) {
    console.error('[listarProductosPOS]', err);
    return res.status(500).json({ error: 'Error al obtener productos para el POS' });
  }
};

const bancoEconomico = require('../services/bancoEconomico.service');

const generarQrBanco = async (req, res) => {
  const { monto } = req.body ?? {};
  const montoNum = parseFloat(monto);
  if (!montoNum || montoNum <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  }
  try {
    const [sucRows] = await db.promise().query(
      'SELECT codigo_qr FROM sucursal WHERE id_sucursal = ?',
      [req.user.id_sucursal]
    );
    const branchCode = sucRows[0]?.codigo_qr || undefined;
    const hoy = new Date().toISOString().split('T')[0];

    const resultado = await bancoEconomico.generarQR({
      transactionId: `venta-${Date.now()}`,
      monto: montoNum,
      moneda: 'BOB',
      descripcion: 'Venta POS',
      dueDate: hoy,
      branchCode,
    });

    return res.json(resultado);
  } catch (err) {
    console.error('[ventas.generarQrBanco]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'No se pudo generar el QR con el Banco Económico') });
  }
};

const estadoQrBanco = async (req, res) => {
  try {
    const estado = await bancoEconomico.estadoQR(req.params.qrId);
    return res.json({ pagado: estado.pagado });
  } catch (err) {
    console.error('[ventas.estadoQrBanco]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'No se pudo consultar el estado del QR') });
  }
};

const anularQrBanco = async (req, res) => {
  await bancoEconomico.anularQR(req.params.qrId);
  return res.json({ mensaje: 'QR anulado' });
};

module.exports = {
  listar,
  obtener,
  crear,
  anular,
  generarQrBanco,
  estadoQrBanco,
  anularQrBanco,
  listarProductosPOS,
};
