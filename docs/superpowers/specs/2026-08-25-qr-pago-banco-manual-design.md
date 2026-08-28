# Pago con QR en NuevaVenta — Banco Económico + Verificación Manual

## Contexto

`NuevaVenta.jsx` ya tiene "QR" como una opción más del selector de método de
pago (`frontend/src/pages/ventas/NuevaVenta.jsx:978`), pero es solo una
etiqueta — no dispara ningún flujo especial. `ventas.Controller.js:crear()`
inserta la venta directamente con el `metodo_pago` que llegue en el body, sin
distinguir sub-tipos de QR.

Se agregan dos formas concretas de cobrar con QR:

1. **QR Banco** — se genera un QR real contra la API del Banco Económico
   (documento "API Market — Especificaciones Técnicas v1.4.0"), el cliente lo
   paga desde su banca móvil, y el sistema confirma el pago antes de cerrar
   la venta.
2. **QR Manual** — el cajero ve el comprobante en el celular del cliente
   (de cualquier banco/billetera) y confirma visualmente, sin subir nada.

## Fuera de alcance (v1)

- Webhook `notifyPaymentQR` (requiere URL pública expuesta; se usa polling).
- Pagar QR de terceros (`dataQR` / `payQR`) — es un flujo de egreso, no de
  cobro, no aplica a una venta.
- Conciliación batch con `paidQR` — no se necesita si cada venta valida su
  propio `qrId` en el momento.
- Abonos a crédito (`CuentasPorCobrar.jsx`) — mismo `metodo_pago='QR'` que
  hoy, sin cambios; el alcance de esta feature es solo la venta original.

## Base de datos

`venta`: dos columnas nuevas, ambas nulas (NULL para EFECTIVO/TRANSFERENCIA/
CREDITO/OTRO y para ventas ya existentes):

```sql
ALTER TABLE venta ADD COLUMN qr_tipo ENUM('MANUAL','BANCO') DEFAULT NULL AFTER metodo_pago;
ALTER TABLE venta ADD COLUMN qr_referencia VARCHAR(100) DEFAULT NULL AFTER qr_tipo;
```

`metodo_pago` sigue guardándose como `'QR'` para ambos casos (no se toca el
ENUM existente) — así reportes, Libro de Caja y el resumen de cierre de caja
siguen agrupando "QR" sin cambios. `qr_tipo` es solo para distinguir/auditar,
`qr_referencia` guarda el `qrId` que devuelve el banco (solo para BANCO).

`sucursal`: columna opcional para reconciliación por sucursal (branchCode
del banco, máx. 5 caracteres):

```sql
ALTER TABLE sucursal ADD COLUMN codigo_qr VARCHAR(5) DEFAULT NULL AFTER correo;
```

Si una sucursal no tiene `codigo_qr` configurado, el campo `branchCode` se
omite del request a `generateQR` (es opcional según el documento del banco).

Ambos cambios se aplican en vivo y se reflejan en `bd/produccion.sql`, según
la instrucción permanente del proyecto.

## Backend

### Nuevo módulo: `backend/services/bancoEconomico.service.js`

Encapsula toda la comunicación con la API del banco. Nadie más llama a la
API del banco directamente — todo pasa por este módulo.

- **Token cacheado**: `obtenerToken()` llama a
  `POST /api/authentication/authenticate` con `userName`/`password` (el
  password ya viene cifrado, ver abajo) solo si no hay token en memoria o
  está por expirar (se decodifica el JWT del banco para leer `exp`, se
  renueva con margen de 60s). Igual patrón de caché en memoria que
  `cachePermisos` en `authMiddleware.js`.
- **`encriptar(texto)`**: `GET /api/authentication/encrypt?text=...&aesKey=...`.
  Se usa para cifrar el `accountCredit` (cuenta del negocio) y, en el login
  a `/authenticate`, para cifrar el `password` de la cuenta de servicio
  (el documento indica que el password que se envía ya va cifrado).
- **`generarQR({ transactionId, monto, moneda, descripcion, dueDate, branchCode })`**:
  `POST /api/qrsimple/generateQR`. `singleUse: true`, `modifyAmount: false`
  (importe exacto de la venta, sin negociar), `dueDate` = mismo día.
  Devuelve `{ qrId, qrImage }`.
- **`estadoQR(qrId)`**: `GET /api/qrsimple/v2/statusQR/:qrId`. Devuelve
  `{ pagado: boolean, payment }`.
- **`anularQR(qrId)`**: `DELETE /api/qrsimple/cancelQR`. Best-effort — si
  falla (p. ej. ya estaba pagado), no se propaga como error al usuario.

Todas las llamadas usan `fetch` nativo de Node (ya usado en otras partes del
backend) con timeout razonable (ej. 10s) y logs con `console.error` en caso
de fallo, siguiendo el patrón de `mensajeSeguro()` para no filtrar detalles
internos al frontend.

### Variables de entorno (`backend/.env`)

