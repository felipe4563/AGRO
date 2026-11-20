-- Migración: nuevo permiso 'eliminar' en el módulo almacen.
-- Permite eliminar definitivamente un lote creado por error o duplicado
-- (solo si nunca tuvo ventas, compras ni traslados asociados; de lo
-- contrario se debe usar "Dar de baja"). Mismo criterio de acceso que
-- 'almacen.dar_baja_lote': Administrador y Almacenero.
-- Fecha: 2026-11-19

INSERT INTO permiso (modulo, accion, nombre_clave, descripcion)
VALUES ('almacen', 'eliminar', 'almacen.eliminar', 'Eliminar definitivamente un lote sin movimientos reales (duplicado o error de carga)');

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r, permiso p
WHERE r.nombre IN ('Administrador', 'Almacenero') AND p.nombre_clave = 'almacen.eliminar';
