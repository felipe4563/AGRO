-- Migración: rastro de anulaciones de venta en el Libro de Caja
-- Fecha: 2026-08-30

ALTER TABLE `venta`
  ADD COLUMN `fecha_anulacion` datetime DEFAULT NULL AFTER `estado`,
  ADD COLUMN `id_usuario_anulacion` int(11) DEFAULT NULL AFTER `fecha_anulacion`,
  ADD KEY `fk_venta_usuario_anulacion` (`id_usuario_anulacion`),
  ADD CONSTRAINT `fk_venta_usuario_anulacion` FOREIGN KEY (`id_usuario_anulacion`) REFERENCES `usuario` (`id_usuario`);

-- Ventas ya anuladas antes de esta migración: sin fecha_anulacion no generarían la línea
-- de reversión en el Libro de Caja, quedando como ingreso "fantasma". Se usa fecha_venta
-- como aproximación para que el efecto neto en el período siga siendo cero.
UPDATE `venta` SET `fecha_anulacion` = `fecha_venta` WHERE `estado` = 'ANULADA' AND `fecha_anulacion` IS NULL;
