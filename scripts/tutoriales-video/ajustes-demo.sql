-- Ajustes aplicados sobre la base recién restaurada, SOLO para grabar los
-- tutoriales. restaurar.sh vuelve a poner la base exactamente como estaba
-- (este archivo nunca se aplica sobre la base real de uso diario).
--
-- La base de desarrollo tiene de arrastre algunos registros de prueba
-- creados al probar funciones durante el desarrollo (nombres como "b", "c",
-- "CAJA_TEST_EDITADA"). En vez de ocultarlos, los reciclamos: les damos un
-- nombre real y los dejamos activos, porque ya están enganchados a historial
-- real (ventas, lotes) que no se puede borrar sin perder ese historial.

-- ── Catálogo: reciclar los 3 registros de prueba que sí están en uso ───────
UPDATE clasificacion_producto SET nombre = 'Herramientas', activo = 1 WHERE id_clasificacion = 2;
UPDATE marca               SET nombre = 'ForjaBol',    activo = 1 WHERE id_marca = 2;
UPDATE unidad_medida        SET nombre = 'Caja', abreviatura = 'cj'  WHERE id_unidad = 2;

-- ── Catálogo: borrar lo que quedó de prueba y nunca se llegó a usar ────────
DELETE FROM clasificacion_producto WHERE id_clasificacion IN (6, 7);
DELETE FROM marca                  WHERE id_marca = 6;
DELETE FROM caja                   WHERE id_caja IN (2, 3, 4);

-- ── Producto de prueba "A" → producto real, sin la foto de prueba ─────────
UPDATE producto SET
  nombre = 'Pala de Jardín',
  descripcion = 'Pala de mano reforzada, mango de madera — vendida por caja de 12 unidades.',
  imagen = NULL,
  precio_mayor = 45.00,
  precio_menor = 55.00,
  stock_minimo = 24
WHERE id_producto = 6;

-- ── Admin: sin la foto de prueba ──────────────────────────────────────────
-- (el logo del negocio se deja en NULL a propósito: así se usa el logo por
-- defecto del sistema — los .jpeg/.png subidos en uploads/ son de pruebas de
-- otros negocios, no sirven para este tutorial)
UPDATE usuario SET foto = NULL WHERE id_usuario = 1;
UPDATE configuracion_negocio SET logo = NULL WHERE id_config = 1;

-- ── Productos extra para que el catálogo no se vea vacío ──────────────────
INSERT INTO producto (id_clasificacion, id_marca, id_unidad, nombre, descripcion, precio_mayor, precio_menor, stock_minimo)
VALUES
  (5, 4, 5, 'Insecticida BioStop 1L', 'Insecticida de amplio espectro para cultivos de hortaliza.', 38.00, 45.00, 15),
  (3, 3, 3, 'Urea Granulada 50kg',    'Fertilizante nitrogenado de alta pureza, saco de 50kg.',     180.00, 210.00, 10),
  (4, 3, 4, 'Semilla de Tomate Riogrande', 'Semilla híbrida certificada, alto rendimiento.',         12.00, 15.00, 30);

-- ── Lotes (stock) para los productos nuevos y los existentes sin stock ────
INSERT INTO lote (id_producto, id_sucursal, numero_lote, fecha_ingreso_almacen, fecha_vencimiento, cantidad_cajas, unidades_por_caja, precio_por_caja, stock_cajas, stock_unidades, observaciones)
SELECT id_producto, 1, CONCAT('LOT-DEMO-', id_producto), CURDATE(), DATE_ADD(CURDATE(), INTERVAL 240 DAY), 8, 12, 300.00, 8, 96, 'Stock de demostración'
FROM producto WHERE nombre IN ('Insecticida BioStop 1L', 'Urea Granulada 50kg', 'Semilla de Tomate Riogrande', 'Pala de Jardín');

-- ── Turno de caja abierto hoy, para poder grabar una venta y la Caja ──────
INSERT INTO apertura_cierre_caja (id_caja, id_usuario, id_sucursal, monto_inicial, estado)
VALUES (1, 1, 1, 200.00, 'ABIERTA');

-- ── Terceros: borrar duplicados de prueba sin historial, dejar los reales ──
DELETE FROM cliente WHERE id_cliente IN (2, 3);
INSERT INTO cliente (nombre, apellido, ci_nit, telefono, tipo_cliente)
VALUES ('María', 'Quispe', '7458912', '71234567', 'MINORISTA');

INSERT INTO proveedor (empresa, nit, contacto, telefono)
VALUES ('AgroInsumos Santa Cruz', '1023456019', 'Carla Rojas', '33456789');

-- ── Usuarios: borrar las cuentas de prueba creadas por los tests ──────────
DELETE FROM usuario WHERE id_usuario IN (2, 3);

-- ── Sucursal principal: dirección real + una segunda sucursal para demos
--    de traslados entre sucursales ────────────────────────────────────────
UPDATE sucursal SET
  direccion = 'Av. Circunvalación, 3er anillo',
  ciudad = 'Santa Cruz de la Sierra',
  telefono = '33000000'
WHERE id_sucursal = 1;

INSERT INTO sucursal (nombre, direccion, ciudad, telefono)
VALUES ('Sucursal Norte', 'Av. Banzer, km 8', 'Santa Cruz de la Sierra', '33111111');

-- ── Promoción: correr sus fechas para que se vea vigente hoy ──────────────
UPDATE promocion SET
  fecha_inicio = DATE_SUB(CURDATE(), INTERVAL 2 DAY),
  fecha_fin = DATE_ADD(CURDATE(), INTERVAL 10 DAY)
WHERE id_promocion = 1;
