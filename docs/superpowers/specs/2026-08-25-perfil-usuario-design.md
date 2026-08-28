# Perfil de usuario (foto + contraseña) y cambio de contraseña forzado

## Contexto

Hoy no existe ninguna forma de que un usuario autenticado edite su propia
cuenta. Solo el admin puede tocar la tabla `usuario`, desde
`frontend/src/pages/usuarios/Usuarios.jsx`, incluyendo un botón existente
"Resetear clave" (`usuarios.Controller.js:resetearContrasena`,
`PATCH /api/usuarios/:id/password`) que ya cambia la contraseña de cualquier
usuario, pero no deja rastro de que ese cambio fue impuesto — el usuario
puede seguir usando esa clave indefinidamente sin darse cuenta de que se la
resetearon.

Se agrega:

1. Una página de **Perfil** (autoservicio) donde cualquier usuario logueado
   cambia su propia foto y su propia contraseña.
2. Un flag `debe_cambiar_contrasena` que, activado por el admin (al
   resetear la clave o al crear un usuario nuevo), obliga a esa persona a
   cambiar su contraseña en el siguiente login antes de poder usar
   cualquier otro módulo.

## Fuera de alcance (v1)

- El usuario NO puede editar nombre, apellido, correo, celular, CI, rol ni
  sucursal desde su Perfil — esos campos los sigue manejando solo el admin
  desde Usuarios (confirmado con el usuario).
- No hay historial de contraseñas ni política de expiración periódica —
  solo el flag puntual de "cambiar en el próximo login".
- No se agrega verificación por correo/SMS para el cambio de contraseña —
  basta con conocer la contraseña actual (o, en el caso forzado, haber
  iniciado sesión con la que dio el admin).

## Base de datos

Dos columnas nuevas en `usuario`, ambas con default que no rompe filas
existentes:

```sql
ALTER TABLE usuario ADD COLUMN foto VARCHAR(255) DEFAULT NULL AFTER celular;
ALTER TABLE usuario ADD COLUMN debe_cambiar_contrasena TINYINT(1) NOT NULL DEFAULT 0 AFTER contrasena;
```

`foto` guarda solo el nombre de archivo (igual que `producto.imagen` /
`combo.imagen`), servido desde `/uploads/<archivo>`.

Ambos cambios se aplican en vivo y se reflejan en `bd/produccion.sql`,
instrucción permanente del proyecto.

## Backend

### Módulo nuevo: `backend/controllers/perfil.Controller.js` + `backend/routes/perfil.Routes.js`

Montado en `/api/perfil` (`app.js`). Todas las rutas requieren
`authMiddleware` y operan **exclusivamente** sobre `req.user.id_usuario` —
ninguna acepta un `:id` de otro usuario, así que no hace falta ningún
permiso especial de admin: cualquier usuario autenticado puede tocar su
propio perfil, nada más.

- **`GET /api/perfil`** — devuelve `{ id_usuario, nombre, apellido, correo,
  celular, foto, rol_nombre, debe_cambiar_contrasena }` del usuario
  logueado.
- **`PATCH /api/perfil/password`** — body `{ contrasena_actual,
  nueva_contrasena }`. Verifica `contrasena_actual` con
  `bcrypt.compare` contra el hash guardado (401 si no coincide), valida
  que `nueva_contrasena` tenga al menos 6 caracteres (mismo criterio que
  `resetearContrasena` del admin), hashea con bcrypt, actualiza
  `contrasena` **y pone `debe_cambiar_contrasena = 0`**. Responde
  `{ mensaje }`.
- **`PATCH /api/perfil/foto`** (multer, mismo patrón que
  `configuracion.Routes.js:subirLogo` — `diskStorage` en
  `backend/uploads`, límite 5MB, solo jpg/jpeg/png/webp) — guarda el
  archivo como `usuario_<id_usuario>_<timestamp>.<ext>`, borra el archivo
  anterior si `foto` ya tenía uno (mismo patrón que
  `configuracion.Controller.js:subirLogo`/`eliminarLogo`), actualiza
  `foto` en la fila del usuario. Responde `{ foto }`.

### `usuarios.Controller.js` (admin — ya existente, se extiende)

- `resetearContrasena`: el `UPDATE` pasa a incluir
  `debe_cambiar_contrasena = 1` junto con `contrasena = ?`.
- `crearUsuario`: el `INSERT` agrega la columna `debe_cambiar_contrasena`
  con valor `1` siempre — todo usuario nuevo debe cambiar su contraseña
  la primera vez que entra (confirmado con el usuario).

Ninguna otra función de `usuarios.Controller.js` cambia.

