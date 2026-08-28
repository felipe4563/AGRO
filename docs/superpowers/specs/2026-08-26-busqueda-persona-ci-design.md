# Búsqueda de persona por CI (API de Personas) en Nuevo Cliente

## Contexto

Hoy, tanto en `frontend/src/pages/clientes/Clientes.jsx` (modal "Nuevo Cliente",
`ClienteModals.jsx:ModalCrearEditar`) como en el registro rápido de cliente
dentro de `frontend/src/pages/ventas/NuevaVenta.jsx` (`nuevoCliente` state,
`crearClienteRapido`), el usuario tiene que escribir a mano nombre, apellido
y CI del cliente nuevo.

Existe una API externa de terceros ("API de Personas", documentada en
`API-V2.md`, base URL `https://perapi.codewave.com.bo`) que permite buscar
una persona y traer su nombre/apellidos automáticamente. Se integra para
autocompletar esos dos formularios a partir del CI.

## Endpoint a usar

`GET /personas/{codigo}`, pasando como `codigo` el mismo valor que el
cajero/admin escribe en el campo CI del formulario.

**Nota de riesgo (decisión explícita del usuario, documentada aquí para no
perderla):** la documentación de la API distingue `codigo` (clave primaria
interna de su tabla `persona`) de `numeroDocumento` (el CI real de la
persona) — son campos distintos, con valores distintos, según el propio
ejemplo de la documentación. El usuario indicó explícitamente usar
`/personas/{codigo}` alimentado con el CI de todas formas. Si en la
práctica esto no encuentra resultados (porque el código interno de la
API no coincide con el CI), el síntoma esperado es "persona no encontrada"
para la mayoría de búsquedas — en ese caso, la corrección de una sola línea
es cambiar el endpoint a `/personas/documento/{ci}` en
`personas.service.js` (ver Alternativa más abajo). No se implementa esa
alternativa en este plan; se deja documentada por si hace falta más
adelante.

## Alcance

- Autocompletar nombre/apellido a partir del CI en **ambos** formularios de
  creación rápida/nueva de cliente (`ClienteModals.jsx` y `NuevaVenta.jsx`).
- Solo aplica al **crear** un cliente nuevo — no se toca el flujo de editar
  un cliente existente.
- Botón "Buscar" junto al campo CI — la búsqueda nunca es automática (no
  hay debounce ni búsqueda al perder foco), para no gastar llamadas a la
  API externa de más.
- No sobrescribe campos que el usuario ya haya escrito a mano en nombre o
  apellido sin confirmar — si esos campos ya tienen texto, se pide
  confirmación antes de reemplazarlos.

## Fuera de alcance (v1)

- Los otros endpoints del documento (`/personas/documento/{doc}`, búsqueda
  por nombre/`q`) no se implementan — solo `/personas/{codigo}`.
- No se guarda ningún dato adicional de la API (fecha de nacimiento, sexo,
  etc.) — solo nombre y apellido(s) para rellenar el formulario.
- No hay caché local de resultados de búsqueda — cada clic en "Buscar"
  dispara una llamada nueva.

## Backend

### Nuevo módulo: `backend/services/personas.service.js`

Mismo patrón de token cacheado que `bancoEconomico.service.js`:

- **`obtenerToken()`**: `POST /auth/login` con
  `{ username: PERSONAS_API_USER, password: PERSONAS_API_PASSWORD }`. La
  respuesta trae `{ token, expiraEn }` — `expiraEn` es un datetime ISO
  (no un JWT, no hace falta decodificar nada): se cachea el token en
  memoria junto con `new Date(expiraEn).getTime()`, y se renueva si falta
  menos de 60s para expirar (mismo margen que el token del banco).
- **`buscarPorCodigo(codigo)`**: `GET /personas/{codigo}` con
  `Authorization: Bearer {token}`. Si la API responde 404, se lanza un
  error identificable (`err.noEncontrado = true`) para que el controlador
  devuelva 404 sin loguear como error real. Si responde 401 (token
  inválido/expirado a pesar del caché), se reintenta una vez forzando
  login nuevo antes de fallar definitivamente.

