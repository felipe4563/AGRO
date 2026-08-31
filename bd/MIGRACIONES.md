# Migraciones de base de datos

Cada cambio de esquema posterior a `produccion.sql` vive en `bd/` como un archivo
numerado: `NNN_descripcion.sql`. El número indica el orden en que deben aplicarse.

**Regla al crear una migración nueva:** usar el siguiente número disponible
(el más alto que exista + 1), con 3 dígitos.

**Al desplegar a producción:** aplicar en orden todas las migraciones con número
mayor al de la última que ya corriste ahí. Marca aquí cuál fue la última aplicada
para no perder la cuenta.

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

`produccion.sql` siempre refleja el esquema final con todas las migraciones ya
incorporadas — sirve para instalar el sistema desde cero, no para actualizar una
base de datos existente.
