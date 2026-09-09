# Venta a granel fraccionada y mezclas (producción)

## Contexto

Hoy todo el inventario es en unidades discretas: `producto` no tiene stock
propio (vive en `lote`), y `lote.stock_cajas`/`stock_unidades` son enteros.
`detalle_venta.cantidad` también es `int` y `tipo_cantidad` solo admite
`CAJA`/`UNIDAD`. `unidad_medida` (`id_unidad`, `nombre`, `abreviatura`) es
solo una etiqueta descriptiva, sin factor de conversión entre unidades.

Las agropecuarias necesitan dos cosas que no hay hoy:

1. **Vender a granel de forma fraccionada**: comprar un quintal (100 kg) y
   venderlo por arroba (25 kg), por kg suelto, etc.
2. **Mezclas tipo laboratorio**: combinar 2+ productos a granel en
   proporciones fijas para producir un producto nuevo (ej. un balanceado a
   medida), que después se vende normalmente.

Ya existe `combo`/`combo_producto`, pero es unidireccional (agrupa
productos existentes a precio fijo para vender juntos) — no transforma
stock ni genera un producto nuevo, así que no sirve para mezclas.

## Alcance

- Productos marcados como "a granel" manejan su stock internamente en kg
  (decimal), con precio configurable por cada unidad de venta habilitada
  (kg, arroba, quintal, libra, etc.).
- Recetas de mezcla reutilizables: combinan 2+ productos a granel en
  proporciones fijas.
- Órdenes de producción: ejecutan una receta, descuentan stock de los
  ingredientes (FIFO por vencimiento, igual que ventas) y generan un lote
  nuevo del producto resultado, también a granel.
- El producto resultado se puede crear en el momento de definir la receta
  si todavía no existe.

## Fuera de alcance (v1)

- Selección manual de lote de ingrediente al producir — siempre FIFO
  automático, mismo criterio que ya usa `ventas.Controller.js`.
- Cálculo automático del precio del resultado a partir del costo de los
  ingredientes — el precio del producto resultado se configura a mano en
  `producto_precio_unidad`, igual que cualquier producto a granel.
- Editar una receta no afecta órdenes de producción ya ejecutadas (quedan
  congeladas con lo que consumieron en su momento).
- Ingredientes que no sean productos a granel (unidades discretas) — una
  receta solo mezcla productos con `es_granel = 1`.
- Productos normales (no granel) no se ven afectados en nada: siguen
  usando `stock_cajas`/`stock_unidades`, `cantidad` entera y
  `tipo_cantidad` `CAJA`/`UNIDAD` exactamente como hoy.

## Modelo de datos

Migración nueva: `bd/010_venta_granel_mezclas.sql` (+ entrada en
`bd/MIGRACIONES.md`), aplicada también a `bd/produccion.sql` como ya
exige el flujo del proyecto.

### `unidad_medida` — agregar columna

```sql
ALTER TABLE unidad_medida
  ADD COLUMN factor_a_kg DECIMAL(10,4) DEFAULT NULL;
```

`factor_a_kg` = cuántos kg equivale 1 unidad de esta fila (kg=1,
arroba=25, quintal=100, libra=0.4536...). `NULL` para unidades que no
participan en venta a granel (ej. "unidad", "paquete", "litro"), que
siguen funcionando como hoy.

### `producto` — agregar columna

```sql
ALTER TABLE producto
  ADD COLUMN es_granel TINYINT(1) NOT NULL DEFAULT 0;
```

Si `es_granel = 1`, el producto maneja stock en kg (`lote.stock_kg`) en
vez de `stock_cajas`/`stock_unidades`, y sus precios de venta salen de
`producto_precio_unidad` en vez de `precio_mayor`/`precio_menor`
(esos dos campos se ignoran para productos a granel, no se eliminan del
esquema para no romper productos existentes).

### Nueva tabla `producto_precio_unidad`