### Variables de entorno (`backend/.env`)

```
PERSONAS_API_BASE_URL=https://perapi.codewave.com.bo
PERSONAS_API_USER=
PERSONAS_API_PASSWORD=
```

Agregadas a `backend/.env.example` con placeholders vacíos — el usuario ya
tiene las credenciales reales y las completa directamente en su `.env`
local, nunca en el chat ni en ningún archivo versionado.

### Endpoint nuevo (`backend/routes/clientes.Routes.js`)

```
GET /api/clientes/buscar-persona/:codigo
```

Protegido por `authMiddleware` + `checkPermission('crear', 'clientes')`
(mismo permiso que ya exige el botón "Nuevo Cliente" en ambas pantallas,
así que no hace falta un permiso nuevo).

El controlador (`clientes.Controller.js:buscarPersona`) llama a
`personas.buscarPorCodigo(codigo)` y devuelve, si la encuentra:

```json
{
  "nombre": "MIRIAN",
  "apellido": "NAVARRO ECHALAR",
  "ci_nit": "1011300"
}
```

`nombre` sale de `primerNombre` (+ `segundoNombre` si no está vacío).
`apellido` sale de `primerApellido` (+ `segundoApellido` si no está vacío;
`tercerApellido`/`apellidoCasada` no se usan, quedan fuera de alcance).
`ci_nit` es el mismo `codigo` que se buscó (para que el frontend sepa qué
valor quedó confirmado). Si no se encuentra, `404 { error: 'Persona no encontrada' }`.
Si la API externa falla (red, 500, credenciales mal configuradas),
`502 { error: 'No se pudo consultar la API de personas' }` — nunca se
filtra el detalle interno del error al frontend (mismo patrón que
`mensajeSeguro`).

## Frontend

### `frontend/src/services/cliente.service.js`

Se agrega:

```js
buscarPersona: (codigo) => api.get(`/clientes/buscar-persona/${codigo}`),
```

### `ClienteModals.jsx` — `ModalCrearEditar`

Solo cuando `!isEditing` (creando cliente nuevo): botón "Buscar" junto al
input de CI. Al hacer clic:
1. Si el campo CI está vacío, no hace nada (o muestra error breve).
2. Llama a `clienteService.buscarPersona(ci)`.
3. Si encuentra: si `nombre`/`apellido` ya tienen texto escrito por el
   usuario, `window.confirm` antes de sobrescribir; si están vacíos, los
   llena directo.
4. Si 404: mensaje corto "No se encontró ninguna persona con ese CI" (no
   bloquea seguir llenando el formulario a mano).
5. Si error de red/servidor: mensaje genérico de error.
Estado de carga (`buscandoPersona`) deshabilita el botón mientras corre.

### `NuevaVenta.jsx` — modal de "Nuevo cliente" (`nuevoCliente`)

Mismo patrón: botón "Buscar" junto al input de CI dentro del modal que ya
existe (línea ~1156 en adelante), mismo comportamiento de
confirmar-antes-de-sobrescribir y manejo de 404/error.

## Manejo de errores

- CI vacío al presionar "Buscar" → no se llama a la API, se muestra un
  aviso corto en el propio formulario.
- 404 de la API → mensaje "No se encontró ninguna persona con ese CI", el
  formulario sigue editable normalmente.
- Cualquier otro error (red, 401 tras reintento, 500) → mensaje genérico,
  nunca se expone el detalle interno.

## Pruebas

- Backend: tests Jest+Supertest para `GET /api/clientes/buscar-persona/:codigo`
  (requiere token propio; 404 cuando la persona no existe) y tests
  unitarios para `personas.service.js` mockeando `fetch` (login exitoso,
  reutilización de token cacheado, reintento tras 401, propagación de 404
  como `noEncontrado`).
- Frontend: verificación manual en ambos formularios — buscar un CI válido
  (si se cuenta con uno de prueba), confirmar autocompletado; buscar un CI
  inexistente, confirmar el mensaje de "no encontrado" sin romper el
  formulario.