```
BANCO_ECONOMICO_BASE_URL=https://apimktdesa.baneco.com.bo/ApiGateway
BANCO_ECONOMICO_USER=
BANCO_ECONOMICO_PASSWORD=
BANCO_ECONOMICO_AES_KEY=
BANCO_ECONOMICO_ACCOUNT_CREDIT=
```

`BANCO_ECONOMICO_ACCOUNT_CREDIT` es el número de cuenta en texto plano; se
cifra en cada llamada a `generateQR` vía `encriptar()` (no se guarda
pre-cifrado, evita dudas sobre si el cifrado del banco es determinístico).
Estas variables se agregan a `backend/.env.example` con placeholders, **sin
valores reales** — el usuario las completa directamente en su `.env`.

### Endpoints nuevos (`backend/routes/ventas.Routes.js`)

```js
router.post('/qr-banco/generar', checkPermission('crear', 'ventas'), ctrl.generarQrBanco);
router.get('/qr-banco/estado/:qrId', checkPermission('crear', 'ventas'), ctrl.estadoQrBanco);
router.delete('/qr-banco/:qrId', checkPermission('crear', 'ventas'), ctrl.anularQrBanco);
```

- `generarQrBanco`: recibe `{ monto }` (o el total ya calculado en el
  frontend), arma un `transactionId` propio (ej. `venta-${Date.now()}`),
  llama a `bancoEconomico.generarQR(...)` con la sucursal del usuario
  autenticado, devuelve `{ qrId, qrImage }`.
- `estadoQrBanco`: proxy directo a `bancoEconomico.estadoQR(qrId)`.
- `anularQrBanco`: proxy directo a `bancoEconomico.anularQR(qrId)`.

`ctrl.crear()` (la función existente) se modifica mínimamente: acepta
`qr_tipo` y `qr_referencia` opcionales en el body y los agrega al INSERT
existente (dos columnas más en la lista, mismo patrón). Ninguna otra lógica
de `crear()` cambia — sigue siendo el único lugar que inserta en `venta`,
tanto para QR Banco (llamado después de confirmado el pago) como para QR
Manual (llamado de inmediato, igual que EFECTIVO hoy).

## Frontend (`NuevaVenta.jsx`)

El selector de método de pago pasa de tener una opción plana "QR" a mostrar,
al elegir QR, dos botones: **QR Banco** y **QR Manual**.

### QR Manual

Se marca `qrManualConfirmado` (checkbox/botón: *"Confirmo que verifiqué el
pago en el celular del cliente"*). El botón "Finalizar venta" queda
deshabilitado hasta marcarlo — mismo lugar donde hoy se deshabilita si no
hay carrito. Al finalizar, el payload de `crear venta` incluye
`qr_tipo: 'MANUAL'` (sin `qr_referencia`). No hay cambios de UI adicionales
más allá de esa casilla.

### QR Banco

1. Botón "Generar QR" (deshabilitado si el carrito está vacío) llama a
   `POST /api/ventas/qr-banco/generar` con el total actual del carrito.
2. Se abre un modal con la imagen del QR (`data:image/png;base64,...` desde
   `qrImage`) y un estado "Esperando pago...".
3. El modal hace polling a `GET /api/ventas/qr-banco/estado/:qrId` cada 4s
   (usando el mismo patrón de token de solicitud/`useRef` que ya se aplicó
   en las vistas de Reportes para evitar carreras, aquí simplificado con un
   `setInterval` limpiado en el cleanup del efecto).
4. Cuando `estadoQRCode === 1` (pagado): se detiene el polling, se llama al
   flujo existente de crear venta con `qr_tipo: 'BANCO'`,
   `qr_referencia: qrId`, y se navega al ticket como ya ocurre hoy tras una
   venta exitosa.
5. Si el cajero cierra el modal antes del pago: se llama
   `DELETE /api/ventas/qr-banco/:qrId` en segundo plano (sin bloquear el
   cierre del modal) y se limpia el estado.
6. Sin timeout automático — el cajero cierra manualmente si el cliente no
   paga; el QR generado con `dueDate` del mismo día queda igualmente inválido
   para pagos futuros.

## Manejo de errores

- Si `generarQR` falla (credenciales, banco caído, etc.): mensaje claro en
  el modal ("No se pudo generar el QR, intenta de nuevo o usa QR Manual") y
  no se abre el modal de espera.
- Si el polling falla una vez (error de red): se reintenta en el siguiente
  ciclo, no se aborta el flujo por un solo fallo transitorio. Tras 3 fallos
  consecutivos, se muestra aviso pero se sigue reintentando (el cajero
  decide cuándo cancelar).

## Pruebas

- Backend: request/response de `bancoEconomico.service.js` mockeando
  `fetch` (éxito, token expirado forzando refresh, error de red).
- Manual contra el ambiente de certificación del banco con las credenciales
  ya disponibles: generar QR real, pagarlo (o simularlo si el ambiente de
  certificación lo permite) y confirmar que la venta se crea con
  `qr_tipo='BANCO'` y `qr_referencia` correcto.
- QR Manual: flujo puramente de UI, se prueba en el navegador.