### `auth.Controller.js` — `login`

El objeto `usuario` de la respuesta de login agrega dos campos:
`foto` y `debe_cambiar_contrasena` (leídos de la misma fila que ya se
consulta para el login, sin queries adicionales). No se agregan al JWT —
el gate de "debe cambiar contraseña" es enteramente de frontend en esta
v1; el backend ya protege el cambio real de contraseña vía
`PATCH /api/perfil/password` sin depender de ese flag para autorizar nada.

## Frontend

### `AuthContext.jsx`

Se agrega `actualizarUsuario(patch)`: mergea `patch` sobre el `usuario` en
memoria y en `localStorage.usuario` (sin volver a pegarle al backend). La
usan tanto "subí una foto nueva" como "ya cambié mi contraseña obligatoria"
para reflejar el cambio al instante sin recargar la página ni cerrar
sesión.

### Página nueva: `frontend/src/pages/perfil/Perfil.jsx`

- Card de foto: mismo patrón visual/drag&drop que el logo en
  `Configuracion.jsx` (subir, previsualizar, `ventaService`-style llamada a
  `perfilService.subirFoto`). Al terminar, llama
  `actualizarUsuario({ foto: res.data.foto })`.
- Card de cambiar contraseña: 3 campos (actual, nueva, confirmar nueva).
  Valida en el cliente que nueva == confirmar y que tenga ≥6 caracteres
  antes de llamar `perfilService.cambiarPassword`. Al terminar con éxito,
  llama `actualizarUsuario({ debe_cambiar_contrasena: false })` y muestra
  un toast de éxito.
- Cuando la página se abre por el gate obligatorio (ver más abajo, vía
  `?obligatorio=1` en la URL), se oculta la card de foto y se muestra
  únicamente la card de contraseña, con un banner fijo arriba: *"Debes
  actualizar tu contraseña para continuar"*. No hay botón de "cancelar" ni
  navegación a otro módulo — la única salida además de cambiar la
  contraseña es cerrar sesión (el botón de logout del Topbar sigue
  funcionando normalmente).

### `frontend/src/services/perfil.service.js` (nuevo)

```js
obtener: () => api.get('/perfil'),
cambiarPassword: (data) => api.patch('/perfil/password', data),
subirFoto: (formData) => api.patch('/perfil/foto', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
```

### `Topbar.jsx`

El círculo de iniciales se convierte en un `<button>`/`<Link>` a
`/perfil`. Si `usuario.foto` existe, se muestra la miniatura de la foto en
ese círculo en vez de las iniciales (mismo tamaño `w-9 h-9 rounded-full`).

### `App.jsx`

Nueva ruta `/perfil`, usando `PageRoute` sin `action`/`subject` (solo
requiere sesión, igual que `/dashboard`).

### Gate obligatorio: `ProtectedRoute.jsx`

Después del chequeo actual de "no autenticado" (`if (!usuario)`), se
agrega: si `usuario.debe_cambiar_contrasena` es verdadero y la ruta actual
no es `/perfil`, redirigir a `/perfil?obligatorio=1`. Esto cubre **todas**
las rutas protegidas de la app (todas pasan por `ProtectedRoute`), así que
no hace falta tocar cada página individualmente. La página de Login no
pasa por `ProtectedRoute`, así que el usuario sí puede iniciar sesión
normalmente — el bloqueo ocurre recién al intentar entrar a cualquier
página protegida después de loguearse.

## Manejo de errores

- `PATCH /api/perfil/password` con `contrasena_actual` incorrecta → 401,
  mensaje "Contraseña actual incorrecta", el frontend lo muestra en el
  formulario sin limpiar los campos.
- `nueva_contrasena` con menos de 6 caracteres → 400 (igual que el
  reseteo admin).
- Subida de foto con archivo no permitido o >5MB → mismo comportamiento
  que ya existe hoy para logo/producto (multer rechaza, controlador
  responde 400).

## Pruebas

- Backend: tests Jest+Supertest para `perfil.Controller.js`
  (`GET /api/perfil` requiere token; `PATCH /password` rechaza contraseña
  actual incorrecta, rechaza nueva <6 caracteres, acepta cambio válido y
  limpia el flag; `PATCH /foto` acepta imagen válida).
  `usuarios.Controller.js`: test de que `resetearContrasena` deja
  `debe_cambiar_contrasena = 1` en la fila, y que `crearUsuario` también.
- Frontend: verificación manual en navegador — login con un usuario recién
  reseteado, confirmar que cualquier ruta redirige a `/perfil?obligatorio=1`
  y que tras cambiar la contraseña se puede navegar libremente.
