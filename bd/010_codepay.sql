-- Migración: integración de la pasarela de pago QR CodePay.
-- Agrega CODEPAY como tercer tipo de QR de venta (junto a MANUAL y BANCO) y
-- una tabla para llevar el estado de cada transacción CodePay, que se
-- actualiza vía webhook (confirmación primaria) o por consulta directa a la
-- API de CodePay como respaldo si el webhook no llega.
-- Fecha: 2026-09-21

ALTER TABLE venta
  MODIFY COLUMN qr_tipo enum('MANUAL','BANCO','CODEPAY') DEFAULT NULL;

CREATE TABLE codepay_transaccion (
  tx_id VARCHAR(60) NOT NULL,
  order_id VARCHAR(30) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  estado ENUM('PENDING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  creado_en DATETIME NOT NULL DEFAULT current_timestamp(),
  actualizado_en DATETIME NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (tx_id),
  KEY idx_codepay_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
