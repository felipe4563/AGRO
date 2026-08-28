# Búsqueda de persona por CI (API de Personas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón "Buscar" junto al campo CI en los dos formularios de "Nuevo Cliente" (`ClienteModals.jsx` y el modal rápido de `NuevaVenta.jsx`) que consulta la API externa de Personas y autocompleta nombre/apellido.

**Architecture:** Un módulo backend nuevo (`personas.service.js`) encapsula la autenticación (token opaco cacheado, renovado por `expiraEn`) y la consulta a `GET /personas/{codigo}`. Un endpoint nuevo (`GET /api/clientes/buscar-persona/:codigo`) expone ese módulo al frontend, reutilizando el permiso `crear`/`clientes` que ya exige el botón "Nuevo Cliente". El frontend agrega un botón "Buscar" en ambos formularios que llama a ese endpoint y rellena nombre/apellido si encuentra resultados.

**Tech Stack:** Node/Express, `fetch` nativo de Node (sin dependencias nuevas), Jest + Supertest (backend), React 19 + Vite.

**Spec:** `docs/superpowers/specs/2026-08-26-busqueda-persona-ci-design.md`

## Global Constraints

- Se usa `GET /personas/{codigo}` pasando el valor del campo CI — decisión explícita del usuario, aunque la documentación de la API distingue `codigo` (PK interna) de `numeroDocumento` (CI real). Ver la "Nota de riesgo" en el spec: si esto no encuentra resultados en la práctica, el fix es cambiar el endpoint en `personas.service.js`, no está en alcance de este plan.
- Solo aplica al crear un cliente nuevo, nunca al editar uno existente.
- La búsqueda solo se dispara con el botón "Buscar" — nunca automática (ni debounce, ni al perder foco).
- No se sobrescriben campos de nombre/apellido ya escritos por el usuario sin confirmar antes.
- Nunca hardcodear credenciales de la API de Personas en código — van en `backend/.env` (gitignoreado), con placeholders en `backend/.env.example`.

---

## Task 1: Servicio backend `personas.service.js`

**Files:**
- Create: `backend/services/personas.service.js`
- Test: `backend/tests/personas.service.test.js`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: `process.env.PERSONAS_API_BASE_URL`, `PERSONAS_API_USER`, `PERSONAS_API_PASSWORD`.
- Produces (usado por Task 2): `buscarPorCodigo(codigo: string): Promise<{ codigo, primerNombre, segundoNombre, primerApellido, segundoApellido, ... }>` — si la persona no existe, rechaza con un `Error` cuyo `.noEncontrado === true`.

- [ ] **Step 1: Escribir el test que falla (mockeando `fetch`)**

Crear `backend/tests/personas.service.test.js`:

```js
process.env.PERSONAS_API_BASE_URL = 'https://personas.test';
process.env.PERSONAS_API_USER = 'user_test';
process.env.PERSONAS_API_PASSWORD = 'pass_test';

function expiraFutura() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

describe('personas.service', () => {
  let personas;

  beforeEach(() => {
    jest.resetModules();
    personas = require('../services/personas.service');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('buscarPorCodigo hace login y luego consulta la persona', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN123', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ codigo: '1011300', primerNombre: 'MIRIAN', primerApellido: 'NAVARRO' }) });

    const resultado = await personas.buscarPorCodigo('1011300');

    expect(resultado.primerNombre).toBe('MIRIAN');
    const [urlLogin] = global.fetch.mock.calls[0];
    expect(urlLogin).toContain('/auth/login');
    const [, opcionesConsulta] = global.fetch.mock.calls[1];
    expect(opcionesConsulta.headers.Authorization).toBe('Bearer TOKEN123');
  });

  test('el token se reutiliza si no está por expirar (no vuelve a loguear)', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN123', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ codigo: '1' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ codigo: '2' }) });

    await personas.buscarPorCodigo('1');
    await personas.buscarPorCodigo('2');

    // 1 login + 2 consultas = 3 llamadas, no 4
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('propaga 404 como error con noEncontrado = true', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN123', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(personas.buscarPorCodigo('inexistente')).rejects.toMatchObject({ noEncontrado: true });
  });

  test('reintenta login una vez si el token cacheado devuelve 401', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN_VIEJO', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN_NUEVO', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ codigo: '1' }) });

    const resultado = await personas.buscarPorCodigo('1');

    expect(resultado.codigo).toBe('1');
    const ultimaLlamada = global.fetch.mock.calls[3];
    expect(ultimaLlamada[1].headers.Authorization).toBe('Bearer TOKEN_NUEVO');
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/personas.service.test.js --runInBand --forceExit
```

