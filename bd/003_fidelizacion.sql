-- Migración: Fidelización (puntos y recompensas)
-- Fecha: 2026-08-21

ALTER TABLE `cliente` ADD COLUMN `puntos_fidelidad` int(11) NOT NULL DEFAULT 0;

CREATE TABLE `configuracion_fidelizacion` (
  `id_config` int(11) NOT NULL DEFAULT 1,
  `bs_por_punto` decimal(10,2) NOT NULL DEFAULT 10.00,
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_config`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `configuracion_fidelizacion` (`id_config`, `bs_por_punto`) VALUES (1, 10.00);

CREATE TABLE `recompensa` (
  `id_recompensa` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `costo_puntos` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_recompensa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `canje` (
  `id_canje` int(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` int(11) NOT NULL,
  `id_recompensa` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `puntos_usados` int(11) NOT NULL,
  `fecha_canje` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_canje`),
  KEY `fk_canje_cliente` (`id_cliente`),
  KEY `fk_canje_recompensa` (`id_recompensa`),
  KEY `fk_canje_usuario` (`id_usuario`),
  KEY `fk_canje_sucursal` (`id_sucursal`),
  CONSTRAINT `fk_canje_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`),
  CONSTRAINT `fk_canje_recompensa` FOREIGN KEY (`id_recompensa`) REFERENCES `recompensa` (`id_recompensa`),
  CONSTRAINT `fk_canje_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `fk_canje_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `movimiento_puntos` (
  `id_movimiento` int(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` int(11) NOT NULL,
  `tipo` enum('GANADO','CANJEADO','REVERSION','AJUSTE') NOT NULL,
  `puntos` int(11) NOT NULL,
  `id_venta` int(11) DEFAULT NULL,
  `id_canje` int(11) DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_mp_cliente` (`id_cliente`),
  KEY `fk_mp_venta` (`id_venta`),
  KEY `fk_mp_canje` (`id_canje`),
  CONSTRAINT `fk_mp_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`),
  CONSTRAINT `fk_mp_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`),
  CONSTRAINT `fk_mp_canje` FOREIGN KEY (`id_canje`) REFERENCES `canje` (`id_canje`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permisos
INSERT INTO `permiso` (`modulo`, `accion`, `nombre_clave`, `descripcion`) VALUES
  ('fidelizacion', 'ver',                    'fidelizacion.ver',                    'Ver puntos de clientes y catálogo de recompensas'),
  ('fidelizacion', 'canjear',                'fidelizacion.canjear',                'Canjear puntos de un cliente por una recompensa'),
  ('fidelizacion', 'gestionar_recompensas',  'fidelizacion.gestionar_recompensas',  'Crear, editar o eliminar recompensas'),
  ('fidelizacion', 'configurar',             'fidelizacion.configurar',             'Configurar la tasa de puntos por Bs gastado');

-- 'ver' y 'canjear' para los mismos roles que ya pueden vender
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT rp.id_rol, p.id_permiso
FROM rol_permiso rp
JOIN permiso p ON p.nombre_clave IN ('fidelizacion.ver', 'fidelizacion.canjear')
WHERE rp.id_permiso = (SELECT id_permiso FROM permiso WHERE nombre_clave = 'ventas.crear');

-- gestionar_recompensas/configurar para los mismos roles que administran productos
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT rp.id_rol, p.id_permiso
FROM rol_permiso rp
JOIN permiso p ON p.nombre_clave IN ('fidelizacion.gestionar_recompensas', 'fidelizacion.configurar')
WHERE rp.id_permiso = (SELECT id_permiso FROM permiso WHERE nombre_clave = 'productos.crear');
