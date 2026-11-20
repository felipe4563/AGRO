-- Migración: nuevo permiso 'cerrar_todas' en el módulo caja.
-- Antes, cualquier usuario con permiso 'cerrar' podía cerrar el turno de
-- CUALQUIER cajero de su sucursal (el backend solo filtraba por sucursal,
-- no por quién lo abrió). Ahora, sin 'cerrar_todas' cada usuario solo puede
-- cerrar el turno que él mismo abrió; con 'cerrar_todas' (Administrador)
-- puede cerrar cualquiera, como respaldo si el cajero no está disponible.
-- Fecha: 2026-08-31

INSERT INTO permiso (modulo, accion, nombre_clave, descripcion)
VALUES ('caja', 'cerrar_todas', 'caja.cerrar_todas', 'Cerrar el turno de caja de cualquier usuario, no solo el propio');

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r, permiso p
WHERE r.nombre = 'Administrador' AND p.nombre_clave = 'caja.cerrar_todas';
