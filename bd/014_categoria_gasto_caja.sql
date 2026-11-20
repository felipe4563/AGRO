-- Migración: clasificación de movimientos de gasto_caja (tipo + categoría)
-- para el nuevo Flujo de Caja detallado (estilo planilla, días en columnas).
-- `tipo` distingue ingresos manuales de egresos (antes gasto_caja solo
-- modelaba egresos). `categoria` separa gastos operativos (Costo Variable,
-- Costo Fijo) de Retiros/fuera del negocio, y "Clasificar gastos" permite
-- reasignarla por concepto. Default EGRESO/OTRO preserva el comportamiento
-- actual para todas las filas existentes y para el modal viejo de "Anotar
-- gasto" en Caja (que no manda estos campos).
-- Fecha: 2026-11-18

ALTER TABLE gasto_caja
  ADD COLUMN tipo ENUM('INGRESO','EGRESO') NOT NULL DEFAULT 'EGRESO' AFTER monto,
  ADD COLUMN categoria ENUM('VARIABLE','FIJO','RETIRO','OTRO') NOT NULL DEFAULT 'OTRO' AFTER tipo;

INSERT INTO permiso (modulo, accion, nombre_clave, descripcion)
VALUES ('caja', 'clasificar_gastos', 'caja.clasificar_gastos', 'Reclasificar gastos de caja por categoría (costo variable, costo fijo, retiro)');

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r, permiso p
WHERE r.nombre IN ('Administrador', 'Almacenero') AND p.nombre_clave = 'caja.clasificar_gastos';
