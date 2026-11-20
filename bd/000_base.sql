-- ============================================================================
-- SIS-AGRO — Base fija para generar produccion.sql (deploy/generar-produccion.sh)
-- ============================================================================
-- Incluye hasta migración 011. NO editar este archivo a mano a partir de
-- ahora: los cambios de esquema nuevos van como bd/0NN_*.sql (número mayor
-- a 011) y deploy/generar-produccion.sh los aplica sobre esta base para
-- regenerar bd/produccion.sql automáticamente.
-- ============================================================================
--
-- Contenido:
--   1. Estructura completa de la base de datos (todas las tablas, sin datos).
--   2. Catálogo de permisos del sistema (137) y los 3 roles base:
--        Administrador (todos los permisos), Cajero, Almacenero
--      con el set de permisos ya afinado y probado en el sistema en uso.
--   3. Datos mínimos de arranque (bootstrap) para poder iniciar sesión por
--      primera vez: 1 sucursal, 1 caja y 1 usuario Administrador.
--
-- NO incluye datos de negocio (productos, clientes, ventas, compras, etc.) —
-- la base queda lista para operar desde cero.
--
-- Uso:
--   mysql -u root -p nombre_de_tu_bd < produccion.sql
--
-- ⚠️  IMPORTANTE — Antes de usar en producción:
--   - El usuario administrador de arranque usa la contraseña temporal
--     "CambiarAhora123!" — inicia sesión y CÁMBIALA inmediatamente desde
--     Usuarios > Restablecer contraseña.
--   - Ajusta los datos de la sucursal de ejemplo (nombre, dirección, etc.)
--     a los reales del cliente.
-- ============================================================================


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `apertura_cierre_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `apertura_cierre_caja` (
  `id_apertura` int(11) NOT NULL AUTO_INCREMENT,
  `id_caja` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `monto_inicial` decimal(14,2) NOT NULL DEFAULT 0.00,
  `monto_esperado` decimal(14,2) DEFAULT NULL,
  `monto_final` decimal(14,2) DEFAULT NULL,
  `diferencia` decimal(14,2) DEFAULT NULL,
  `fecha_apertura` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_cierre` datetime DEFAULT NULL,
  `estado` enum('ABIERTA','CERRADA') NOT NULL DEFAULT 'ABIERTA',
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_apertura`),
  KEY `fk_acc_caja` (`id_caja`),
  KEY `fk_acc_usuario` (`id_usuario`),
  KEY `fk_acc_sucursal` (`id_sucursal`),
  CONSTRAINT `fk_acc_caja` FOREIGN KEY (`id_caja`) REFERENCES `caja` (`id_caja`),
  CONSTRAINT `fk_acc_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_acc_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gasto_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gasto_caja` (
  `id_gasto` int(11) NOT NULL AUTO_INCREMENT,
  `id_apertura` int(11) DEFAULT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `concepto` varchar(150) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','OTRO') NOT NULL DEFAULT 'EFECTIVO',
  `observaciones` text DEFAULT NULL,
  `fecha_gasto` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_gasto`),
  KEY `fk_gc_apertura` (`id_apertura`),
  KEY `fk_gc_sucursal` (`id_sucursal`),
  KEY `fk_gc_usuario` (`id_usuario`),
  CONSTRAINT `fk_gc_apertura` FOREIGN KEY (`id_apertura`) REFERENCES `apertura_cierre_caja` (`id_apertura`),
  CONSTRAINT `fk_gc_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_gc_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `caja` (
  `id_caja` int(11) NOT NULL AUTO_INCREMENT,
  `id_sucursal` int(11) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_caja`),
  KEY `fk_caja_sucursal` (`id_sucursal`),
  CONSTRAINT `fk_caja_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `canje`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `canje` (
  `id_canje` int(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` int(11) NOT NULL,
  `id_recompensa` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_venta` int(11) DEFAULT NULL,
  `puntos_usados` int(11) NOT NULL,
  `fecha_canje` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_canje`),
  KEY `fk_canje_cliente` (`id_cliente`),
  KEY `fk_canje_recompensa` (`id_recompensa`),
  KEY `fk_canje_usuario` (`id_usuario`),
  KEY `fk_canje_sucursal` (`id_sucursal`),
  KEY `fk_canje_venta` (`id_venta`),
  CONSTRAINT `fk_canje_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`),
  CONSTRAINT `fk_canje_recompensa` FOREIGN KEY (`id_recompensa`) REFERENCES `recompensa` (`id_recompensa`),
  CONSTRAINT `fk_canje_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_canje_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `fk_canje_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `clasificacion_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clasificacion_producto` (
  `id_clasificacion` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_clasificacion`),
  UNIQUE KEY `uq_clasificacion_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cliente` (
  `id_cliente` int(11) NOT NULL AUTO_INCREMENT,
  `ci_nit` varchar(20) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `empresa` varchar(150) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `tipo_cliente` enum('MINORISTA','MAYORISTA') NOT NULL DEFAULT 'MINORISTA',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `puntos_fidelidad` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `uq_cliente_cinit` (`ci_nit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `codepay_transaccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `codepay_transaccion` (
  `tx_id` varchar(60) NOT NULL,
  `order_id` varchar(30) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `estado` enum('PENDING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`tx_id`),
  KEY `idx_codepay_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `combo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `combo` (
  `id_combo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_combo` decimal(14,2) NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_combo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `combo_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `compra` (
  `id_compra` int(11) NOT NULL AUTO_INCREMENT,
  `id_proveedor` int(11) DEFAULT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `nro_factura` varchar(60) DEFAULT NULL,
  `fecha_compra` date NOT NULL,
  `subtotal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `descuento` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `monto_pagado` decimal(14,2) NOT NULL DEFAULT 0.00,
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','CREDITO','OTRO') NOT NULL DEFAULT 'EFECTIVO',
  `estado` enum('PENDIENTE','RECIBIDO','ANULADA') NOT NULL DEFAULT 'PENDIENTE',
  `observaciones` text DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_compra`),
  KEY `fk_compra_proveedor` (`id_proveedor`),
  KEY `fk_compra_sucursal` (`id_sucursal`),
  KEY `fk_compra_usuario` (`id_usuario`),
  CONSTRAINT `fk_compra_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedor` (`id_proveedor`),
  CONSTRAINT `fk_compra_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_compra_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `configuracion_fidelizacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `configuracion_fidelizacion` (
  `id_config` int(11) NOT NULL DEFAULT 1,
  `bs_por_punto` decimal(10,2) NOT NULL DEFAULT 10.00,
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_config`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `configuracion_negocio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `configuracion_negocio` (
  `id_config` int(11) NOT NULL DEFAULT 1,
  `nombre_empresa` varchar(150) NOT NULL DEFAULT 'SIS-AGRO',
  `nit` varchar(30) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_config`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `detalle_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_compra` (
  `id_detalle_compra` int(11) NOT NULL AUTO_INCREMENT,
  `id_compra` int(11) NOT NULL,
  `id_lote` int(11) DEFAULT NULL,
  `id_producto` int(11) NOT NULL,
  `numero_lote_fab` varchar(60) DEFAULT NULL,
  `fecha_produccion` date DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `cantidad_cajas` int(11) NOT NULL DEFAULT 0,
  `unidades_por_caja` int(11) NOT NULL DEFAULT 1,
  `precio_por_caja` decimal(12,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(14,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id_detalle_compra`),
  KEY `fk_dc_compra` (`id_compra`),
  KEY `fk_dc_lote` (`id_lote`),
  KEY `fk_dc_producto` (`id_producto`),
  CONSTRAINT `fk_dc_compra` FOREIGN KEY (`id_compra`) REFERENCES `compra` (`id_compra`),
  CONSTRAINT `fk_dc_lote` FOREIGN KEY (`id_lote`) REFERENCES `lote` (`id_lote`),
  CONSTRAINT `fk_dc_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `detalle_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_venta` (
  `id_detalle_venta` int(11) NOT NULL AUTO_INCREMENT,
  `id_venta` int(11) NOT NULL,
  `id_lote` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_combo` int(11) DEFAULT NULL,
  `tipo_cantidad` enum('CAJA','UNIDAD') NOT NULL DEFAULT 'UNIDAD',
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `precio_unitario` decimal(12,2) NOT NULL,
  `descuento_pct` decimal(5,2) NOT NULL DEFAULT 0.00,
  `promocion_pct` decimal(5,2) NOT NULL DEFAULT 0.00,
  `descuento_monto` decimal(12,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(14,2) NOT NULL,
  PRIMARY KEY (`id_detalle_venta`),
  KEY `fk_dv_venta` (`id_venta`),
  KEY `fk_dv_lote` (`id_lote`),
  KEY `fk_dv_producto` (`id_producto`),
  KEY `fk_dv_combo` (`id_combo`),
  CONSTRAINT `fk_dv_combo` FOREIGN KEY (`id_combo`) REFERENCES `combo` (`id_combo`),
  CONSTRAINT `fk_dv_lote` FOREIGN KEY (`id_lote`) REFERENCES `lote` (`id_lote`),
  CONSTRAINT `fk_dv_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`),
  CONSTRAINT `fk_dv_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lote`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lote` (
  `id_lote` int(11) NOT NULL AUTO_INCREMENT,
  `id_producto` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `numero_lote` varchar(60) DEFAULT NULL,
  `codigo_barras` varchar(30) DEFAULT NULL,
  `fecha_produccion` date DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `fecha_ingreso_almacen` date NOT NULL,
  `cantidad_cajas` int(11) NOT NULL DEFAULT 0,
  `unidades_por_caja` int(11) NOT NULL DEFAULT 1,
  `precio_por_caja` decimal(12,2) NOT NULL DEFAULT 0.00,
  `stock_cajas` int(11) NOT NULL DEFAULT 0,
  `stock_unidades` int(11) NOT NULL DEFAULT 0,
  `observaciones` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_lote`),
  UNIQUE KEY `uq_lote_codigo_barras` (`codigo_barras`),
  KEY `fk_lote_producto` (`id_producto`),
  KEY `fk_lote_sucursal` (`id_sucursal`),
  CONSTRAINT `fk_lote_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`),
  CONSTRAINT `fk_lote_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marca`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `marca` (
  `id_marca` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `pais_origen` varchar(60) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_marca`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `movimiento_almacen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movimiento_almacen` (
  `id_movimiento` int(11) NOT NULL AUTO_INCREMENT,
  `id_lote` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `tipo` enum('ENTRADA','SALIDA','AJUSTE','TRASLADO') NOT NULL,
  `motivo` varchar(100) NOT NULL,
  `cantidad_cajas` int(11) NOT NULL DEFAULT 0,
  `cantidad_unidades` int(11) NOT NULL DEFAULT 0,
  `fecha_movimiento` datetime NOT NULL DEFAULT current_timestamp(),
  `referencia_id` int(11) DEFAULT NULL,
  `referencia_tipo` varchar(30) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_mov_lote` (`id_lote`),
  KEY `fk_mov_sucursal` (`id_sucursal`),
  KEY `fk_mov_usuario` (`id_usuario`),
  CONSTRAINT `fk_mov_lote` FOREIGN KEY (`id_lote`) REFERENCES `lote` (`id_lote`),
  CONSTRAINT `fk_mov_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_mov_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `movimiento_puntos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  CONSTRAINT `fk_mp_canje` FOREIGN KEY (`id_canje`) REFERENCES `canje` (`id_canje`),
  CONSTRAINT `fk_mp_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`),
  CONSTRAINT `fk_mp_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pago_credito`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  CONSTRAINT `fk_pc_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_pc_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `fk_pc_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pago_proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permiso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permiso` (
  `id_permiso` int(11) NOT NULL AUTO_INCREMENT,
  `modulo` varchar(50) NOT NULL,
  `accion` varchar(50) NOT NULL,
  `nombre_clave` varchar(80) NOT NULL,
  `descripcion` text DEFAULT NULL,
  PRIMARY KEY (`id_permiso`),
  UNIQUE KEY `uq_permiso_clave` (`nombre_clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `producto` (
  `id_producto` int(11) NOT NULL AUTO_INCREMENT,
  `id_clasificacion` int(11) NOT NULL,
  `id_marca` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `codigo_barras` varchar(60) DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `precio_mayor` decimal(12,2) NOT NULL DEFAULT 0.00,
  `precio_menor` decimal(12,2) NOT NULL DEFAULT 0.00,
  `descuento_mayor` decimal(5,2) NOT NULL DEFAULT 0.00,
  `descuento_menor` decimal(5,2) NOT NULL DEFAULT 0.00,
  `stock_minimo` int(11) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `uq_producto_barras` (`codigo_barras`),
  KEY `fk_prod_clasificacion` (`id_clasificacion`),
  KEY `fk_prod_marca` (`id_marca`),
  KEY `fk_prod_unidad` (`id_unidad`),
  CONSTRAINT `fk_prod_clasificacion` FOREIGN KEY (`id_clasificacion`) REFERENCES `clasificacion_producto` (`id_clasificacion`),
  CONSTRAINT `fk_prod_marca` FOREIGN KEY (`id_marca`) REFERENCES `marca` (`id_marca`),
  CONSTRAINT `fk_prod_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidad_medida` (`id_unidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promocion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promocion_clasificacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `promocion_clasificacion` (
  `id_promocion` int(11) NOT NULL,
  `id_clasificacion` int(11) NOT NULL,
  PRIMARY KEY (`id_promocion`,`id_clasificacion`),
  KEY `fk_pc_clasificacion` (`id_clasificacion`),
  CONSTRAINT `fk_pc_clasificacion` FOREIGN KEY (`id_clasificacion`) REFERENCES `clasificacion_producto` (`id_clasificacion`),
  CONSTRAINT `fk_pc_promocion` FOREIGN KEY (`id_promocion`) REFERENCES `promocion` (`id_promocion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promocion_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `promocion_producto` (
  `id_promocion` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  PRIMARY KEY (`id_promocion`,`id_producto`),
  KEY `fk_pp_producto` (`id_producto`),
  CONSTRAINT `fk_pp_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`),
  CONSTRAINT `fk_pp_promocion` FOREIGN KEY (`id_promocion`) REFERENCES `promocion` (`id_promocion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `proveedor` (
  `id_proveedor` int(11) NOT NULL AUTO_INCREMENT,
  `empresa` varchar(150) NOT NULL,
  `nit` varchar(30) DEFAULT NULL,
  `contacto` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_proveedor`),
  UNIQUE KEY `uq_proveedor_nit` (`nit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recompensa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `recompensa` (
  `id_recompensa` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `tipo` enum('PRODUCTO','DESCUENTO') NOT NULL DEFAULT 'DESCUENTO',
  `descripcion` text DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `id_combo` int(11) DEFAULT NULL,
  `tipo_descuento` enum('BS','PCT') DEFAULT NULL,
  `valor_descuento` decimal(10,2) DEFAULT NULL,
  `costo_puntos` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_recompensa`),
  KEY `fk_recompensa_producto` (`id_producto`),
  KEY `fk_recompensa_combo` (`id_combo`),
  CONSTRAINT `fk_recompensa_combo` FOREIGN KEY (`id_combo`) REFERENCES `combo` (`id_combo`),
  CONSTRAINT `fk_recompensa_producto` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rol` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rol_permiso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rol_permiso` (
  `id_rol` int(11) NOT NULL,
  `id_permiso` int(11) NOT NULL,
  PRIMARY KEY (`id_rol`,`id_permiso`),
  KEY `fk_rp_permiso` (`id_permiso`),
  CONSTRAINT `fk_rp_permiso` FOREIGN KEY (`id_permiso`) REFERENCES `permiso` (`id_permiso`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_rol` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sucursal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sucursal` (
  `id_sucursal` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(200) NOT NULL,
  `ciudad` varchar(100) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `codigo_qr` varchar(5) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `traslado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `traslado` (
  `id_traslado` int(11) NOT NULL AUTO_INCREMENT,
  `id_lote_origen` int(11) NOT NULL,
  `id_sucursal_dest` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `cantidad_cajas` int(11) NOT NULL DEFAULT 0,
  `cantidad_unidades` int(11) NOT NULL DEFAULT 0,
  `fecha_traslado` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` enum('PENDIENTE','CONFIRMADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_traslado`),
  KEY `fk_tras_lote` (`id_lote_origen`),
  KEY `fk_tras_sucursal` (`id_sucursal_dest`),
  KEY `fk_tras_usuario` (`id_usuario`),
  CONSTRAINT `fk_tras_lote` FOREIGN KEY (`id_lote_origen`) REFERENCES `lote` (`id_lote`),
  CONSTRAINT `fk_tras_sucursal` FOREIGN KEY (`id_sucursal_dest`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_tras_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `unidad_medida`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `unidad_medida` (
  `id_unidad` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `abreviatura` varchar(10) NOT NULL,
  PRIMARY KEY (`id_unidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `id_rol` int(11) DEFAULT NULL,
  `id_sucursal` int(11) DEFAULT NULL,
  `ci` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `celular` varchar(20) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `contrasena` varchar(255) NOT NULL,
  `debe_cambiar_contrasena` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uq_usuario_ci` (`ci`),
  UNIQUE KEY `uq_usuario_correo` (`correo`),
  KEY `fk_usuario_rol` (`id_rol`),
  KEY `fk_usuario_sucursal` (`id_sucursal`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`),
  CONSTRAINT `fk_usuario_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `venta` (
  `id_venta` int(11) NOT NULL AUTO_INCREMENT,
  `id_sucursal` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_cliente` int(11) DEFAULT NULL,
  `id_apertura` int(11) DEFAULT NULL,
  `nro_factura` varchar(60) DEFAULT NULL,
  `fecha_venta` datetime NOT NULL DEFAULT current_timestamp(),
  `tipo_venta` enum('MENOR','MAYOR') NOT NULL DEFAULT 'MENOR',
  `subtotal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `descuento_total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `monto_pagado` decimal(14,2) NOT NULL DEFAULT 0.00,
  `cambio` decimal(14,2) NOT NULL DEFAULT 0.00,
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','CREDITO','OTRO') NOT NULL DEFAULT 'EFECTIVO',
  `qr_tipo` enum('MANUAL','BANCO','CODEPAY') DEFAULT NULL,
  `qr_referencia` varchar(100) DEFAULT NULL,
  `estado` enum('COMPLETADA','ANULADA','PENDIENTE') NOT NULL DEFAULT 'COMPLETADA',
  `fecha_anulacion` datetime DEFAULT NULL,
  `id_usuario_anulacion` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_venta`),
  KEY `fk_venta_sucursal` (`id_sucursal`),
  KEY `fk_venta_usuario` (`id_usuario`),
  KEY `fk_venta_cliente` (`id_cliente`),
  KEY `fk_venta_apertura` (`id_apertura`),
  KEY `fk_venta_usuario_anulacion` (`id_usuario_anulacion`),
  CONSTRAINT `fk_venta_apertura` FOREIGN KEY (`id_apertura`) REFERENCES `apertura_cierre_caja` (`id_apertura`),
  CONSTRAINT `fk_venta_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`),
  CONSTRAINT `fk_venta_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursal` (`id_sucursal`),
  CONSTRAINT `fk_venta_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `fk_venta_usuario_anulacion` FOREIGN KEY (`id_usuario_anulacion`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


-- ── Roles base ──────────────────────────────────────────────────────────
INSERT INTO `rol` (`id_rol`, `nombre`) VALUES
  (1, 'Administrador'),
  (2, 'Cajero'),
  (3, 'Almacenero');

-- ── Catálogo de permisos ────────────────────────────────────────────────
INSERT INTO `permiso` (`id_permiso`, `modulo`, `accion`, `nombre_clave`, `descripcion`) VALUES
  (1, 'roles', 'ver', 'roles.ver', 'Ver listado de roles del sistema'),
  (2, 'roles', 'crear', 'roles.crear', 'Crear nuevos roles'),
  (3, 'roles', 'editar', 'roles.editar', 'Editar nombre de un rol'),
  (4, 'roles', 'eliminar', 'roles.eliminar', 'Eliminar roles del sistema'),
  (5, 'roles', 'gestionar_permisos', 'roles.gestionar_permisos', 'Asignar y quitar permisos a un rol'),
  (6, 'usuarios', 'ver', 'usuarios.ver', 'Ver listado de usuarios del sistema'),
  (8, 'usuarios', 'crear', 'usuarios.crear', 'Crear nuevos usuarios'),
  (9, 'usuarios', 'editar', 'usuarios.editar', 'Editar datos de un usuario'),
  (10, 'usuarios', 'eliminar', 'usuarios.eliminar', 'Eliminar usuarios del sistema'),
  (11, 'usuarios', 'activar', 'usuarios.activar', 'Activar o desactivar un usuario'),
  (12, 'usuarios', 'cambiar_rol', 'usuarios.cambiar_rol', 'Cambiar el rol asignado a un usuario'),
  (13, 'usuarios', 'cambiar_sucursal', 'usuarios.cambiar_sucursal', 'Reasignar usuario a otra sucursal'),
  (14, 'usuarios', 'resetear_clave', 'usuarios.resetear_clave', 'Restablecer contraseña de un usuario'),
  (15, 'sucursales', 'ver', 'sucursales.ver', 'Ver listado de sucursales'),
  (16, 'sucursales', 'ver_detalle', 'sucursales.ver_detalle', 'Ver ficha completa de una sucursal'),
  (17, 'sucursales', 'crear', 'sucursales.crear', 'Registrar nuevas sucursales'),
  (18, 'sucursales', 'editar', 'sucursales.editar', 'Editar datos de una sucursal'),
  (19, 'sucursales', 'eliminar', 'sucursales.eliminar', 'Eliminar sucursales del sistema'),
  (20, 'sucursales', 'activar', 'sucursales.activar', 'Activar o desactivar una sucursal'),
  (21, 'clasificaciones', 'ver', 'clasificaciones.ver', 'Ver listado de clasificaciones'),
  (22, 'clasificaciones', 'crear', 'clasificaciones.crear', 'Crear clasificaciones de producto'),
  (23, 'clasificaciones', 'editar', 'clasificaciones.editar', 'Editar una clasificación'),
  (24, 'clasificaciones', 'eliminar', 'clasificaciones.eliminar', 'Eliminar una clasificación'),
  (25, 'marcas', 'ver', 'marcas.ver', 'Ver listado de marcas'),
  (26, 'marcas', 'crear', 'marcas.crear', 'Registrar nuevas marcas'),
  (27, 'marcas', 'editar', 'marcas.editar', 'Editar datos de una marca'),
  (28, 'marcas', 'eliminar', 'marcas.eliminar', 'Eliminar marcas del sistema'),
  (29, 'unidades', 'ver', 'unidades.ver', 'Ver listado de unidades de medida'),
  (30, 'unidades', 'crear', 'unidades.crear', 'Crear unidades de medida'),
  (31, 'unidades', 'editar', 'unidades.editar', 'Editar una unidad de medida'),
  (32, 'unidades', 'eliminar', 'unidades.eliminar', 'Eliminar unidades de medida'),
  (33, 'productos', 'ver', 'productos.ver', 'Ver catálogo de productos'),
  (34, 'productos', 'ver_detalle', 'productos.ver_detalle', 'Ver ficha completa de un producto'),
  (35, 'productos', 'crear', 'productos.crear', 'Agregar productos al catálogo'),
  (36, 'productos', 'editar', 'productos.editar', 'Editar datos generales del producto'),
  (37, 'productos', 'eliminar', 'productos.eliminar', 'Eliminar productos del catálogo'),
  (38, 'productos', 'activar', 'productos.activar', 'Activar o desactivar un producto'),
  (39, 'productos', 'ver_costo', 'productos.ver_costo', 'Ver precio de costo (precio_por_caja del lote)'),
  (40, 'productos', 'ver_precios', 'productos.ver_precios', 'Ver precios de venta mayor y menor'),
  (41, 'productos', 'editar_precios', 'productos.editar_precios', 'Modificar precios de venta mayor y menor'),
  (42, 'productos', 'editar_descuentos', 'productos.editar_descuentos', 'Modificar porcentajes de descuento'),
  (43, 'productos', 'ver_stock', 'productos.ver_stock', 'Ver stock disponible de productos'),
  (44, 'productos', 'gestionar_imagen', 'productos.gestionar_imagen', 'Subir o eliminar imagen del producto'),
  (45, 'almacen', 'ver', 'almacen.ver', 'Ver inventario general del almacén'),
  (46, 'almacen', 'ver_lotes', 'almacen.ver_lotes', 'Ver listado detallado de lotes'),
  (47, 'almacen', 'ver_lote_detalle', 'almacen.ver_lote_detalle', 'Ver ficha completa de un lote'),
  (48, 'almacen', 'ver_costo_lote', 'almacen.ver_costo_lote', 'Ver precio de costo de cada lote'),
  (49, 'almacen', 'ingresar', 'almacen.ingresar', 'Registrar entradas de productos al almacén'),
  (50, 'almacen', 'ajustar', 'almacen.ajustar', 'Registrar ajustes de inventario'),
  (51, 'almacen', 'trasladar', 'almacen.trasladar', 'Trasladar stock entre sucursales'),
  (52, 'almacen', 'ver_movimientos', 'almacen.ver_movimientos', 'Ver historial de movimientos (kardex)'),
  (53, 'almacen', 'ver_vencimientos', 'almacen.ver_vencimientos', 'Ver productos próximos a vencer'),
  (54, 'almacen', 'dar_baja_lote', 'almacen.dar_baja_lote', 'Dar de baja un lote (vencido o dañado)'),
  (55, 'proveedores', 'ver', 'proveedores.ver', 'Ver listado de proveedores'),
  (57, 'proveedores', 'crear', 'proveedores.crear', 'Registrar nuevos proveedores'),
  (58, 'proveedores', 'editar', 'proveedores.editar', 'Editar datos de un proveedor'),
  (59, 'proveedores', 'eliminar', 'proveedores.eliminar', 'Eliminar proveedores del sistema'),
  (60, 'proveedores', 'activar', 'proveedores.activar', 'Activar o desactivar un proveedor'),
  (61, 'compras', 'ver', 'compras.ver', 'Ver historial de compras'),
  (63, 'compras', 'ver_costo', 'compras.ver_costo', 'Ver precios de costo en las compras'),
  (64, 'compras', 'crear', 'compras.crear', 'Registrar nuevas compras'),
  (65, 'compras', 'editar', 'compras.editar', 'Editar compras en estado PENDIENTE'),
  (66, 'compras', 'confirmar', 'compras.confirmar', 'Confirmar y cerrar una compra'),
  (67, 'compras', 'anular', 'compras.anular', 'Anular una compra registrada'),
  (68, 'compras', 'ver_todas_sucursales', 'compras.ver_todas_sucursales', 'Ver compras de todas las sucursales'),
  (69, 'clientes', 'ver', 'clientes.ver', 'Ver listado de clientes'),
  (71, 'clientes', 'crear', 'clientes.crear', 'Registrar nuevos clientes'),
  (72, 'clientes', 'editar', 'clientes.editar', 'Editar datos de un cliente'),
  (73, 'clientes', 'eliminar', 'clientes.eliminar', 'Eliminar clientes del sistema'),
  (74, 'clientes', 'activar', 'clientes.activar', 'Activar o desactivar un cliente'),
  (75, 'clientes', 'ver_historial', 'clientes.ver_historial', 'Ver historial de compras de un cliente'),
  (76, 'clientes', 'cambiar_tipo', 'clientes.cambiar_tipo', 'Cambiar tipo de cliente: minorista / mayorista'),
  (77, 'ventas', 'ver', 'ventas.ver', 'Ver historial de ventas propias'),
  (78, 'ventas', 'ver_detalle', 'ventas.ver_detalle', 'Ver detalle completo de una venta'),
  (79, 'ventas', 'ver_todas', 'ventas.ver_todas', 'Ver ventas de todos los vendedores'),
  (80, 'ventas', 'ver_todas_sucursales', 'ventas.ver_todas_sucursales', 'Ver ventas de todas las sucursales'),
  (81, 'ventas', 'crear', 'ventas.crear', 'Registrar nuevas ventas'),
  (82, 'ventas', 'anular', 'ventas.anular', 'Anular una venta realizada'),
  (83, 'ventas', 'aplicar_descuento', 'ventas.aplicar_descuento', 'Aplicar descuento adicional en una venta'),
  (84, 'ventas', 'descuento_libre', 'ventas.descuento_libre', 'Ingresar descuento libre (sin límite de porcentaje)'),
  (85, 'ventas', 'vender_sin_stock', 'ventas.vender_sin_stock', 'Registrar venta aunque el stock sea 0'),
  (86, 'ventas', 'ver_costo', 'ventas.ver_costo', 'Ver el costo y la utilidad de cada venta'),
  (87, 'ventas', 'cambiar_precio', 'ventas.cambiar_precio', 'Modificar el precio en el momento de la venta'),
  (88, 'ventas', 'reimprimir', 'ventas.reimprimir', 'Reimprimir comprobante de una venta'),
  (89, 'traslados', 'ver', 'traslados.ver', 'Ver listado de traslados entre sucursales'),
  (90, 'traslados', 'crear', 'traslados.crear', 'Crear un traslado de stock'),
  (91, 'traslados', 'confirmar', 'traslados.confirmar', 'Confirmar un traslado pendiente'),
  (92, 'traslados', 'cancelar', 'traslados.cancelar', 'Cancelar un traslado pendiente'),
  (93, 'caja', 'ver', 'caja.ver', 'Ver listado de cajas registradas'),
  (94, 'caja', 'crear', 'caja.crear', 'Registrar nuevas cajas'),
  (95, 'caja', 'editar', 'caja.editar', 'Editar datos de una caja'),
  (96, 'caja', 'activar', 'caja.activar', 'Activar o desactivar una caja'),
  (97, 'caja', 'abrir', 'caja.abrir', 'Abrir turno de caja con monto inicial'),
  (98, 'caja', 'cerrar', 'caja.cerrar', 'Cerrar turno de caja y registrar monto final'),
  (99, 'caja', 'ver_movimientos', 'caja.ver_movimientos', 'Ver movimientos de efectivo de una caja'),
  (100, 'caja', 'ver_todas', 'caja.ver_todas', 'Ver cajas de todas las sucursales'),
  (101, 'caja', 'ver_historial', 'caja.ver_historial', 'Ver historial de aperturas y cierres de caja'),
  (102, 'reportes', 'ventas_diarias', 'reportes.ventas_diarias', 'Ver reporte de ventas del día'),
  (103, 'reportes', 'ventas_rango', 'reportes.ventas_rango', 'Ver reporte de ventas por rango de fechas'),
  (104, 'reportes', 'ventas_vendedor', 'reportes.ventas_vendedor', 'Ver reporte de ventas por vendedor'),
  (105, 'reportes', 'ventas_producto', 'reportes.ventas_producto', 'Ver reporte de ventas por producto'),
  (106, 'reportes', 'ventas_cliente', 'reportes.ventas_cliente', 'Ver reporte de ventas por cliente'),
  (107, 'reportes', 'compras', 'reportes.compras', 'Ver reporte de compras realizadas'),
  (108, 'reportes', 'compras_proveedor', 'reportes.compras_proveedor', 'Ver reporte de compras por proveedor'),
  (109, 'reportes', 'inventario', 'reportes.inventario', 'Ver reporte de inventario actual'),
  (110, 'reportes', 'inventario_valorizado', 'reportes.inventario_valorizado', 'Ver inventario con valor de costo total'),
  (111, 'reportes', 'ganancias', 'reportes.ganancias', 'Ver reporte de ganancias y utilidad bruta'),
  (112, 'reportes', 'ganancias_producto', 'reportes.ganancias_producto', 'Ver utilidad desglosada por producto'),
  (113, 'reportes', 'top_productos', 'reportes.top_productos', 'Ver ranking de productos más vendidos'),
  (114, 'reportes', 'vencimientos', 'reportes.vencimientos', 'Ver reporte de productos próximos a vencer'),
  (115, 'reportes', 'stock_bajo', 'reportes.stock_bajo', 'Ver productos por debajo del stock mínimo'),
  (116, 'reportes', 'kardex', 'reportes.kardex', 'Ver kardex (historial de movimientos por lote)'),
  (117, 'reportes', 'traslados', 'reportes.traslados', 'Ver reporte de traslados entre sucursales'),
  (118, 'reportes', 'comparativo_sucursales', 'reportes.comparativo_sucursales', 'Comparar ventas y ganancias entre sucursales'),
  (119, 'reportes', 'caja', 'reportes.caja', 'Ver reporte de arqueos y movimientos de caja'),
  (120, 'configuracion', 'ver', 'configuracion.ver', 'Ver configuración general del sistema'),
  (121, 'configuracion', 'editar', 'configuracion.editar', 'Editar configuración general del sistema'),
  (122, 'cobros', 'ver', 'cobros.ver', 'Ver cuentas por cobrar (ventas a crédito con saldo pendiente)'),
  (123, 'cobros', 'registrar_pago', 'cobros.registrar_pago', 'Registrar un abono a una venta a crédito'),
  (124, 'combos', 'ver', 'combos.ver', 'Ver listado de combos'),
  (125, 'combos', 'crear', 'combos.crear', 'Crear nuevos combos'),
  (126, 'combos', 'editar', 'combos.editar', 'Editar un combo'),
  (127, 'combos', 'eliminar', 'combos.eliminar', 'Eliminar un combo'),
  (128, 'combos', 'activar', 'combos.activar', 'Activar o desactivar un combo'),
  (129, 'promociones', 'ver', 'promociones.ver', 'Ver listado de promociones'),
  (130, 'promociones', 'crear', 'promociones.crear', 'Crear nuevas promociones'),
  (131, 'promociones', 'editar', 'promociones.editar', 'Editar una promoción'),
  (132, 'promociones', 'eliminar', 'promociones.eliminar', 'Eliminar una promoción'),
  (133, 'promociones', 'activar', 'promociones.activar', 'Activar o desactivar una promoción'),
  (134, 'fidelizacion', 'ver', 'fidelizacion.ver', 'Ver puntos de clientes y catálogo de recompensas'),
  (135, 'fidelizacion', 'canjear', 'fidelizacion.canjear', 'Canjear puntos de un cliente por una recompensa'),
  (136, 'fidelizacion', 'gestionar_recompensas', 'fidelizacion.gestionar_recompensas', 'Crear, editar o eliminar recompensas'),
  (137, 'fidelizacion', 'configurar', 'fidelizacion.configurar', 'Configurar la tasa de puntos por Bs gastado'),
  (138, 'caja', 'registrar_gasto', 'caja.registrar_gasto', 'Registrar un gasto en el turno de caja actual'),
  (139, 'caja', 'ver_gastos', 'caja.ver_gastos', 'Ver los gastos registrados en un turno de caja'),
  (140, 'caja', 'ver_libro', 'caja.ver_libro', 'Ver el libro de caja (ingresos y egresos consolidados)'),
  (141, 'cuentas_pagar', 'ver', 'cuentas_pagar.ver', 'Ver cuentas por pagar (compras a crédito con saldo pendiente)'),
  (142, 'cuentas_pagar', 'registrar_pago', 'cuentas_pagar.registrar_pago', 'Registrar un abono a una compra a crédito'),
  (143, 'caja', 'cerrar_todas', 'caja.cerrar_todas', 'Cerrar el turno de caja de cualquier usuario, no solo el propio');

-- ── Asignación de permisos por rol ──────────────────────────────────────
-- Administrador (id 1): todos los permisos
-- Cajero (id 2) y Almacenero (id 3): el set ya afinado en el sistema en uso
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (1, 4),
  (1, 5),
  (1, 6),
  (1, 8),
  (1, 9),
  (1, 10),
  (1, 11),
  (1, 12),
  (1, 13),
  (1, 14),
  (1, 15),
  (1, 16),
  (1, 17),
  (1, 18),
  (1, 19),
  (1, 20),
  (1, 21),
  (1, 22),
  (1, 23),
  (1, 24),
  (1, 25),
  (1, 26),
  (1, 27),
  (1, 28),
  (1, 29),
  (1, 30),
  (1, 31),
  (1, 32),
  (1, 33),
  (1, 34),
  (1, 35),
  (1, 36),
  (1, 37),
  (1, 38),
  (1, 39),
  (1, 40),
  (1, 41),
  (1, 42),
  (1, 43),
  (1, 44),
  (1, 45),
  (1, 46),
  (1, 47),
  (1, 48),
  (1, 49),
  (1, 50),
  (1, 51),
  (1, 52),
  (1, 53),
  (1, 54),
  (1, 55),
  (1, 57),
  (1, 58),
  (1, 59),
  (1, 60),
  (1, 61),
  (1, 63),
  (1, 64),
  (1, 65),
  (1, 66),
  (1, 67),
  (1, 68),
  (1, 69),
  (1, 71),
  (1, 72),
  (1, 73),
  (1, 74),
  (1, 75),
  (1, 76),
  (1, 77),
  (1, 78),
  (1, 79),
  (1, 80),
  (1, 81),
  (1, 82),
  (1, 83),
  (1, 84),
  (1, 85),
  (1, 86),
  (1, 87),
  (1, 88),
  (1, 89),
  (1, 90),
  (1, 91),
  (1, 92),
  (1, 93),
  (1, 94),
  (1, 95),
  (1, 96),
  (1, 97),
  (1, 98),
  (1, 99),
  (1, 100),
  (1, 101),
  (1, 102),
  (1, 103),
  (1, 104),
  (1, 105),
  (1, 106),
  (1, 107),
  (1, 108),
  (1, 109),
  (1, 110),
  (1, 111),
  (1, 112),
  (1, 113),
  (1, 114),
  (1, 115),
  (1, 116),
  (1, 117),
  (1, 118),
  (1, 119),
  (1, 120),
  (1, 121),
  (1, 122),
  (1, 123),
  (1, 124),
  (1, 125),
  (1, 126),
  (1, 127),
  (1, 128),
  (1, 129),
  (1, 130),
  (1, 131),
  (1, 132),
  (1, 133),
  (1, 134),
  (1, 135),
  (1, 136),
  (1, 137),
  (2, 15),
  (2, 33),
  (2, 34),
  (2, 40),
  (2, 43),
  (2, 45),
  (2, 69),
  (2, 71),
  (2, 72),
  (2, 75),
  (2, 76),
  (2, 77),
  (2, 78),
  (2, 79),
  (2, 81),
  (2, 82),
  (2, 83),
  (2, 88),
  (2, 93),
  (2, 97),
  (2, 98),
  (2, 99),
  (2, 100),
  (2, 101),
  (2, 102),
  (2, 103),
  (2, 104),
  (2, 106),
  (2, 122),
  (2, 123),
  (2, 124),
  (2, 129),
  (2, 134),
  (2, 135),
  (3, 33),
  (3, 34),
  (3, 39),
  (3, 43),
  (3, 45),
  (3, 46),
  (3, 47),
  (3, 48),
  (3, 49),
  (3, 50),
  (3, 51),
  (3, 52),
  (3, 53),
  (3, 54),
  (3, 55),
  (3, 61),
  (3, 63),
  (3, 64),
  (3, 66),
  (3, 89),
  (3, 90),
  (3, 91),
  (3, 92),
  (3, 109),
  (3, 110),
  (3, 114),
  (3, 115),
  (3, 116),
  (3, 117),
  (3, 119),
  (1, 138),
  (1, 139),
  (1, 140),
  (2, 138),
  (2, 139),
  (2, 140),
  (1, 141),
  (1, 142),
  (3, 141),
  (3, 142),
  (1, 143);


-- ── Datos mínimos de arranque (bootstrap) ──────────────────────────────────

-- Sucursal de ejemplo — edítala con los datos reales del cliente
INSERT INTO `sucursal` (`id_sucursal`, `nombre`, `direccion`, `ciudad`, `telefono`, `correo`, `activo`) VALUES
  (1, 'Sucursal Principal', 'Dirección pendiente de configurar', 'Ciudad', NULL, NULL, 1);

-- Caja principal de esa sucursal
INSERT INTO `caja` (`id_caja`, `id_sucursal`, `nombre`, `descripcion`, `activo`) VALUES
  (1, 1, 'Caja Principal', NULL, 1);

-- Configuración de fidelización (tasa de puntos por defecto: 1 punto cada Bs 10)
INSERT INTO `configuracion_fidelizacion` (`id_config`, `bs_por_punto`) VALUES
  (1, 10.00);

INSERT INTO `configuracion_negocio` (`id_config`, `nombre_empresa`) VALUES
  (1, 'SIS-AGRO');

-- Usuario Administrador inicial — CI y correo de ejemplo, contraseña temporal
-- "CambiarAhora123!" (hash bcrypt). Cámbiala apenas inicies sesión.
INSERT INTO `usuario` (`id_usuario`, `id_rol`, `id_sucursal`, `ci`, `nombre`, `apellido`, `celular`, `correo`, `contrasena`, `activo`) VALUES
  (1, 1, 1, '00000000', 'Administrador', 'Sistema', NULL, 'admin@tuempresa.com', '$2b$10$5gfr/g01AM0qC5zQqNikTeHJlCoKQ1Y1vdKc/HVwCH4I9bbKrByUe', 1);
