-- Resetea la operación de una instancia (ventas, compras, caja, stock y todo
-- lo relacionado), SIN tocar el catálogo ya cargado: productos, categorías,
-- marcas, unidades, combos, promociones, sucursales, usuarios, roles,
-- clientes, proveedores ni la configuración del negocio.
--
-- NO es una migración: no se aplica solo. Hay que correrlo a mano, UNA VEZ,
-- contra la base de la instancia que se quiera resetear (nunca contra todas
-- a la vez: cada cliente tiene su propia base).
--
-- Antes de correrlo, hacé un respaldo (por si hace falta volver atrás):
--   docker compose exec mysql mysqldump -u root -p<pass> <db> > respaldo_antes_de_resetear.sql
--
-- Para correrlo (ejemplo, modo multi-instancia, instancia "agrohidalgo"):
--   docker compose -p agrohidalgo --env-file instancias/agrohidalgo.env exec -T mysql \
--     mysql -u root -p<pass> <db> < deploy/resetear-operacion.sql
--
-- Después de correrlo, cada sucursal va a necesitar una Nueva Entrada en
-- Almacén para volver a tener stock (los productos quedan, pero con 0
-- unidades), y un nuevo turno de Caja abierto para poder vender.

START TRANSACTION;

-- ── Fidelización: historial de puntos y canjes (dependen de venta) ────────
DELETE FROM movimiento_puntos;
DELETE FROM canje;

-- ── Ventas y sus pagos a crédito ───────────────────────────────────────────
DELETE FROM pago_credito;
DELETE FROM detalle_venta;
DELETE FROM codepay_transaccion;
DELETE FROM venta;

-- ── Compras y sus pagos a proveedores ──────────────────────────────────────
DELETE FROM pago_proveedor;
DELETE FROM detalle_compra;
DELETE FROM compra;

-- ── Stock: traslados, movimientos y lotes (deja a cada producto en 0) ─────
DELETE FROM traslado;
DELETE FROM movimiento_almacen;
DELETE FROM lote;

-- ── Caja: gastos y turnos de apertura/cierre ──────────────────────────────
DELETE FROM gasto_caja;
DELETE FROM apertura_cierre_caja;

COMMIT;

-- Reinicia los autoincrementales para que los próximos registros vuelvan a
-- numerarse desde 1 (no afecta a lo que se mantiene: producto, cliente,
-- proveedor, sucursal, usuario, combo, promocion, etc. siguen con su propia
-- numeración intacta).
ALTER TABLE movimiento_puntos    AUTO_INCREMENT = 1;
ALTER TABLE canje                AUTO_INCREMENT = 1;
ALTER TABLE pago_credito         AUTO_INCREMENT = 1;
ALTER TABLE detalle_venta        AUTO_INCREMENT = 1;
ALTER TABLE venta                AUTO_INCREMENT = 1;
ALTER TABLE pago_proveedor       AUTO_INCREMENT = 1;
ALTER TABLE detalle_compra       AUTO_INCREMENT = 1;
ALTER TABLE compra               AUTO_INCREMENT = 1;
ALTER TABLE traslado             AUTO_INCREMENT = 1;
ALTER TABLE movimiento_almacen   AUTO_INCREMENT = 1;
ALTER TABLE lote                 AUTO_INCREMENT = 1;
ALTER TABLE gasto_caja           AUTO_INCREMENT = 1;
ALTER TABLE apertura_cierre_caja AUTO_INCREMENT = 1;
