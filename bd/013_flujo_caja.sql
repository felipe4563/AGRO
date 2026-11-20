-- Migración: nuevo permiso 'caja_flujo' en el módulo reportes.
-- Reporte de Flujo de Caja detallado por día (ingresos de ventas y cobros de
-- crédito vs egresos de compras, pagos a proveedores y gastos de caja),
-- desglosado por Efectivo/Digital, con flujo diario y acumulado — inspirado
-- en bd/Flujodecaja.xlsx. Mismo criterio de acceso que 'reportes.caja'
-- (arqueos): Administrador y Almacenero.
-- Fecha: 2026-11-17

INSERT INTO permiso (modulo, accion, nombre_clave, descripcion)
VALUES ('reportes', 'caja_flujo', 'reportes.caja_flujo', 'Ver el flujo de caja detallado por día (ingresos vs egresos, efectivo y digital)');

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r, permiso p
WHERE r.nombre IN ('Administrador', 'Almacenero') AND p.nombre_clave = 'reportes.caja_flujo';
