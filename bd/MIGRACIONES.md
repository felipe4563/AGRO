# Migraciones de base de datos

Cada cambio de esquema posterior a `produccion.sql` vive en `bd/` como un archivo
numerado: `NNN_descripcion.sql`. El número indica el orden en que deben aplicarse.

**Regla al crear una migración nueva:** usar el siguiente número disponible
(el más alto que exista + 1), con 3 dígitos.

**Desde la 016 en adelante, las migraciones se aplican solas.** El backend
(`backend/scripts/migrate.js`) las corre automáticamente al arrancar, antes
de aceptar tráfico, llevando la cuenta en la tabla `schema_migrations`. Si
una migración falla de verdad (no por "ya estaba aplicada"), el backend no
levanta — queda visible en `docker compose logs backend`. Ya no hace falta
copiarlas a mano al VPS: alcanza con que `deploy.sh` haga `git pull` y
reinicie el contenedor.

Las migraciones 001-015 se sembraron a mano en cada instancia antes de que
existiera este runner, así que la columna de abajo documenta ese historial
manual — de la 016 en adelante ya no hace falta llevarla.

| # | Archivo | Descripción | Aplicada en producción |
|---|---------|-------------|:---:|
| 001 | `001_cobros.sql` | Cuentas por Cobrar (abonos a ventas a crédito) | |
| 002 | `002_combos_promociones.sql` | Combos y Promociones | |
| 003 | `003_fidelizacion.sql` | Fidelización (puntos y recompensas) | |
| 004 | `004_fidelizacion_v2.sql` | Recompensas tipadas + canje integrado a la venta | |
| 005 | `005_cuentas_pagar.sql` | Cuentas por Pagar (abonos a compras a crédito con proveedores) | |
| 006 | `006_anulacion_caja.sql` | Rastro de anulaciones de venta en el Libro de Caja | |
| 007 | `007_retirar_permisos_no_usados.sql` | Retira permisos ver_detalle sin uso (usuarios/proveedores/compras/clientes) | |
| 008 | `008_codigo_barras_por_lote.sql` | Código de barras propio por lote (trazabilidad exacta al vender) | |
| 009 | `009_cerrar_todas_caja.sql` | Permiso `caja.cerrar_todas`: solo Admin puede cerrar el turno de otro cajero | |
| 010 | `010_codepay.sql` | QR CodePay: tercer tipo de QR de venta + tabla de estado de transacciones | |
| 011 | `011_estado_compra_anulada.sql` | Corrige `compra.estado`: agrega `'ANULADA'` al enum (faltaba, causaba estado vacío al anular) y arregla el DEFAULT | |
| 012 | `012_rentabilidad.sql` | Permiso `reportes.rentabilidad`: reporte de costo de lote vs precio de venta + calculadora de margen | |
| 013 | `013_flujo_caja.sql` | Permiso `reportes.caja_flujo`: flujo de caja diario detallado (ingresos vs egresos, efectivo/digital, acumulado) | |
| 014 | `014_categoria_gasto_caja.sql` | `gasto_caja` gana `tipo` (ingreso/egreso) y `categoria` (variable/fijo/retiro/otro) + permiso `caja.clasificar_gastos` | |
| 015 | `015_eliminar_lote.sql` | Permiso `almacen.eliminar`: borrar definitivamente un lote duplicado/erróneo sin ventas, compras ni traslados asociados | |

`produccion.sql` siempre refleja el esquema final con todas las migraciones ya
incorporadas — sirve para instalar el sistema desde cero, no para actualizar una
base de datos existente.

**`produccion.sql` ya NO se edita a mano.** Se regenera con
`./deploy/generar-produccion.sh` (requiere Docker): aplica sobre
`bd/000_base.sql` (que ya incluye hasta la migración 011) todas las
migraciones nuevas con número mayor, y vuelca el resultado con
`mysqldump`. Después de crear una migración nueva, correr ese script en
vez de tocar `produccion.sql` directamente.
