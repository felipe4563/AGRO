# Pago con QR (Banco + Manual) en NuevaVenta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar dos formas de cobrar con QR en el POS (`NuevaVenta.jsx`): QR Banco (real, vía API del Banco Económico, con generación + verificación automática antes de cerrar la venta) y QR Manual (el cajero confirma visualmente sin subir nada).

**Architecture:** Un módulo backend nuevo (`bancoEconomico.service.js`) encapsula toda la comunicación con el banco (token cacheado, cifrado, generar/consultar/anular QR). Tres endpoints nuevos en `ventas.Routes.js` exponen ese módulo al frontend. `ventas.Controller.js:crear()` se extiende con dos columnas opcionales (`qr_tipo`, `qr_referencia`) sin tocar su lógica existente. El frontend agrega dos opciones al selector de método de pago existente y, para QR Banco, un modal que genera el QR, hace polling del estado y solo entonces llama al flujo de creación de venta ya existente.

**Tech Stack:** Node/Express, MySQL (mysql2), `fetch` nativo de Node (v24, sin dependencias nuevas), `jsonwebtoken` (ya instalado, para decodificar `exp` del token del banco), Jest + Supertest (backend), React 19 + Vite (frontend).

**Spec:** `docs/superpowers/specs/2026-08-25-qr-pago-banco-manual-design.md`

## Global Constraints

- No se toca el ENUM `metodo_pago` de `venta` — sigue siendo `'QR'` para ambos sub-flujos.
- No se implementa el webhook `notifyPaymentQR` en esta versión (fuera de alcance, ver spec).
- No se implementa pagar QR de terceros (`dataQR`/`payQR`) — fuera de alcance.
- QR Manual no sube ningún archivo — es solo un checkbox de confirmación del cajero.
- Cambios de esquema (`venta`, `sucursal`) se aplican en vivo (`node -e` contra `config/db.js`, como en el resto de la sesión) **y** se reflejan en `bd/produccion.sql` — instrucción permanente del proyecto.
- Nunca hardcodear credenciales del banco en código — todas van en `backend/.env` (ya gitignored), con placeholders en `backend/.env.example`.
- Base URL de certificación por defecto: `https://apimktdesa.baneco.com.bo/ApiGateway` (sección 4 del documento del banco) — configurable vía `BANCO_ECONOMICO_BASE_URL`.

---

## Task 1: Migración de base de datos

**Files:**
- Modify: `bd/produccion.sql` (tablas `venta` y `sucursal`)
- Script temporal (no se guarda): `backend/` — `node -e` contra `config/db.js`

**Interfaces:**
- Produces: columnas `venta.qr_tipo` (`ENUM('MANUAL','BANCO')`, nullable), `venta.qr_referencia` (`VARCHAR(100)`, nullable), `sucursal.codigo_qr` (`VARCHAR(5)`, nullable). Todas las tareas siguientes las usan por nombre exacto.

- [ ] **Step 1: Aplicar el ALTER TABLE en la base de datos en vivo**

Ejecutar desde `backend/`:

