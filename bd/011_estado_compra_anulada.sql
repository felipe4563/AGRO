-- Migración: corrige el enum compra.estado.
-- El esquema definía ('PENDIENTE','RECIBIDO','CANCELADO'), pero el código
-- (compras.Controller.js, al anular una compra) siempre usó el string
-- 'ANULADA', que no es miembro de ese enum. En modo no estricto, MySQL
-- guardaba '' (vacío) en silencio en vez de rechazar el UPDATE — cualquier
-- compra PENDIENTE que se anuló quedó con estado vacío, invisible en los
-- filtros y mostrando un badge en blanco en la UI.
-- También corrige el DEFAULT, que estaba en 'RECIBIDO' (una compra nueva sin
-- estado explícito no debería nacer como si ya hubiera llegado el stock).
-- Fecha: 2026-10-23

ALTER TABLE compra
  MODIFY COLUMN estado enum('PENDIENTE','RECIBIDO','ANULADA') NOT NULL DEFAULT 'PENDIENTE';

-- Recupera las compras que quedaron con estado vacío por este bug — la única
-- forma de llegar ahí era intentar anular una compra PENDIENTE.
UPDATE compra SET estado = 'ANULADA' WHERE estado = '';