```sql
CREATE TABLE producto_precio_unidad (
  id_producto_precio_unidad INT(11) NOT NULL AUTO_INCREMENT,
  id_producto INT(11) NOT NULL,
  id_unidad INT(11) NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_producto_precio_unidad),
  UNIQUE KEY uq_ppu_producto_unidad (id_producto, id_unidad),
  KEY fk_ppu_producto (id_producto),
  KEY fk_ppu_unidad (id_unidad),
  CONSTRAINT fk_ppu_producto FOREIGN KEY (id_producto) REFERENCES producto (id_producto) ON DELETE CASCADE,
  CONSTRAINT fk_ppu_unidad FOREIGN KEY (id_unidad) REFERENCES unidad_medida (id_unidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Solo tiene filas para productos `es_granel = 1`. Cada fila es una unidad
de venta habilitada para ese producto con su propio precio (no se deriva
de `factor_a_kg` — precios independientes, como pediste).

### `lote` — agregar columna

```sql
ALTER TABLE lote
  ADD COLUMN stock_kg DECIMAL(12,3) NOT NULL DEFAULT 0;
```

Para lotes de producto a granel, `stock_kg` es la fuente de verdad;
`cantidad_cajas`/`unidades_por_caja`/`stock_cajas`/`stock_unidades` quedan
en 0 y se ignoran (no se quitan `NOT NULL DEFAULT 0`, así que no hace
falta relajar nada). Para lotes de producto normal, `stock_kg` queda en 0
y se ignora — sin impacto en el flujo actual.

### `detalle_venta` — ajustar columnas

```sql
ALTER TABLE detalle_venta
  MODIFY COLUMN cantidad DECIMAL(12,3) NOT NULL DEFAULT 1,
  ADD COLUMN id_unidad_venta INT(11) DEFAULT NULL,
  ADD CONSTRAINT fk_dv_unidad FOREIGN KEY (id_unidad_venta) REFERENCES unidad_medida (id_unidad);
```

`cantidad` pasa de `int` a `decimal(12,3)` — cambio de tipo compatible
con todos los datos existentes (un entero es un decimal válido). Para
ventas de productos normales, `id_unidad_venta` queda `NULL` y `cantidad`
sigue siendo un entero como siempre. Para ventas a granel,
`id_unidad_venta` guarda qué unidad eligió el cajero (para mostrarla en
el ticket) y `cantidad` es la cantidad en esa unidad (ej. `2` arrobas);
el backend convierte a kg con `factor_a_kg` para descontar del lote.

### Nueva tabla `receta_mezcla`

```sql
CREATE TABLE receta_mezcla (
  id_receta INT(11) NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  id_producto_resultado INT(11) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id_receta),
  KEY fk_receta_producto_resultado (id_producto_resultado),
  CONSTRAINT fk_receta_producto_resultado FOREIGN KEY (id_producto_resultado) REFERENCES producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`id_producto_resultado` siempre apunta a un producto con `es_granel = 1`
(se crea junto con la receta si no existía — ver flujo abajo).

### Nueva tabla `receta_ingrediente`

```sql
CREATE TABLE receta_ingrediente (
  id_receta_ingrediente INT(11) NOT NULL AUTO_INCREMENT,
  id_receta INT(11) NOT NULL,
  id_producto_ingrediente INT(11) NOT NULL,
  kg_por_lote_base DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (id_receta_ingrediente),
  KEY fk_ri_receta (id_receta),
  KEY fk_ri_producto (id_producto_ingrediente),
  CONSTRAINT fk_ri_receta FOREIGN KEY (id_receta) REFERENCES receta_mezcla (id_receta) ON DELETE CASCADE,
  CONSTRAINT fk_ri_producto FOREIGN KEY (id_producto_ingrediente) REFERENCES producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`kg_por_lote_base` son las proporciones base de la receta (ej. "1 lote
base = 25 kg de A + 25 kg de B = 50 kg producidos"). El backend valida al
guardar que `id_producto_ingrediente.es_granel = 1`.

### Nueva tabla `orden_produccion`

```sql
CREATE TABLE orden_produccion (
  id_orden_produccion INT(11) NOT NULL AUTO_INCREMENT,
  id_receta INT(11) NOT NULL,
  id_lote_resultado INT(11) NOT NULL,
  id_sucursal INT(11) NOT NULL,
  id_usuario INT(11) NOT NULL,
  cantidad_kg_producida DECIMAL(12,3) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id_orden_produccion),
  KEY fk_op_receta (id_receta),
  KEY fk_op_lote_resultado (id_lote_resultado),
  KEY fk_op_sucursal (id_sucursal),
  KEY fk_op_usuario (id_usuario),
  CONSTRAINT fk_op_receta FOREIGN KEY (id_receta) REFERENCES receta_mezcla (id_receta),
  CONSTRAINT fk_op_lote_resultado FOREIGN KEY (id_lote_resultado) REFERENCES lote (id_lote),
  CONSTRAINT fk_op_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursal (id_sucursal),
  CONSTRAINT fk_op_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Nueva tabla `orden_produccion_consumo`

