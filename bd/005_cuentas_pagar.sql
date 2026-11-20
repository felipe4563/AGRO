-- Migración: Cuentas por Pagar (abonos a compras a crédito con proveedores)
-- Fecha: 2026-08-29

ALTER TABLE `compra`
  MODIFY `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','CREDITO','OTRO') NOT NULL DEFAULT 'EFECTIVO',
  ADD COLUMN `monto_pagado` decimal(14,2) NOT NULL DEFAULT 0.00 AFTER `total`;

CREATE TABLE `pago_proveedor` (
  `id_pago_proveedor` int(11) NOT NULL AUTO_INCREMENT,
  `id_compra` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `monto` decimal(14,2) NOT NULL,
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','OTRO') NOT NULL DEFAULT 'EFECTIVO',
  `fecha_pago` datetime NOT NULL DEFAULT current_timestamp(),
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_pago_proveedor`),
  KEY `fk_pp_compra` (`id_compra`),
  KEY `fk_pp_sucursal` (`id_sucursal`),
  KEY `fk_pp_usuario` (`id_usuario`),
  CONSTRAINT `fk_pp_compra` FOREIGN KEY (`id_compra`) REFERENCES `compra` (`id_compra`),
  CONSTRAINT `fk_pp_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_pp_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nuevos permisos del módulo "cuentas_pagar"
INSERT INTO `permiso` (`modulo`, `accion`, `nombre_clave`, `descripcion`) VALUES
  ('cuentas_pagar', 'ver',            'cuentas_pagar.ver',            'Ver cuentas por pagar (compras a crédito con saldo pendiente)'),
  ('cuentas_pagar', 'registrar_pago', 'cuentas_pagar.registrar_pago', 'Registrar un abono a una compra a crédito');

-- Otorgar los nuevos permisos a los mismos roles que ya pueden crear compras
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT rp.id_rol, p.id_permiso
FROM rol_permiso rp
JOIN permiso p ON p.nombre_clave IN ('cuentas_pagar.ver', 'cuentas_pagar.registrar_pago')
WHERE rp.id_permiso = (SELECT id_permiso FROM permiso WHERE nombre_clave = 'compras.crear');
