-- Migración: código de barras propio por lote (trazabilidad exacta al vender)
-- Fecha: 2026-08-30

ALTER TABLE `lote`
  ADD COLUMN `codigo_barras` varchar(30) DEFAULT NULL AFTER `numero_lote`,
  ADD UNIQUE KEY `uq_lote_codigo_barras` (`codigo_barras`);
