-- Migración: Combos y Promociones
-- Fecha: 2026-08-21

CREATE TABLE `combo` (
  `id_combo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_combo` decimal(14,2) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_combo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `combo_producto` (
  `id_combo_producto` int(11) NOT NULL AUTO_INCREMENT,
  `id_combo` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_combo_producto`),
  KEY `fk_cp_combo` (`id_combo`),
  KEY `fk_cp_producto` (`id_producto`),
  CONSTRAINT `fk_cp_combo` FOREIGN KEY (`id_combo`) REFERENCES `combo` (`id_combo`) ON DELETE CASCADE,
  CONSTRAINT `fk_cp_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `promocion` (
  `id_promocion` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `valor_pct` decimal(5,2) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_promocion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `promocion_producto` (
  `id_promocion` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  PRIMARY KEY (`id_promocion`, `id_producto`),
  KEY `fk_pp_producto` (`id_producto`),
  CONSTRAINT `fk_pp_promocion` FOREIGN KEY (`id_promocion`) REFERENCES `promocion` (`id_promocion`) ON DELETE CASCADE,
  CONSTRAINT `fk_pp_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `promocion_clasificacion` (
  `id_promocion` int(11) NOT NULL,
  `id_clasificacion` int(11) NOT NULL,
  PRIMARY KEY (`id_promocion`, `id_clasificacion`),
  KEY `fk_pc_clasificacion` (`id_clasificacion`),
  CONSTRAINT `fk_pc_promocion` FOREIGN KEY (`id_promocion`) REFERENCES `promocion` (`id_promocion`) ON DELETE CASCADE,
  CONSTRAINT `fk_pc_clasificacion` FOREIGN KEY (`id_clasificacion`) REFERENCES `clasificacion_producto` (`id_clasificacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `detalle_venta` ADD COLUMN `id_combo` int(11) DEFAULT NULL AFTER `id_producto`;
ALTER TABLE `detalle_venta` ADD CONSTRAINT `fk_dv_combo` FOREIGN KEY (`id_combo`) REFERENCES `combo` (`id_combo`);

-- Nuevos permisos
INSERT INTO `permiso` (`modulo`, `accion`, `nombre_clave`, `descripcion`) VALUES
  ('combos', 'ver',      'combos.ver',      'Ver listado de combos'),
  ('combos', 'crear',    'combos.crear',    'Crear nuevos combos'),
  ('combos', 'editar',   'combos.editar',   'Editar un combo'),
  ('combos', 'eliminar', 'combos.eliminar', 'Eliminar un combo'),
  ('combos', 'activar',  'combos.activar',  'Activar o desactivar un combo'),
  ('promociones', 'ver',      'promociones.ver',      'Ver listado de promociones'),
  ('promociones', 'crear',    'promociones.crear',    'Crear nuevas promociones'),
  ('promociones', 'editar',   'promociones.editar',   'Editar una promoción'),
  ('promociones', 'eliminar', 'promociones.eliminar', 'Eliminar una promoción'),
  ('promociones', 'activar',  'promociones.activar',  'Activar o desactivar una promoción');

-- 'ver' para los mismos roles que ya pueden vender
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT rp.id_rol, p.id_permiso
FROM rol_permiso rp
JOIN permiso p ON p.nombre_clave IN ('combos.ver', 'promociones.ver')
WHERE rp.id_permiso = (SELECT id_permiso FROM permiso WHERE nombre_clave = 'ventas.crear');

-- crear/editar/eliminar/activar para los mismos roles que administran productos
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT rp.id_rol, p.id_permiso
FROM rol_permiso rp
JOIN permiso p ON p.nombre_clave IN (
  'combos.crear', 'combos.editar', 'combos.eliminar', 'combos.activar',
  'promociones.crear', 'promociones.editar', 'promociones.eliminar', 'promociones.activar'
)
WHERE rp.id_permiso = (SELECT id_permiso FROM permiso WHERE nombre_clave = 'productos.crear');
