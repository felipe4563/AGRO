-- Migración: retirar permisos "ver_detalle" que nunca llegaron a proteger
-- ninguna funcionalidad real (no existe una vista de detalle separada del
-- listado/modal de edición en estos módulos).
-- Fecha: 2026-08-30

DELETE rp FROM rol_permiso rp
JOIN permiso p ON p.id_permiso = rp.id_permiso
WHERE p.nombre_clave IN (
  'usuarios.ver_detalle',
  'proveedores.ver_detalle',
  'compras.ver_detalle',
  'clientes.ver_detalle'
);

DELETE FROM permiso WHERE nombre_clave IN (
  'usuarios.ver_detalle',
  'proveedores.ver_detalle',
  'compras.ver_detalle',
  'clientes.ver_detalle'
);