```bash
node -e "
require('dotenv').config();
const db = require('./config/db');
(async () => {
  const q = db.promise();
  await q.query(\"ALTER TABLE venta ADD COLUMN qr_tipo ENUM('MANUAL','BANCO') DEFAULT NULL AFTER metodo_pago\");
  await q.query(\"ALTER TABLE venta ADD COLUMN qr_referencia VARCHAR(100) DEFAULT NULL AFTER qr_tipo\");
  await q.query(\"ALTER TABLE sucursal ADD COLUMN codigo_qr VARCHAR(5) DEFAULT NULL AFTER correo\");
  console.log('OK');
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

Expected: imprime `OK` sin errores.

- [ ] **Step 2: Verificar las columnas en información del esquema**

```bash
node -e "
require('dotenv').config();
const db = require('./config/db');
(async () => {
  const q = db.promise();
  const [cols] = await q.query(\"SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND ((TABLE_NAME='venta' AND COLUMN_NAME IN ('qr_tipo','qr_referencia')) OR (TABLE_NAME='sucursal' AND COLUMN_NAME='codigo_qr'))\", [process.env.DB_NAME]);
  console.log(cols);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

Expected: 3 filas — `venta.qr_tipo`, `venta.qr_referencia`, `sucursal.codigo_qr`.

- [ ] **Step 3: Reflejar el cambio en `bd/produccion.sql`**

Editar el `CREATE TABLE venta` para agregar, justo después de la línea de `metodo_pago`:

```sql
  `qr_tipo` enum('MANUAL','BANCO') DEFAULT NULL,
  `qr_referencia` varchar(100) DEFAULT NULL,
```

Editar el `CREATE TABLE sucursal` para agregar, justo después de la línea de `correo`:

```sql
  `codigo_qr` varchar(5) DEFAULT NULL,
```

- [ ] **Step 4: No hay commit — el proyecto no tiene repositorio git inicializado (confirmado en el spec). Continuar a la siguiente tarea.**

---

## Task 2: Servicio backend `bancoEconomico.service.js`

**Files:**
- Create: `backend/services/bancoEconomico.service.js`
- Test: `backend/tests/bancoEconomico.service.test.js`

**Interfaces:**
- Consumes: `process.env.BANCO_ECONOMICO_BASE_URL`, `BANCO_ECONOMICO_USER`, `BANCO_ECONOMICO_PASSWORD`, `BANCO_ECONOMICO_AES_KEY`, `BANCO_ECONOMICO_ACCOUNT_CREDIT` (definidas en Task 3).
- Produces (usado por Task 4):
  - `encriptar(texto: string): Promise<string>`
  - `generarQR({ transactionId: string, monto: number, moneda: string, descripcion: string, dueDate: string, branchCode?: string }): Promise<{ qrId: string, qrImage: string }>`
  - `estadoQR(qrId: string): Promise<{ pagado: boolean, payment: object|null }>`
  - `anularQR(qrId: string): Promise<void>` — nunca lanza (best-effort, atrapa sus propios errores y los loguea).

- [ ] **Step 1: Escribir el test que falla (mockeando `fetch`)**

Crear `backend/tests/bancoEconomico.service.test.js`:

```js
process.env.BANCO_ECONOMICO_BASE_URL = 'https://banco.test/ApiGateway';
process.env.BANCO_ECONOMICO_USER = 'user_test';
process.env.BANCO_ECONOMICO_PASSWORD = 'pass_test';
process.env.BANCO_ECONOMICO_AES_KEY = 'clave_test';
process.env.BANCO_ECONOMICO_ACCOUNT_CREDIT = '1234567890';

const jwt = require('jsonwebtoken');

function tokenFalso(segundosParaExpirar) {
  return jwt.sign({ usr: 'x' }, 'firma-cualquiera', { expiresIn: segundosParaExpirar });
}

describe('bancoEconomico.service', () => {
  let bancoEconomico;

  beforeEach(() => {
    jest.resetModules();
    bancoEconomico = require('../services/bancoEconomico.service');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('encriptar hace GET a /api/authentication/encrypt y devuelve el texto cifrado', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'TEXTO_CIFRADO_BASE64',
    });

    const resultado = await bancoEconomico.encriptar('1234');

    expect(resultado).toBe('TEXTO_CIFRADO_BASE64');
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/authentication/encrypt');
    expect(url).toContain('text=1234');
    expect(url).toContain('aesKey=clave_test');
  });

  test('generarQR obtiene token, cifra la cuenta y llama a generateQR', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'PASSWORD_CIFRADO' }) // encrypt password
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: tokenFalso(3600), responseCode: 0, message: '' }) }) // authenticate
      .mockResolvedValueOnce({ ok: true, text: async () => 'CUENTA_CIFRADA' }) // encrypt accountCredit
      .mockResolvedValueOnce({ ok: true, json: async () => ({ qrId: '999', qrImage: 'BASE64IMG', responseCode: 0, message: '' }) }); // generateQR

    const resultado = await bancoEconomico.generarQR({
      transactionId: 'venta-1',
      monto: 10.5,
      moneda: 'BOB',
      descripcion: 'Venta POS',
      dueDate: '2026-08-25',
    });

    expect(resultado).toEqual({ qrId: '999', qrImage: 'BASE64IMG' });
    const llamadaGenerar = global.fetch.mock.calls[3];
    expect(llamadaGenerar[0]).toContain('/api/qrsimple/generateQR');
    const body = JSON.parse(llamadaGenerar[1].body);
    expect(body.accountCredit).toBe('CUENTA_CIFRADA');
    expect(body.amount).toBe(10.5);
    expect(llamadaGenerar[1].headers.Authorization).toMatch(/^Bearer /);
  });

  test('estadoQR interpreta statusQRCode = 1 como pagado', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'PASSWORD_CIFRADO' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: tokenFalso(3600), responseCode: 0, message: '' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ statusQrCode: 1, payment: [{ qrId: '999' }], responseCode: 0, message: '' }) });

    const resultado = await bancoEconomico.estadoQR('999');

    expect(resultado.pagado).toBe(true);
  });

  test('anularQR nunca lanza, incluso si el banco responde error', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'PASSWORD_CIFRADO' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: tokenFalso(3600), responseCode: 0, message: '' }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ responseCode: 1, message: 'error' }) });

    await expect(bancoEconomico.anularQR('999')).resolves.toBeUndefined();
  });

  test('el token se reutiliza si no está por expirar (no vuelve a autenticar)', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'PASSWORD_CIFRADO' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: tokenFalso(3600), responseCode: 0, message: '' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => 'CUENTA_CIFRADA' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ qrId: '1', qrImage: 'A', responseCode: 0, message: '' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => 'CUENTA_CIFRADA' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ qrId: '2', qrImage: 'B', responseCode: 0, message: '' }) });

    await bancoEconomico.generarQR({ transactionId: 't1', monto: 1, moneda: 'BOB', descripcion: 'x', dueDate: '2026-08-25' });
    await bancoEconomico.generarQR({ transactionId: 't2', monto: 1, moneda: 'BOB', descripcion: 'x', dueDate: '2026-08-25' });

    // 2 llamadas de encrypt password + authenticate solo la primera vez = 2 llamadas de "login",
    // más 2 de encrypt-cuenta y 2 de generateQR = 6 llamadas totales, no 8.
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/bancoEconomico.service.test.js --runInBand
```

Expected: FAIL — `Cannot find module '../services/bancoEconomico.service'`.

- [ ] **Step 3: Implementar `backend/services/bancoEconomico.service.js`**

```js
const jwt = require('jsonwebtoken');

let tokenCache = null; // { token, exp }

function baseUrl() {
  return process.env.BANCO_ECONOMICO_BASE_URL || 'https://apimktdesa.baneco.com.bo/ApiGateway';
}

async function encriptar(texto) {
  const url = `${baseUrl()}/api/authentication/encrypt?text=${encodeURIComponent(texto)}&aesKey=${encodeURIComponent(process.env.BANCO_ECONOMICO_AES_KEY)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Error al cifrar datos con el Banco Económico (HTTP ${res.status})`);
  return (await res.text()).trim();
}

async function obtenerToken() {
  const ahora = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp > ahora + 60) {
    return tokenCache.token;
  }

  const passwordCifrado = await encriptar(process.env.BANCO_ECONOMICO_PASSWORD);

  const res = await fetch(`${baseUrl()}/api/authentication/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: process.env.BANCO_ECONOMICO_USER, password: passwordCifrado }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Error al autenticar con el Banco Económico (HTTP ${res.status})`);
  const data = await res.json();
  if (data.responseCode !== 0) throw new Error(data.message || 'Autenticación rechazada por el Banco Económico');

  const decoded = jwt.decode(data.token) || {};
  tokenCache = { token: data.token, exp: decoded.exp || ahora + 300 };
  return tokenCache.token;
}

async function llamadaAutenticada(path, opciones = {}) {
  const token = await obtenerToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opciones.headers || {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  return res;
}

async function generarQR({ transactionId, monto, moneda, descripcion, dueDate, branchCode }) {
  const accountCredit = await encriptar(process.env.BANCO_ECONOMICO_ACCOUNT_CREDIT);

  const body = {
    transactionId,
    accountCredit,
    currency: moneda,
    amount: monto,
    description: descripcion,
    dueDate,
    singleUse: true,
    modifyAmount: false,
  };
  if (branchCode) body.branchCode = branchCode;

  const res = await llamadaAutenticada('/api/qrsimple/generateQR', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error al generar el QR (HTTP ${res.status})`);
  const data = await res.json();
  if (data.responseCode !== 0) throw new Error(data.message || 'El Banco Económico rechazó la generación del QR');

  return { qrId: data.qrId, qrImage: data.qrImage };
}

async function estadoQR(qrId) {
  const res = await llamadaAutenticada(`/api/qrsimple/v2/statusQR/${encodeURIComponent(qrId)}`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error(`Error al consultar el estado del QR (HTTP ${res.status})`);
  const data = await res.json();
  const codigo = data.statusQRCode ?? data.statusQrCode;
  return { pagado: codigo === 1, payment: data.payment || null };
}

async function anularQR(qrId) {
  try {
    const res = await llamadaAutenticada('/api/qrsimple/cancelQR', {
      method: 'DELETE',
      body: JSON.stringify({ qrId }),
    });
    if (!res.ok) {
      console.error(`[bancoEconomico.anularQR] HTTP ${res.status} al anular QR ${qrId}`);
    }
  } catch (err) {
    console.error('[bancoEconomico.anularQR]', err.message);
  }
}

module.exports = { encriptar, generarQR, estadoQR, anularQR };
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/bancoEconomico.service.test.js --runInBand
```

Expected: PASS — 5 tests verdes.

- [ ] **Step 5: Commit**

No hay repositorio git en el proyecto (confirmado en Task 1) — omitir este paso en todas las tareas de este plan.

---

## Task 3: Variables de entorno

**Files:**
- Modify: `backend/.env.example`
- Modify (solo local, nunca commiteado): `backend/.env`

**Interfaces:**
- Consumes: nada.
- Produces: las 5 variables que lee `bancoEconomico.service.js` (Task 2).

- [ ] **Step 1: Agregar las variables a `backend/.env.example`**

Agregar al final del archivo:

```
# Banco Económico — API Market (pagos con QR)
BANCO_ECONOMICO_BASE_URL=https://apimktdesa.baneco.com.bo/ApiGateway
BANCO_ECONOMICO_USER=
BANCO_ECONOMICO_PASSWORD=
BANCO_ECONOMICO_AES_KEY=
BANCO_ECONOMICO_ACCOUNT_CREDIT=
```

- [ ] **Step 2: Completar `backend/.env` con las credenciales reales (el usuario ya las tiene)**

Este paso lo hace el usuario directamente en su `backend/.env` local — el agente que ejecute este plan NO debe pedir ni escribir las credenciales reales en el chat ni en ningún archivo versionado. Si `backend/.env` no tiene las 5 variables completas, las tareas 4 en adelante seguirán compilando pero las llamadas reales al banco fallarán con un error claro (`Error al autenticar con el Banco Económico...`), lo cual es aceptable para continuar el desarrollo — la verificación end-to-end contra el banco es un paso manual aparte (ver Task 4, Step 6).

- [ ] **Step 3: No hay commit — `.env` está gitignored y el proyecto no tiene git.**

---

## Task 4: Endpoints backend (`generarQrBanco`, `estadoQrBanco`, `anularQrBanco`) + extender `crear()`

**Files:**
- Modify: `backend/controllers/ventas.Controller.js`
- Modify: `backend/routes/ventas.Routes.js`
- Test: `backend/tests/ventas.qrBanco.test.js`

**Interfaces:**
- Consumes: `bancoEconomico.generarQR`, `bancoEconomico.estadoQR`, `bancoEconomico.anularQR` (Task 2).
- Produces (usado por Task 5, frontend):
  - `POST /api/ventas/qr-banco/generar` — body `{ monto: number }` → `{ qrId, qrImage }`
  - `GET /api/ventas/qr-banco/estado/:qrId` → `{ pagado: boolean }`
  - `DELETE /api/ventas/qr-banco/:qrId` → `{ mensaje: string }`
  - `POST /api/ventas` (existente) ahora acepta también `qr_tipo` y `qr_referencia` opcionales en el body.

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/tests/ventas.qrBanco.test.js`:

```js
const { app, request, authHeader } = require('./helpers');

const BASE = '/api/ventas/qr-banco';
let headers;

beforeAll(async () => {
  headers = await authHeader();
});

describe('QR Banco - Sin token', () => {
  test('POST /generar → 401', async () => {
    const res = await request(app).post(`${BASE}/generar`).send({ monto: 10 });
    expect(res.status).toBe(401);
  });
  test('GET /estado/:qrId → 401', async () => {
    const res = await request(app).get(`${BASE}/estado/123`);
    expect(res.status).toBe(401);
  });
  test('DELETE /:qrId → 401', async () => {
    const res = await request(app).delete(`${BASE}/123`);
    expect(res.status).toBe(401);
  });
});

describe('QR Banco - Con token admin', () => {
  test('POST /generar sin monto → 400', async () => {
    const res = await request(app).post(`${BASE}/generar`).set(headers).send({});
    expect([400, 403]).toContain(res.status);
  });

  test('POST /generar con monto válido → 200 con qrId+qrImage, o 500 si el banco no responde en este entorno', async () => {
    const res = await request(app).post(`${BASE}/generar`).set(headers).send({ monto: 5 });
    expect([200, 403, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.qrId).toBeDefined();
      expect(res.body.qrImage).toBeDefined();
    }
  });

  test('GET /estado/:qrId con id inexistente → responde sin reventar (200 pagado:false, o 500/403)', async () => {
    const res = await request(app).get(`${BASE}/estado/id-inexistente`).set(headers);
    expect([200, 403, 500]).toContain(res.status);
  });

  test('DELETE /:qrId nunca revienta aunque el id no exista', async () => {
    const res = await request(app).delete(`${BASE}/id-inexistente`).set(headers);
    expect([200, 403]).toContain(res.status);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/ventas.qrBanco.test.js --runInBand
```

Expected: FAIL — rutas `qr-banco/*` devuelven 404, no 401.

- [ ] **Step 3: Agregar los controladores en `backend/controllers/ventas.Controller.js`**

Agregar cerca del final del archivo, antes del `module.exports`:

```js
const bancoEconomico = require('../services/bancoEconomico.service');

const generarQrBanco = async (req, res) => {
  const { monto } = req.body ?? {};
  const montoNum = parseFloat(monto);
  if (!montoNum || montoNum <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  }
  try {
    const [sucRows] = await db.promise().query(
      'SELECT codigo_qr FROM sucursal WHERE id_sucursal = ?',
      [req.user.id_sucursal]
    );
    const branchCode = sucRows[0]?.codigo_qr || undefined;
    const hoy = new Date().toISOString().split('T')[0];

    const resultado = await bancoEconomico.generarQR({
      transactionId: `venta-${Date.now()}`,
      monto: montoNum,
      moneda: 'BOB',
      descripcion: 'Venta POS',
      dueDate: hoy,
      branchCode,
    });

    return res.json(resultado);
  } catch (err) {
    console.error('[ventas.generarQrBanco]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'No se pudo generar el QR con el Banco Económico') });
  }
};

const estadoQrBanco = async (req, res) => {
  try {
    const estado = await bancoEconomico.estadoQR(req.params.qrId);
    return res.json({ pagado: estado.pagado });
  } catch (err) {
    console.error('[ventas.estadoQrBanco]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'No se pudo consultar el estado del QR') });
  }
};

const anularQrBanco = async (req, res) => {
  await bancoEconomico.anularQR(req.params.qrId);
  return res.json({ mensaje: 'QR anulado' });
};
```

Agregar `generarQrBanco, estadoQrBanco, anularQrBanco,` al objeto `module.exports` existente.

- [ ] **Step 4: Extender la función `crear()` existente para aceptar `qr_tipo`/`qr_referencia`**

En `backend/controllers/ventas.Controller.js`, ubicar (línea ~76-80):

```js
const crear = async (req, res) => {
  const {
    id_cliente, nro_factura, tipo_venta, monto_pagado, cambio,
    metodo_pago, observaciones, detalles, canje_recompensa
  } = req.body;
```

Reemplazar por:

```js
const crear = async (req, res) => {
  const {
    id_cliente, nro_factura, tipo_venta, monto_pagado, cambio,
    metodo_pago, observaciones, detalles, canje_recompensa,
    qr_tipo, qr_referencia
  } = req.body;
```

Ubicar el `INSERT INTO venta` (línea ~313-320):

```js
      `INSERT INTO venta
        (id_sucursal, id_usuario, id_cliente, id_apertura, nro_factura, tipo_venta, subtotal, descuento_total, total, monto_pagado, cambio, metodo_pago, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETADA', ?)`,
      [
        id_sucursal, id_usuario, id_cliente || null, id_apertura, nro_factura || null,
        tipo_venta || 'MENOR', subtotal, descuento_total, total,
        montoPagadoNum, cambioNum, metodo_pago || 'EFECTIVO', observaciones || null
      ]
    );
```

Reemplazar por:

```js
      `INSERT INTO venta
        (id_sucursal, id_usuario, id_cliente, id_apertura, nro_factura, tipo_venta, subtotal, descuento_total, total, monto_pagado, cambio, metodo_pago, qr_tipo, qr_referencia, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETADA', ?)`,
      [
        id_sucursal, id_usuario, id_cliente || null, id_apertura, nro_factura || null,
        tipo_venta || 'MENOR', subtotal, descuento_total, total,
        montoPagadoNum, cambioNum, metodo_pago || 'EFECTIVO',
        qr_tipo || null, qr_referencia || null, observaciones || null
      ]
    );
```

- [ ] **Step 5: Wirear las rutas en `backend/routes/ventas.Routes.js`**

Agregar, antes de `module.exports = router;`:

```js
router.post('/qr-banco/generar', checkPermission('crear', 'ventas'), ctrl.generarQrBanco);
router.get('/qr-banco/estado/:qrId', checkPermission('crear', 'ventas'), ctrl.estadoQrBanco);
router.delete('/qr-banco/:qrId', checkPermission('crear', 'ventas'), ctrl.anularQrBanco);
```

- [ ] **Step 6: Reiniciar el backend y ejecutar el test**

```bash
# matar el proceso en el puerto 3000 y volver a levantarlo (ver convención del proyecto: netstat + taskkill + nohup node app.js)
cd backend
npx cross-env NODE_ENV=test jest tests/ventas.qrBanco.test.js --runInBand
```

Expected: PASS — 7 tests verdes (si `backend/.env` ya tiene credenciales reales del Banco Económico, el test de `POST /generar con monto válido` debería devolver 200 con `qrId`/`qrImage` reales contra el ambiente de certificación; si no, 500 es aceptable en este punto).

- [ ] **Step 7 (manual, fuera de Jest): Verificación end-to-end contra el ambiente de certificación**

Con `backend/.env` completo, generar un QR real vía `POST /api/ventas/qr-banco/generar` (Postman/curl con el token de un usuario logueado), confirmar que `qrImage` decodifica a una imagen QR válida, y si el ambiente de certificación permite simular el pago, confirmar que `GET /api/ventas/qr-banco/estado/:qrId` refleja `pagado: true` tras el pago.

---

## Task 5: Servicio frontend `venta.service.js`

**Files:**
- Modify: `frontend/src/services/venta.service.js`

**Interfaces:**
- Consumes: endpoints de Task 4.
- Produces (usado por Task 6): `ventaService.generarQrBanco({ monto })`, `ventaService.estadoQrBanco(qrId)`, `ventaService.anularQrBanco(qrId)`.

- [ ] **Step 1: Agregar los tres métodos**

Reemplazar el contenido completo de `frontend/src/services/venta.service.js`:

```js
import api from '../api/axios';

const ventaService = {
  listarProductosPOS: () => api.get('/ventas/pos-productos'),
  listar:  () => api.get('/ventas'),
  obtener: (id) => api.get(`/ventas/${id}`),
  crear:   (data) => api.post('/ventas', data),
  anular:  (id) => api.patch(`/ventas/${id}/anular`),
  generarQrBanco: (data) => api.post('/ventas/qr-banco/generar', data),
  estadoQrBanco:  (qrId) => api.get(`/ventas/qr-banco/estado/${qrId}`),
  anularQrBanco:  (qrId) => api.delete(`/ventas/qr-banco/${qrId}`),
};

export default ventaService;
```

- [ ] **Step 2: Verificar que compila**

```bash
curl -s -o /dev/null -w "venta.service.js: %{http_code}\n" http://localhost:5173/src/services/venta.service.js
```

Expected: `venta.service.js: 200`, sin errores nuevos en el log del dev server de Vite.

- [ ] **Step 3: No hay commit (sin git en el proyecto).**

---

## Task 6: UI en `NuevaVenta.jsx` — selector QR Manual / QR Banco + modal de cobro

**Files:**
- Modify: `frontend/src/pages/ventas/NuevaVenta.jsx`

**Interfaces:**
- Consumes: `ventaService.generarQrBanco`, `ventaService.estadoQrBanco`, `ventaService.anularQrBanco` (Task 5).
- Produces: nada consumido por otras tareas — es la última.

- [ ] **Step 1: Agregar estado nuevo**

Ubicar (línea ~48):

```js
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
```

Agregar justo debajo:

```js
  const [qrManualConfirmado, setQrManualConfirmado] = useState(false);
  const [modalQrBanco, setModalQrBanco] = useState(null); // { qrId, qrImage } | null
  const [verificandoQrBanco, setVerificandoQrBanco] = useState(false);
  const [errorQrBanco, setErrorQrBanco] = useState('');
  const [generandoQrBanco, setGenerandoQrBanco] = useState(false);
  const pollingQrBancoRef = useRef(null);
```

- [ ] **Step 2: Renombrar `finalizarVenta` a `procesarVenta(extra)` y adaptar el payload**

Ubicar (línea ~441):

```js
  const finalizarVenta = async () => {
    if (carrito.length === 0) { mostrarToast('error', 'El carrito está vacío'); return; }
    if (totales.total <= 0) { mostrarToast('error', 'El total debe ser mayor a 0'); return; }
    if (metodoPago === 'CREDITO' && !idCliente) { mostrarToast('error', 'Seleccione un cliente para venta a crédito'); return; }
    if (metodoPago !== 'CREDITO' && parseFloat(montoPagado) > 0 && totales.cambio < 0) { mostrarToast('error', 'El monto pagado es insuficiente'); return; }
```

Reemplazar por:

```js
  const procesarVenta = async (extra = {}) => {
    if (carrito.length === 0) { mostrarToast('error', 'El carrito está vacío'); return; }
    if (totales.total <= 0) { mostrarToast('error', 'El total debe ser mayor a 0'); return; }
    if (metodoPago === 'CREDITO' && !idCliente) { mostrarToast('error', 'Seleccione un cliente para venta a crédito'); return; }
    if (metodoPago !== 'CREDITO' && parseFloat(montoPagado) > 0 && totales.cambio < 0) { mostrarToast('error', 'El monto pagado es insuficiente'); return; }
    if (metodoPago === 'QR_MANUAL' && !qrManualConfirmado) { mostrarToast('error', 'Confirma que verificaste el pago antes de continuar'); return; }
```

Ubicar el payload (línea ~458-481):

```js
      const payload = {
        id_cliente: idCliente || null,
        nro_factura: nroFactura || null,
        tipo_venta: tipoVenta,
        subtotal: totales.subtotal,
        descuento_total: totales.descuento_total,
        total: totales.total,
        monto_pagado: montoPagadoFinal,
        cambio: totales.cambio > 0 ? totales.cambio : 0,
        metodo_pago: metodoPago,
        canje_recompensa: recompensaAplicada ? { id_recompensa: recompensaAplicada.id_recompensa } : null,
```

Reemplazar por:

```js
      const metodoPagoReal = (metodoPago === 'QR_MANUAL' || metodoPago === 'QR_BANCO') ? 'QR' : metodoPago;

      const payload = {
        id_cliente: idCliente || null,
        nro_factura: nroFactura || null,
        tipo_venta: tipoVenta,
        subtotal: totales.subtotal,
        descuento_total: totales.descuento_total,
        total: totales.total,
        monto_pagado: montoPagadoFinal,
        cambio: totales.cambio > 0 ? totales.cambio : 0,
        metodo_pago: metodoPagoReal,
        ...extra,
        canje_recompensa: recompensaAplicada ? { id_recompensa: recompensaAplicada.id_recompensa } : null,
```

Ubicar el final de la función (línea ~482-489):

```js
      const res = await ventaService.crear(payload);
      mostrarToast('ok', 'Venta registrada correctamente');
      setVentaCompletadaId(res.data.id_venta);
      setCarrito([]);
      setMontoPagado('');
      setNroFactura('');
      setDescuentoPct('');
      setRecompensaAplicada(null);
```

Reemplazar por (agrega limpieza del estado de QR):

```js
      const res = await ventaService.crear(payload);
      mostrarToast('ok', 'Venta registrada correctamente');
      setVentaCompletadaId(res.data.id_venta);
      setCarrito([]);
      setMontoPagado('');
      setNroFactura('');
      setDescuentoPct('');
      setRecompensaAplicada(null);
      setQrManualConfirmado(false);
      setModalQrBanco(null);
```

- [ ] **Step 3: Agregar los manejadores de QR Banco (generar, polling, cancelar)**

Justo después del cierre de `procesarVenta` (el `};` que sigue al `finally`), agregar:

```js
  const iniciarCobroQrBanco = async () => {
    if (carrito.length === 0) { mostrarToast('error', 'El carrito está vacío'); return; }
    if (totales.total <= 0) { mostrarToast('error', 'El total debe ser mayor a 0'); return; }

    setErrorQrBanco('');
    setGenerandoQrBanco(true);
    try {
      const res = await ventaService.generarQrBanco({ monto: totales.total });
      setModalQrBanco({ qrId: res.data.qrId, qrImage: res.data.qrImage });

      pollingQrBancoRef.current = setInterval(async () => {
        try {
          const estado = await ventaService.estadoQrBanco(res.data.qrId);
          if (estado.data.pagado) {
            clearInterval(pollingQrBancoRef.current);
            pollingQrBancoRef.current = null;
            setVerificandoQrBanco(true);
            await procesarVenta({ qr_tipo: 'BANCO', qr_referencia: res.data.qrId });
            setVerificandoQrBanco(false);
          }
        } catch {
          // fallo transitorio de un ciclo de polling: se reintenta en el siguiente
        }
      }, 4000);
    } catch (err) {
      setErrorQrBanco(err.response?.data?.error || 'No se pudo generar el QR, intenta de nuevo o usa QR Manual');
    } finally {
      setGenerandoQrBanco(false);
    }
  };

  const cerrarModalQrBanco = () => {
    if (pollingQrBancoRef.current) {
      clearInterval(pollingQrBancoRef.current);
      pollingQrBancoRef.current = null;
    }
    if (modalQrBanco?.qrId) {
      ventaService.anularQrBanco(modalQrBanco.qrId).catch(() => {});
    }
    setModalQrBanco(null);
    setErrorQrBanco('');
  };

  useEffect(() => {
    return () => {
      if (pollingQrBancoRef.current) clearInterval(pollingQrBancoRef.current);
    };
  }, []);
```

- [ ] **Step 4: Actualizar el `<select>` de método de pago**

Ubicar (línea ~972-984):

```js
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none text-sm font-medium text-zinc-900 dark:text-white"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="QR">QR</option>
                <option value="TRANSFERENCIA">Transf.</option>
                <option value="CREDITO" disabled={!idCliente}>
                  Crédito{!idCliente ? ' (requiere cliente)' : ''}
                </option>
                <option value="OTRO">Otro</option>
              </select>
```

Reemplazar por:

```js
              <select
                value={metodoPago}
                onChange={(e) => { setMetodoPago(e.target.value); setQrManualConfirmado(false); }}
                className="w-full p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none text-sm font-medium text-zinc-900 dark:text-white"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="QR_BANCO">QR Banco</option>
                <option value="QR_MANUAL">QR Manual</option>
                <option value="TRANSFERENCIA">Transf.</option>
                <option value="CREDITO" disabled={!idCliente}>
                  Crédito{!idCliente ? ' (requiere cliente)' : ''}
                </option>
                <option value="OTRO">Otro</option>
              </select>
```

- [ ] **Step 5: Agregar la casilla de confirmación de QR Manual**

Ubicar el bloque de crédito/cambio (línea ~1003-1013):

```js
          {metodoPago === 'CREDITO' ? (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl flex justify-between font-bold text-sm">
              <span>Saldo pendiente:</span>
              <span>Bs {Math.max(0, totales.total - (parseFloat(montoPagado) || 0)).toFixed(2)}</span>
            </div>
          ) : totales.cambio > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl flex justify-between font-bold text-sm">
              <span>Cambio:</span>
              <span>Bs {totales.cambio.toFixed(2)}</span>
            </div>
          )}
```

Reemplazar por (agrega el caso `QR_MANUAL` antes del `else` genérico):

```js
          {metodoPago === 'CREDITO' ? (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl flex justify-between font-bold text-sm">
              <span>Saldo pendiente:</span>
              <span>Bs {Math.max(0, totales.total - (parseFloat(montoPagado) || 0)).toFixed(2)}</span>
            </div>
          ) : metodoPago === 'QR_MANUAL' ? (
            <label className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={qrManualConfirmado}
                onChange={(e) => setQrManualConfirmado(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              Confirmo que verifiqué el pago en el celular del cliente
            </label>
          ) : totales.cambio > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl flex justify-between font-bold text-sm">
              <span>Cambio:</span>
              <span>Bs {totales.cambio.toFixed(2)}</span>
            </div>
          )}
```

- [ ] **Step 6: Cambiar el botón COBRAR para bifurcar a QR Banco**

Ubicar (línea ~1015-1028):

```js
          <button
            onClick={finalizarVenta}
            disabled={guardando || carrito.length === 0}
            className="w-full py-4 rounded-xl text-white font-black text-lg bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {guardando ? 'Procesando...' : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                COBRAR Bs {totales.total.toFixed(2)}
              </>
            )}
          </button>
```

Reemplazar por:

```js
          <button
            onClick={() => {
              if (metodoPago === 'QR_BANCO') {
                iniciarCobroQrBanco();
              } else if (metodoPago === 'QR_MANUAL') {
                procesarVenta({ qr_tipo: 'MANUAL' });
              } else {
                procesarVenta();
              }
            }}
            disabled={guardando || generandoQrBanco || carrito.length === 0 || (metodoPago === 'QR_MANUAL' && !qrManualConfirmado)}
            className="w-full py-4 rounded-xl text-white font-black text-lg bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {guardando || generandoQrBanco ? 'Procesando...' : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                {metodoPago === 'QR_BANCO' ? 'GENERAR QR' : 'COBRAR'} Bs {totales.total.toFixed(2)}
              </>
            )}
          </button>
