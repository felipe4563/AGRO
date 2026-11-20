-- Migración: Cuentas por Cobrar (abonos a ventas a crédito)
-- Fecha: 2026-08-21

CREATE TABLE `pago_credito` (
  `id_pago` int(11) NOT NULL AUTO_INCREMENT,
  `id_venta` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `monto` decimal(14,2) NOT NULL,
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','OTRO') NOT NULL DEFAULT 'EFECTIVO',
  `fecha_pago` datetime NOT NULL DEFAULT current_timestamp(),
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_pago`),
  KEY `fk_pc_venta` (`id_venta`),
  KEY `fk_pc_sucursal` (`id_sucursal`),
  KEY `fk_pc_usuario` (`id_usuario`),
  CONSTRAINT `fk_pc_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`),
  CONSTRAINT `fk_pc_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_pc_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nuevos permisos del módulo "cobros"
INSERT INTO `permiso` (`modulo`, `accion`, `nombre_clave`, `descripcion`) VALUES
  ('cobros', 'ver',            'cobros.ver',            'Ver cuentas por cobrar (ventas a crédito con saldo pendiente)'),
  ('cobros', 'registrar_pago', 'cobros.registrar_pago', 'Registrar un abono a una venta a crédito');

-- Otorgar los nuevos permisos a los mismos roles que ya pueden crear ventas
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT rp.id_rol, p.id_permiso
FROM rol_permiso rp
JOIN permiso p ON p.nombre_clave IN ('cobros.ver', 'cobros.registrar_pago')
WHERE rp.id_permiso = (SELECT id_permiso FROM permiso WHERE nombre_clave = 'ventas.crear');
