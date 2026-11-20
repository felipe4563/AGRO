-- Migración: Recompensas tipadas (Producto/Combo o Descuento) + canje integrado a la venta
-- Fecha: 2026-08-21

DELETE FROM `recompensa`;

ALTER TABLE `recompensa`
  ADD COLUMN `tipo` enum('PRODUCTO','DESCUENTO') NOT NULL DEFAULT 'DESCUENTO' AFTER `nombre`,
  ADD COLUMN `id_producto` int(11) DEFAULT NULL AFTER `descripcion`,
  ADD COLUMN `id_combo` int(11) DEFAULT NULL AFTER `id_producto`,
  ADD COLUMN `tipo_descuento` enum('BS','PCT') DEFAULT NULL AFTER `id_combo`,
  ADD COLUMN `valor_descuento` decimal(10,2) DEFAULT NULL AFTER `tipo_descuento`,
  ADD CONSTRAINT `fk_recompensa_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`),
  ADD CONSTRAINT `fk_recompensa_combo` FOREIGN KEY (`id_combo`) REFERENCES `combo` (`id_combo`);

ALTER TABLE `canje`
  ADD COLUMN `id_venta` int(11) DEFAULT NULL AFTER `id_sucursal`,
  ADD CONSTRAINT `fk_canje_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`);
