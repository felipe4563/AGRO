-- Migración: nuevo permiso 'rentabilidad' en el módulo reportes.
-- Reporte de costo vs precio de venta por lote, con calculadora de margen
-- (simula un precio hipotético y muestra la ganancia/pérdida resultante).
-- Mismo criterio de acceso que 'inventario_valorizado' (dato de costo
-- sensible): Administrador y Almacenero, no Cajero.
-- Fecha: 2026-11-07

INSERT INTO permiso (modulo, accion, nombre_clave, descripcion)
VALUES ('reportes', 'rentabilidad', 'reportes.rentabilidad', 'Ver rentabilidad de productos (costo de lote vs precio de venta) y simular precios');

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r, permiso p
WHERE r.nombre IN ('Administrador', 'Almacenero') AND p.nombre_clave = 'reportes.rentabilidad';