```

- [ ] **Step 7: Agregar el modal de QR Banco**

Ubicar el cierre del modal de "Nuevo cliente" (buscar el modal que empieza en la línea ~1032-1034 con `mostrarFormCliente &&`) y agregar un modal hermano justo después de que ese bloque termine (antes del cierre final del `return (...)` del componente):

```jsx
      {/* Modal: cobro con QR Banco (generación + verificación automática) */}
      {modalQrBanco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-5 text-center">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Cobro con QR Banco</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Bs {totales.total.toFixed(2)} — pide al cliente que escanee este código con su banca móvil.
            </p>
            <img
              src={`data:image/png;base64,${modalQrBanco.qrImage}`}
              alt="Código QR de cobro"
              className="w-56 h-56 mx-auto rounded-xl border border-zinc-200 dark:border-zinc-700"
            />
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-4 animate-pulse">
              {verificandoQrBanco ? 'Pago detectado, registrando venta...' : 'Esperando pago...'}
            </p>
            <button
              onClick={cerrarModalQrBanco}
              disabled={verificandoQrBanco}
              className="w-full mt-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Error al generar QR Banco */}
      {errorQrBanco && !modalQrBanco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-5 text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">{errorQrBanco}</p>
            <button
              onClick={() => setErrorQrBanco('')}
              className="w-full py-2.5 rounded-xl bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 8: Verificar que compila y probar manualmente en el navegador**

```bash
curl -s -o /dev/null -w "NuevaVenta.jsx: %{http_code}\n" http://localhost:5173/src/pages/ventas/NuevaVenta.jsx
```

Expected: `NuevaVenta.jsx: 200`, sin errores en el log del dev server. Luego, manualmente en el navegador: armar un carrito, elegir "QR Manual" → verificar que el botón queda deshabilitado hasta marcar la casilla → finalizar venta y confirmar que llega a `ticket`. Elegir "QR Banco" → click en "GENERAR QR" → confirmar que se abre el modal con una imagen QR real (si `backend/.env` ya tiene credenciales) y que "Cancelar" cierra el modal sin crear la venta.

- [ ] **Step 9: No hay commit (sin git en el proyecto).**

---

## Self-Review (completado durante la escritura del plan)

**Cobertura del spec:**
- DB (`qr_tipo`, `qr_referencia`, `codigo_qr`) → Task 1. ✅
- Módulo `bancoEconomico.service.js` (token cacheado, `encriptar`, `generarQR`, `estadoQR`, `anularQR`) → Task 2. ✅
- Variables de entorno → Task 3. ✅
- Endpoints `qr-banco/generar|estado|:qrId` + extensión de `crear()` → Task 4. ✅
- Servicio frontend → Task 5. ✅
- UI: selector con 2 opciones QR, checkbox manual, modal banco con polling y cancelación → Task 6. ✅
- Fuera de alcance (webhook, pagar QR de terceros, conciliación batch, subida de archivo) → explícitamente excluido, ninguna tarea lo implementa. ✅

**Placeholders:** ninguno — todos los pasos incluyen código completo.

**Consistencia de tipos/nombres:** `qr_tipo`/`qr_referencia` (backend y frontend), `pagado` (boolean, consistente entre `estadoQR` del servicio, el controlador y el frontend), `qrId`/`qrImage` (consistente en las 3 capas), `ventaService.generarQrBanco/estadoQrBanco/anularQrBanco` (mismos nombres en Task 5 y usados en Task 6).