Expected: FAIL — `Cannot find module '../services/personas.service'`.

- [ ] **Step 3: Implementar `backend/services/personas.service.js`**

```js
let tokenCache = null; // { token, exp } — exp en milisegundos (Date.now())

function baseUrl() {
  return process.env.PERSONAS_API_BASE_URL || 'https://perapi.codewave.com.bo';
}

async function login() {
  const res = await fetch(`${baseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.PERSONAS_API_USER,
      password: process.env.PERSONAS_API_PASSWORD,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Error al autenticar con la API de Personas (HTTP ${res.status})`);
  const data = await res.json();
  tokenCache = { token: data.token, exp: new Date(data.expiraEn).getTime() };
  return tokenCache.token;
}

async function obtenerToken() {
  const ahora = Date.now();
  if (tokenCache && tokenCache.exp > ahora + 60000) {
    return tokenCache.token;
  }
  return login();
}

async function consultarPersona(codigo, token) {
  return fetch(`${baseUrl()}/personas/${encodeURIComponent(codigo)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
}

async function buscarPorCodigo(codigo) {
  const token = await obtenerToken();
  let res = await consultarPersona(codigo, token);

  if (res.status === 401) {
    const tokenNuevo = await login();
    res = await consultarPersona(codigo, tokenNuevo);
  }

  if (res.status === 404) {
    const err = new Error('Persona no encontrada');
    err.noEncontrado = true;
    throw err;
  }
  if (!res.ok) throw new Error(`Error al consultar la API de Personas (HTTP ${res.status})`);

  return res.json();
}

module.exports = { buscarPorCodigo };
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/personas.service.test.js --runInBand --forceExit
```

Expected: PASS — 4 tests verdes.

- [ ] **Step 5: Agregar las variables a `backend/.env.example`**

Agregar al final del archivo:

```
# API de Personas (búsqueda por CI en Nuevo Cliente)
PERSONAS_API_BASE_URL=https://perapi.codewave.com.bo
PERSONAS_API_USER=
PERSONAS_API_PASSWORD=
```

El usuario ya tiene las credenciales reales y las completa directamente en
su `backend/.env` local — no se piden ni se escriben en el chat ni en
ningún archivo versionado.

- [ ] **Step 6: No hay commit — el proyecto no tiene repositorio git inicializado.**

---

## Task 2: Endpoint backend `GET /api/clientes/buscar-persona/:codigo`

**Files:**
- Modify: `backend/controllers/clientes.Controller.js`
- Modify: `backend/routes/clientes.Routes.js`
- Test: `backend/tests/clientes.buscarPersona.test.js`

**Interfaces:**
- Consumes: `personas.buscarPorCodigo` (Task 1).
- Produces (usado por Task 3, frontend): `GET /api/clientes/buscar-persona/:codigo` → `200 { nombre, apellido, ci_nit }` | `404 { error }` | `502 { error }`.

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/tests/clientes.buscarPersona.test.js`:

```js
const { app, request, authHeader } = require('./helpers');

let headers;
beforeAll(async () => { headers = await authHeader(); });

describe('GET /api/clientes/buscar-persona/:codigo', () => {
  test('sin token → 401', async () => {
    const res = await request(app).get('/api/clientes/buscar-persona/123');
    expect(res.status).toBe(401);
  });

  test('con token, código inexistente → 404, 502 o 403', async () => {
    const res = await request(app).get('/api/clientes/buscar-persona/codigo-inexistente-xyz').set(headers);
    expect([404, 502, 403]).toContain(res.status);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/clientes.buscarPersona.test.js --runInBand --forceExit
```

Expected: FAIL — la ruta `buscar-persona/:codigo` devuelve 404 de Express (ruta no encontrada), no el 404 esperado del controlador.

- [ ] **Step 3: Agregar el controlador en `backend/controllers/clientes.Controller.js`**

Agregar cerca del final del archivo, antes del `module.exports`:

```js
const personas = require('../services/personas.service');

const buscarPersona = async (req, res) => {
  const { codigo } = req.params;
  try {
    const persona = await personas.buscarPorCodigo(codigo);
    const nombre = [persona.primerNombre, persona.segundoNombre].filter(Boolean).join(' ').trim();
    const apellido = [persona.primerApellido, persona.segundoApellido].filter(Boolean).join(' ').trim();
    return res.json({ nombre, apellido, ci_nit: codigo });
  } catch (err) {
    if (err.noEncontrado) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }
    console.error('[clientes.buscarPersona]', err);
    return res.status(502).json({ error: 'No se pudo consultar la API de personas' });
  }
};
```

Agregar `buscarPersona,` al objeto `module.exports` existente.

- [ ] **Step 4: Agregar la ruta en `backend/routes/clientes.Routes.js`**

Ubicar:

```js
router.get('/', checkPermission('ver', 'clientes'), ctrl.listar);
router.get('/:id', checkPermission('ver', 'clientes'), ctrl.obtener);
```

Reemplazar por (la ruta específica va antes de `/:id` por claridad, aunque
no colisionan — `buscar-persona/:codigo` tiene dos segmentos):

```js
router.get('/', checkPermission('ver', 'clientes'), ctrl.listar);
router.get('/buscar-persona/:codigo', checkPermission('crear', 'clientes'), ctrl.buscarPersona);
router.get('/:id', checkPermission('ver', 'clientes'), ctrl.obtener);
```

- [ ] **Step 5: Reiniciar el backend y ejecutar el test**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/clientes.buscarPersona.test.js --runInBand --forceExit
```

Expected: PASS — 2 tests verdes (si `backend/.env` ya tiene credenciales
reales de la API de Personas, el segundo test devolverá 404 real de la API
o 502 si la API no responde; ambos son aceptables según el test).

---

## Task 3: Servicio frontend + UI en `ClienteModals.jsx`

**Files:**
- Modify: `frontend/src/services/cliente.service.js`
- Modify: `frontend/src/pages/clientes/components/ClienteModals.jsx`

**Interfaces:**
- Consumes: endpoint de Task 2.
- Produces: nada consumido por otras tareas.

- [ ] **Step 1: Agregar el método al servicio**

En `frontend/src/services/cliente.service.js`, ubicar:

```js
  historial:    (id) => api.get(`/clientes/${id}/historial`),
};
```

Reemplazar por:

```js
  historial:    (id) => api.get(`/clientes/${id}/historial`),
  buscarPersona: (codigo) => api.get(`/clientes/buscar-persona/${codigo}`),
};
```

- [ ] **Step 2: Agregar estado y la función de búsqueda en `ModalCrearEditar`**

En `frontend/src/pages/clientes/components/ClienteModals.jsx`, ubicar:

```js
export function ModalCrearEditar({ cliente, onConfirm, onClose, guardando }) {
  const isEditing = !!cliente;
  
  const [formData, setFormData] = useState({
    ci_nit: '',
    nombre: '',
    apellido: '',
    empresa: '',
    telefono: '',
    correo: '',
    direccion: '',
    tipo_cliente: 'MINORISTA'
  });
```

Reemplazar por (agrega los dos estados nuevos justo debajo de `formData`):

```js
export function ModalCrearEditar({ cliente, onConfirm, onClose, guardando }) {
  const isEditing = !!cliente;
  
  const [formData, setFormData] = useState({
    ci_nit: '',
    nombre: '',
    apellido: '',
    empresa: '',
    telefono: '',
    correo: '',
    direccion: '',
    tipo_cliente: 'MINORISTA'
  });
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [mensajeBusqueda, setMensajeBusqueda] = useState(null);
```

Ubicar el cierre de `handleChange` (justo antes de `handleSubmit`):

```js
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
```

Reemplazar por (agrega `buscarPersona` entre ambas):

```js
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const buscarPersona = async () => {
    const codigo = formData.ci_nit.trim();
    if (!codigo) {
      setMensajeBusqueda({ tipo: 'error', texto: 'Escribe un CI para buscar' });
      return;
    }
    setMensajeBusqueda(null);
    setBuscandoPersona(true);
    try {
      const res = await clienteService.buscarPersona(codigo);
      const tieneDatos = formData.nombre.trim() || formData.apellido.trim();
      if (tieneDatos && !window.confirm('Ya hay nombre/apellido escritos. ¿Reemplazarlos con los datos encontrados?')) {
        return;
      }
      setFormData((prev) => ({
        ...prev,
        nombre: res.data.nombre || prev.nombre,
        apellido: res.data.apellido || prev.apellido,
      }));
      setMensajeBusqueda({ tipo: 'ok', texto: 'Persona encontrada, datos completados' });
    } catch (err) {
      if (err.response?.status === 404) {
        setMensajeBusqueda({ tipo: 'error', texto: 'No se encontró ninguna persona con ese CI' });
      } else {
        setMensajeBusqueda({ tipo: 'error', texto: 'Error al consultar la API de personas' });
      }
    } finally {
      setBuscandoPersona(false);
    }
  };

  const handleSubmit = (e) => {
```

- [ ] **Step 3: Agregar el botón "Buscar" junto al campo CI**

Ubicar:

```jsx
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                CI / NIT
              </label>
              <input
                type="text"
                name="ci_nit"
                value={formData.ci_nit}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                placeholder="Documento de identidad..."
              />
            </div>
```

Reemplazar por:

```jsx
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                CI / NIT
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="ci_nit"
                  value={formData.ci_nit}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Documento de identidad..."
                />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={buscarPersona}
                    disabled={buscandoPersona}
                    className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 whitespace-nowrap"
                  >
                    {buscandoPersona ? 'Buscando...' : 'Buscar'}
                  </button>
                )}
              </div>
              {mensajeBusqueda && (
                <p className={`text-[11px] mt-1 ${mensajeBusqueda.tipo === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {mensajeBusqueda.texto}
                </p>
              )}
            </div>
```

- [ ] **Step 4: Verificar que compila**

```bash
curl -s -o /dev/null -w "ClienteModals.jsx: %{http_code}\n" http://localhost:5173/src/pages/clientes/components/ClienteModals.jsx
```

Expected: `ClienteModals.jsx: 200`, sin errores en el log del dev server de Vite. Luego, manualmente en el navegador: abrir "Nuevo Cliente" en `/clientes`, escribir un CI, presionar "Buscar", confirmar que aparece el mensaje correspondiente (encontrado/no encontrado).

---

## Task 4: UI en `NuevaVenta.jsx` (modal de registro rápido de cliente)

**Files:**
- Modify: `frontend/src/pages/ventas/NuevaVenta.jsx`

**Interfaces:**
- Consumes: `clienteService.buscarPersona` (Task 3, ya importado `clienteService` en este archivo).
- Produces: nada consumido por otras tareas — es la última.

- [ ] **Step 1: Agregar estado nuevo**

Ubicar (línea ~77):

```js
  const [nuevoCliente, setNuevoCliente] = useState({ ci_nit: '', nombre: '', apellido: '', telefono: '', tipo_cliente: 'MINORISTA' });
```

Agregar justo debajo:

```js
  const [buscandoPersonaVenta, setBuscandoPersonaVenta] = useState(false);
  const [mensajeBusquedaVenta, setMensajeBusquedaVenta] = useState(null);
```

- [ ] **Step 2: Agregar la función de búsqueda**

Ubicar la función `crearClienteRapido` (línea ~295) y agregar la nueva función justo antes:

```js
  const buscarPersonaVenta = async () => {
    const codigo = nuevoCliente.ci_nit.trim();
    if (!codigo) {
      setMensajeBusquedaVenta({ tipo: 'error', texto: 'Escribe un CI para buscar' });
      return;
    }
    setMensajeBusquedaVenta(null);
    setBuscandoPersonaVenta(true);
    try {
      const res = await clienteService.buscarPersona(codigo);
      const tieneDatos = nuevoCliente.nombre.trim() || nuevoCliente.apellido.trim();
      if (tieneDatos && !window.confirm('Ya hay nombre/apellido escritos. ¿Reemplazarlos con los datos encontrados?')) {
        return;
      }
      setNuevoCliente((prev) => ({
        ...prev,
        nombre: res.data.nombre || prev.nombre,
        apellido: res.data.apellido || prev.apellido,
      }));
      setMensajeBusquedaVenta({ tipo: 'ok', texto: 'Persona encontrada, datos completados' });
    } catch (err) {
      if (err.response?.status === 404) {
        setMensajeBusquedaVenta({ tipo: 'error', texto: 'No se encontró ninguna persona con ese CI' });
      } else {
        setMensajeBusquedaVenta({ tipo: 'error', texto: 'Error al consultar la API de personas' });
      }
    } finally {
      setBuscandoPersonaVenta(false);
    }
  };

  const crearClienteRapido = async () => {
```

- [ ] **Step 3: Agregar el botón "Buscar" junto al campo CI del modal**

Ubicar:

```jsx
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">CI / NIT</label>
                <input
                  type="text"
                  value={nuevoCliente.ci_nit}
                  onChange={(e) => setNuevoCliente((p) => ({ ...p, ci_nit: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
```

Reemplazar por:

```jsx
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">CI / NIT</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevoCliente.ci_nit}
                    onChange={(e) => setNuevoCliente((p) => ({ ...p, ci_nit: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={buscarPersonaVenta}
                    disabled={buscandoPersonaVenta}
                    className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 whitespace-nowrap"
                  >
                    {buscandoPersonaVenta ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                {mensajeBusquedaVenta && (
                  <p className={`text-[11px] mt-1 ${mensajeBusquedaVenta.tipo === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                    {mensajeBusquedaVenta.texto}
                  </p>
                )}
              </div>
```

- [ ] **Step 4: Verificar que compila y probar manualmente**

```bash
curl -s -o /dev/null -w "NuevaVenta.jsx: %{http_code}\n" http://localhost:5173/src/pages/ventas/NuevaVenta.jsx
```

Expected: `NuevaVenta.jsx: 200`, sin errores en el log del dev server. Luego,
manualmente en el navegador: en el POS, buscar un cliente inexistente para
que se abra el modal "Nuevo cliente", escribir un CI, presionar "Buscar",
confirmar que aparece el mensaje correspondiente y que "Registrar y
seleccionar" sigue funcionando igual que antes.

- [ ] **Step 5: No hay commit (sin git en el proyecto).**

---

## Self-Review (completado durante la escritura del plan)

**Cobertura del spec:**
- Endpoint a usar (`/personas/{codigo}` con el CI) → Task 1, documentado también como Global Constraint. ✅
- Módulo `personas.service.js` (token cacheado, reintento en 401, propagación de 404) → Task 1. ✅
- Variables de entorno → Task 1, Step 5. ✅
- Endpoint `GET /api/clientes/buscar-persona/:codigo` con mapeo de campos → Task 2. ✅
- UI en `ClienteModals.jsx` (solo al crear, confirmación antes de sobrescribir) → Task 3. ✅
- UI en `NuevaVenta.jsx` (mismo patrón) → Task 4. ✅
- Fuera de alcance (otros endpoints, edición de cliente existente, búsqueda automática) → ninguna tarea lo implementa. ✅

**Placeholders:** ninguno — todos los pasos incluyen código completo.

**Consistencia de tipos/nombres:** `buscarPorCodigo` (servicio, Task 1) usado por `ctrl.buscarPersona` (Task 2); `clienteService.buscarPersona` (Task 3) con la misma firma en `ClienteModals.jsx` (Task 3) y `NuevaVenta.jsx` (Task 4); respuesta `{ nombre, apellido, ci_nit }` consistente entre Task 2 (backend) y ambos consumidores frontend (Task 3 y 4).