```sql
CREATE TABLE orden_produccion_consumo (
  id_orden_produccion_consumo INT(11) NOT NULL AUTO_INCREMENT,
  id_orden_produccion INT(11) NOT NULL,
  id_lote_origen INT(11) NOT NULL,
  kg_consumidos DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (id_orden_produccion_consumo),
  KEY fk_opc_orden (id_orden_produccion),
  KEY fk_opc_lote (id_lote_origen),
  CONSTRAINT fk_opc_orden FOREIGN KEY (id_orden_produccion) REFERENCES orden_produccion (id_orden_produccion) ON DELETE CASCADE,
  CONSTRAINT fk_opc_lote FOREIGN KEY (id_lote_origen) REFERENCES lote (id_lote)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Trazabilidad: de qué lote(s) de ingrediente salió cada kg consumido (un
ingrediente puede repartirse entre varios lotes si el más viejo no
alcanza, mismo caso que ya maneja el FIFO de ventas).

### Permisos nuevos (tabla `permiso`)

Siguiendo el patrón existente (`modulo`, `accion`, `nombre_clave`):

- `productos_granel` / `ver`, `crear`, `editar` → gestión de precios por
  unidad de un producto a granel (dentro del propio formulario de
  producto, no una pantalla aparte).
- `mezclas` / `ver`, `crear`, `editar` → gestión de recetas.
- `produccion` / `ver`, `crear` → ejecutar órdenes de producción.

## Backend

### `backend/controllers/productos.Controller.js`

- `crearProducto`/`editarProducto`: aceptar `es_granel` (boolean) y, si es
  `true`, un array `precios_unidad: [{ id_unidad, precio }]` que se
  inserta/reemplaza en `producto_precio_unidad` dentro de la misma
  transacción. Si `es_granel` es `false`, se sigue usando
  `precio_mayor`/`precio_menor` exactamente como hoy.
- Validación: si `es_granel = true`, exigir al menos una fila en
  `precios_unidad` con `id_unidad` cuya `factor_a_kg` no sea `NULL`.

### `backend/controllers/unidades.Controller.js`

- `crear`/`editar`: aceptar `factor_a_kg` opcional (decimal o `null`).

### `backend/controllers/compras.Controller.js`

- `confirmar` (línea ~157 en adelante, donde hoy hace
  `stock_unidades = cantidad_cajas * unidades_por_caja`): si
  `producto.es_granel`, en vez de eso calcula
  `stock_kg = cantidad_cajas * unidades_por_caja * factor_a_kg_de_la_unidad_comprada`
  y lo guarda en `lote.stock_kg`, dejando `stock_cajas`/`stock_unidades`
  en 0. La unidad de compra (ej. "se compró 10 quintales") sale del mismo
  `detalle_compra` que ya existe — no requiere columnas nuevas ahí, solo
  requiere que la unidad de compra tenga `factor_a_kg` definido.

### `backend/controllers/ventas.Controller.js`

- En la validación/cálculo de precio (líneas ~159-202): si
  `producto.es_granel`, el precio unitario sale de
  `producto_precio_unidad` según `id_unidad_venta` del ítem del carrito,
  no de `precio_mayor`/`precio_menor`.
- En el descuento de stock FIFO (líneas ~423-548): si `producto.es_granel`,
  convierte `cantidad × factor_a_kg` a kg requeridos y descuenta de
  `lote.stock_kg` en vez de `stock_unidades`, con el mismo criterio FIFO
  por `fecha_vencimiento` y el mismo respeto al permiso
  `vender_sin_stock` para permitir negativo.
- El escaneo de código de barras de lote (líneas ~378-421) sigue
  funcionando igual — sirve para forzar la venta desde un lote específico
  de un producto a granel también.

### Nuevos controladores

- `backend/controllers/recetas.Controller.js`: CRUD de `receta_mezcla` +
  `receta_ingrediente`. Al crear, si se manda `producto_resultado_nuevo`
  (objeto con nombre/precios de unidad en vez de `id_producto_resultado`),
  crea el producto primero (con `es_granel = 1` forzado) dentro de la
  misma transacción y usa su id.
- `backend/controllers/produccion.Controller.js`: `crear` (ejecutar una
  orden de producción):
  1. Recibe `id_receta` + `cantidad_kg_producida` deseada.
  2. Calcula el factor de escala: `cantidad_kg_producida / suma(kg_por_lote_base de la receta)`.
  3. Para cada ingrediente, calcula `kg_requeridos = kg_por_lote_base × factor`, y descuenta FIFO de sus lotes (mismo motor de FIFO que `ventas.Controller.js` — se extrae a un helper compartido `backend/utils/fifoStock.js` si conviene, o se duplica el criterio si el acoplamiento no vale la pena; se decide durante la implementación).
  4. Si algún ingrediente no tiene stock suficiente, se aborta toda la transacción sin descontar nada (mismo criterio que hoy tiene ventas para bloquear sin el permiso `vender_sin_stock`).
  5. Registra un `orden_produccion_consumo` por cada lote de ingrediente afectado.
  6. Crea un `lote` nuevo del producto resultado con `stock_kg = cantidad_kg_producida`, código de barras generado igual que hoy (`100000 + id_lote`, mismo patrón de `compras.Controller.js:195`), y `fecha_ingreso_almacen = hoy`.
  7. Inserta el `orden_produccion`.

### Rutas nuevas

- `backend/routes/recetas.Routes.js` → `/api/recetas` (CRUD, permisos `mezclas.*`).
- `backend/routes/produccion.Routes.js` → `/api/produccion` (crear/listar órdenes, permisos `produccion.*`).

## Frontend

### Formulario de producto (`ProductoModals.jsx` o equivalente)

- Checkbox "Se vende a granel". Al activarlo, oculta
  `precio_mayor`/`precio_menor` y muestra una lista editable de
  "unidades de venta" (selecciona unidad de `unidad_medida` filtrando solo
  las que tienen `factor_a_kg` definido, + precio por unidad) — se puede
  agregar/quitar filas.

### Formulario de unidad de medida (`UnidadModals.jsx` o donde viva)

- Campo opcional "Equivalencia en kg" (`factor_a_kg`). Si se deja vacío,
  la unidad no aparece como opción en productos a granel.

### `NuevaVenta.jsx`

- Para un producto con `es_granel = true`: selector de unidad de venta
  (poblado desde `producto_precio_unidad` de ese producto) + input de
  cantidad decimal (en vez de `type="number" min="1"` entero). El precio
  mostrado y el subtotal usan el precio de la unidad elegida.
- El ticket/detalle de venta muestra la unidad elegida (ej. "2 Arroba"),
  no un número suelto.

### Nueva pantalla: Recetas (`frontend/src/pages/recetas/`)

- Listado + modal de creación/edición: nombre de la receta, selector de
  producto resultado (o "crear producto nuevo" inline con sus datos
  básicos), lista de ingredientes (producto a granel + kg base).

### Nueva pantalla: Producción (`frontend/src/pages/produccion/`)

- Selector de receta + input "cuánto producir (kg)". Muestra un preview
  calculado de cuánto se va a consumir de cada ingrediente y si hay stock
  suficiente (llamada a un endpoint de "simular" o cálculo en el propio
  frontend con el stock que ya se cargó). Botón "Producir" ejecuta
  `POST /api/produccion`. Muestra el lote/código de barras generado al
  terminar, igual que hace hoy la confirmación de compra.

## Manejo de errores

- Crear producto a granel sin ninguna unidad de precio válida → 400.
- Vender un producto a granel sin `id_unidad_venta` → 400.
- Producir con stock insuficiente de cualquier ingrediente → 409, sin
  descontar nada (transacción completa revertida), mensaje indicando qué
  ingrediente falta.
- Guardar una receta con un ingrediente que no sea `es_granel` → 400.

## Pruebas

- Backend: tests Jest+Supertest para conversión de unidades en venta
  (vender 2 arrobas descuenta 50 kg del lote), para la orden de
  producción (escala correctamente las proporciones, descuenta FIFO de
  varios lotes si hace falta, aborta sin descontar si falta stock), y
  para que los productos no-granel sigan funcionando exactamente igual
  que antes (regresión).
- Frontend: verificación manual — crear un producto a granel con precios
  por arroba/quintal/kg, venderlo en `NuevaVenta.jsx` fraccionado, crear
  una receta con dos ingredientes a granel, ejecutar una orden de
  producción y confirmar que el producto resultado queda con stock
  vendible.
