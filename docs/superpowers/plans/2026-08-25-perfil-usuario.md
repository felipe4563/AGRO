# Perfil de usuario (foto + contraseña) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una página de Perfil donde cualquier usuario logueado cambia su propia foto y contraseña, y un flag `debe_cambiar_contrasena` que el admin activa (al resetear la clave o crear un usuario) y que fuerza el cambio en el siguiente login antes de usar cualquier otro módulo.

**Architecture:** Un módulo backend nuevo (`perfil.Controller.js` + `perfil.Routes.js`, montado en `/api/perfil`) opera exclusivamente sobre `req.user.id_usuario` — nadie puede tocar el perfil de otro usuario, sin necesitar permisos especiales. `usuarios.Controller.js` (admin) se extiende para activar el flag. `auth.Controller.js:login` agrega `foto` y `debe_cambiar_contrasena` a la respuesta. En el frontend, `ProtectedRoute.jsx` gatea todas las rutas protegidas: si el flag viene activo, redirige a `/perfil?obligatorio=1` sin importar a dónde intentaba ir el usuario.

**Tech Stack:** Node/Express, MySQL (mysql2), bcrypt, multer (ya usado en `configuracion.Routes.js`/`productos.Routes.js`), React 19 + Vite, React Router, Jest + Supertest.

**Spec:** `docs/superpowers/specs/2026-08-25-perfil-usuario-design.md`

## Global Constraints

- El usuario NO puede editar nombre/apellido/correo/celular/CI/rol/sucursal desde Perfil — solo foto y contraseña (confirmado con el usuario).
- `debe_cambiar_contrasena` se activa tanto al resetear clave como al crear un usuario nuevo (confirmado con el usuario).
- Ninguna ruta de `/api/perfil` acepta un `:id` — todas operan sobre `req.user.id_usuario`.
- Cambios de esquema (`usuario.foto`, `usuario.debe_cambiar_contrasena`) se aplican en vivo (`node -e` contra `config/db.js`) **y** se reflejan en `bd/produccion.sql` — instrucción permanente del proyecto.
- El proyecto no tiene repositorio git inicializado — no hay pasos de commit en este plan.

---

## Task 1: Migración de base de datos

**Files:**
- Modify: `bd/produccion.sql` (tabla `usuario`)
- Script temporal (no se guarda): `backend/` — `node -e` contra `config/db.js`

**Interfaces:**
- Produces: columnas `usuario.foto` (`VARCHAR(255)`, nullable), `usuario.debe_cambiar_contrasena` (`TINYINT(1) NOT NULL DEFAULT 0`). Todas las tareas siguientes las usan por nombre exacto.

- [ ] **Step 1: Aplicar el ALTER TABLE en la base de datos en vivo**

Ejecutar desde `backend/`:

```bash
node -e "
require('dotenv').config();
const db = require('./config/db');
(async () => {
  const q = db.promise();
  await q.query(\"ALTER TABLE usuario ADD COLUMN foto VARCHAR(255) DEFAULT NULL AFTER celular\");
  await q.query(\"ALTER TABLE usuario ADD COLUMN debe_cambiar_contrasena TINYINT(1) NOT NULL DEFAULT 0 AFTER contrasena\");
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
  const [cols] = await q.query(\"SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND TABLE_NAME='usuario' AND COLUMN_NAME IN ('foto','debe_cambiar_contrasena')\", [process.env.DB_NAME]);
  console.log(cols);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

Expected: 2 filas — `foto` y `debe_cambiar_contrasena`.

- [ ] **Step 3: Reflejar el cambio en `bd/produccion.sql`**

Ubicar el `CREATE TABLE usuario` (línea ~584-602):

```sql
CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `id_rol` int(11) DEFAULT NULL,
  `id_sucursal` int(11) DEFAULT NULL,
  `ci` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `celular` varchar(20) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `contrasena` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`),
```

Reemplazar por (agrega `foto` después de `celular` y `debe_cambiar_contrasena` después de `contrasena`):

```sql
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
```

- [ ] **Step 4: No hay commit — el proyecto no tiene repositorio git inicializado. Continuar a la siguiente tarea.**

---

## Task 2: Módulo backend `perfil.Controller.js` + `perfil.Routes.js`

**Files:**
- Create: `backend/controllers/perfil.Controller.js`
- Create: `backend/routes/perfil.Routes.js`
- Modify: `backend/app.js` (montar la ruta nueva)
- Test: `backend/tests/perfil.test.js`

**Interfaces:**
- Consumes: `req.user.id_usuario` (de `authMiddleware`, ya existente).
- Produces (usado por Task 4, frontend):
  - `GET /api/perfil` → `{ id_usuario, nombre, apellido, correo, celular, foto, rol_nombre, debe_cambiar_contrasena }`
  - `PATCH /api/perfil/password` — body `{ contrasena_actual, nueva_contrasena }` → `{ mensaje }`
  - `PATCH /api/perfil/foto` — multipart, campo `foto` → `{ mensaje, foto }`

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/tests/perfil.test.js`:

```js
const { app, request, authHeader } = require('./helpers');

let headers;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Perfil - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get('/api/perfil');
    expect(res.status).toBe(401);
  });
  test('PATCH /password → 401', async () => {
    const res = await request(app).patch('/api/perfil/password').send({});
    expect(res.status).toBe(401);
  });
});

describe('Perfil - Con token', () => {
  test('GET / devuelve el perfil propio', async () => {
    const res = await request(app).get('/api/perfil').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.id_usuario).toBeDefined();
    expect(res.body).toHaveProperty('debe_cambiar_contrasena');
  });

  test('PATCH /password sin contrasena_actual → 400', async () => {
    const res = await request(app).patch('/api/perfil/password').set(headers).send({ nueva_contrasena: 'nueva123' });
    expect(res.status).toBe(400);
  });

  test('PATCH /password con nueva_contrasena corta → 400', async () => {
    const res = await request(app).patch('/api/perfil/password').set(headers).send({ contrasena_actual: 'x', nueva_contrasena: '123' });
    expect(res.status).toBe(400);
  });

  test('PATCH /password con contrasena_actual incorrecta → 401', async () => {
    const res = await request(app).patch('/api/perfil/password').set(headers).send({ contrasena_actual: 'clave-incorrecta-xyz', nueva_contrasena: 'nueva123' });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/perfil.test.js --runInBand --forceExit
```

Expected: FAIL — `Cannot find module '../controllers/perfil.Controller'` o rutas devuelven 404.

- [ ] **Step 3: Implementar `backend/controllers/perfil.Controller.js`**

```js
const db = require('../config/db');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { mensajeSeguro } = require('../utils/errorHandler');

const obtener = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.celular, u.foto,
              u.debe_cambiar_contrasena, r.nombre AS rol_nombre
       FROM usuario u
       LEFT JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ?`,
      [req.user.id_usuario]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[perfil.obtener]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al obtener el perfil') });
  }
};

const cambiarPassword = async (req, res) => {
  const { contrasena_actual, nueva_contrasena } = req.body ?? {};
  if (!contrasena_actual || !nueva_contrasena) {
    return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son obligatorias' });
  }
  if (String(nueva_contrasena).trim().length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const [rows] = await db.promise().query('SELECT contrasena FROM usuario WHERE id_usuario = ?', [req.user.id_usuario]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const coincide = await bcrypt.compare(String(contrasena_actual), rows[0].contrasena ?? '');
    if (!coincide) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(String(nueva_contrasena), 10);
    await db.promise().query(
      'UPDATE usuario SET contrasena = ?, debe_cambiar_contrasena = 0 WHERE id_usuario = ?',
      [hash, req.user.id_usuario]
    );
    return res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('[perfil.cambiarPassword]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al cambiar la contraseña') });
  }
};

const subirFoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  try {
    const [rows] = await db.promise().query('SELECT foto FROM usuario WHERE id_usuario = ?', [req.user.id_usuario]);
    const fotoAnterior = rows[0]?.foto;

    await db.promise().query('UPDATE usuario SET foto = ? WHERE id_usuario = ?', [req.file.filename, req.user.id_usuario]);

    if (fotoAnterior) {
      const rutaAnterior = path.join(__dirname, '..', 'uploads', fotoAnterior);
      if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
    }

    return res.json({ mensaje: 'Foto actualizada', foto: req.file.filename });
  } catch (err) {
    console.error('[perfil.subirFoto]', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al subir la foto') });
  }
};

module.exports = { obtener, cambiarPassword, subirFoto };
```

- [ ] **Step 4: Implementar `backend/routes/perfil.Routes.js`**

```js
const router = require('express').Router();
const path   = require('path');
const multer = require('multer');
const ctrl   = require('../controllers/perfil.Controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `usuario_${req.user.id_usuario}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Solo imágenes JPG, PNG o WebP'));
  },
});

router.use(authMiddleware);

router.get('/', ctrl.obtener);
router.patch('/password', ctrl.cambiarPassword);
router.patch('/foto', upload.single('foto'), ctrl.subirFoto);

module.exports = router;
```

- [ ] **Step 5: Montar la ruta en `backend/app.js`**

Ubicar (línea ~26):

```js
const configuracionRoutes = require('./routes/configuracion.Routes');
```

Agregar debajo:

```js
const perfilRoutes = require('./routes/perfil.Routes');
```

Ubicar (línea ~73):

```js
app.use('/api/configuracion', configuracionRoutes);
```

Agregar debajo:

```js
app.use('/api/perfil', perfilRoutes);
```

- [ ] **Step 6: Ejecutar el test y verificar que pasa**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/perfil.test.js --runInBand --forceExit
```

Expected: PASS — 6 tests verdes. (Si el entorno de test no tiene credenciales válidas para `authHeader()`, ver la nota en el Self-Review sobre verificación manual como alternativa — es una limitación preexistente de este entorno, no de este código.)

---

## Task 3: Extender `usuarios.Controller.js` y `auth.Controller.js`

**Files:**
- Modify: `backend/controllers/usuarios.Controller.js`
- Modify: `backend/controllers/auth.Controller.js`
- Test: `backend/tests/usuarios.debeCambiarContrasena.test.js`

**Interfaces:**
- Consumes: columna `usuario.debe_cambiar_contrasena` (Task 1).
- Produces (usado por Task 4, frontend): el objeto `usuario` de `POST /api/auth/login` incluye `foto` y `debe_cambiar_contrasena`.

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/tests/usuarios.debeCambiarContrasena.test.js`:

```js
const { app, request, authHeader } = require('./helpers');
const db = require('../config/db');

let headers;
let idUsuarioCreado;

beforeAll(async () => {
  headers = await authHeader();
});

afterAll((done) => {
  if (idUsuarioCreado) {
    db.query('DELETE FROM usuario WHERE id_usuario = ?', [idUsuarioCreado], () => done());
  } else {
    done();
  }
});

describe('debe_cambiar_contrasena', () => {
  test('crearUsuario deja debe_cambiar_contrasena = 1', async () => {
    const res = await request(app).post('/api/usuarios').set(headers).send({
      ci: `TEST-${Date.now()}`,
      nombre: 'Test',
      apellido: 'Plan',
      contrasena: 'temporal123',
      id_rol: 1,
    });
    expect([200, 201]).toContain(res.status);
    idUsuarioCreado = res.body.id_usuario;

    const [rows] = await db.promise().query('SELECT debe_cambiar_contrasena FROM usuario WHERE id_usuario = ?', [idUsuarioCreado]);
    expect(rows[0].debe_cambiar_contrasena).toBe(1);
  });

  test('resetearContrasena deja debe_cambiar_contrasena = 1', async () => {
    const res = await request(app).patch(`/api/usuarios/${idUsuarioCreado}/password`).set(headers).send({ nueva_contrasena: 'otraclave123' });
    expect(res.status).toBe(200);

    const [rows] = await db.promise().query('SELECT debe_cambiar_contrasena FROM usuario WHERE id_usuario = ?', [idUsuarioCreado]);
    expect(rows[0].debe_cambiar_contrasena).toBe(1);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/usuarios.debeCambiarContrasena.test.js --runInBand --forceExit
```

Expected: FAIL en ambos `expect(rows[0].debe_cambiar_contrasena).toBe(1)` (hoy queda en `0` por el `DEFAULT`).

- [ ] **Step 3: Extender `crearUsuario` en `backend/controllers/usuarios.Controller.js`**

Ubicar el `INSERT INTO usuario` (línea ~99-104):

```js
    const [result] = await db.promise().query(
      `INSERT INTO usuario
        (id_rol, id_sucursal, ci, nombre, apellido, celular, correo, contrasena, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idRolNum, Number.isFinite(idSucursalNum) ? idSucursalNum : null, ciTxt, nombreTxt, apellidoTxt, celularTxt, correoTxt, hash, activoNum]
    );
```

Reemplazar por:

```js
    const [result] = await db.promise().query(
      `INSERT INTO usuario
        (id_rol, id_sucursal, ci, nombre, apellido, celular, correo, contrasena, debe_cambiar_contrasena, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [idRolNum, Number.isFinite(idSucursalNum) ? idSucursalNum : null, ciTxt, nombreTxt, apellidoTxt, celularTxt, correoTxt, hash, activoNum]
    );
```

- [ ] **Step 4: Extender `resetearContrasena` en `backend/controllers/usuarios.Controller.js`**

Ubicar (línea ~306-307):

```js
    const hash = await bcrypt.hash(String(nueva_contrasena), 10);
    await db.promise().query('UPDATE usuario SET contrasena = ? WHERE id_usuario = ?', [hash, idUsuarioNum]);
```

Reemplazar por:

```js
    const hash = await bcrypt.hash(String(nueva_contrasena), 10);
    await db.promise().query('UPDATE usuario SET contrasena = ?, debe_cambiar_contrasena = 1 WHERE id_usuario = ?', [hash, idUsuarioNum]);
```

- [ ] **Step 5: Extender la respuesta de `login` en `backend/controllers/auth.Controller.js`**

Ubicar (línea ~118-131):

```js
        // ── 6. Responder ──────────────────────────────────────────────────
        return res.json({
          token,
          usuario: {
            id:               usuario.id_usuario,
            nombre:           usuario.nombre,
            apellido:         usuario.apellido,
            correo:           usuario.correo,
            celular:          usuario.celular,
            rol:              usuario.id_rol,
            id_sucursal:      usuario.id_sucursal,
            rol_nombre:       usuario.rol_nombre,
            permisos,                          
          },
        });
```

Reemplazar por (agrega `foto` y `debe_cambiar_contrasena`):

```js
        // ── 6. Responder ──────────────────────────────────────────────────
        return res.json({
          token,
          usuario: {
            id:                      usuario.id_usuario,
            nombre:                  usuario.nombre,
            apellido:                usuario.apellido,
            correo:                  usuario.correo,
            celular:                 usuario.celular,
            foto:                    usuario.foto,
            rol:                     usuario.id_rol,
            id_sucursal:             usuario.id_sucursal,
            rol_nombre:              usuario.rol_nombre,
            debe_cambiar_contrasena: !!usuario.debe_cambiar_contrasena,
            permisos,                          
          },
        });
```

`usuario.foto` y `usuario.debe_cambiar_contrasena` ya vienen en la fila porque el `SELECT` de `sqlUsuario` (línea ~55-60) usa `SELECT u.*`, que ya trae todas las columnas — no hace falta tocar esa query.

- [ ] **Step 6: Ejecutar el test y verificar que pasa**

```bash
cd backend
npx cross-env NODE_ENV=test jest tests/usuarios.debeCambiarContrasena.test.js --runInBand --forceExit
```

Expected: PASS — 2 tests verdes.

---

## Task 4: Servicio frontend + `AuthContext` + página `Perfil.jsx`

**Files:**
- Create: `frontend/src/services/perfil.service.js`
- Modify: `frontend/src/contexts/AuthContext.jsx`
- Create: `frontend/src/pages/perfil/Perfil.jsx`
- Modify: `frontend/src/App.jsx` (nueva ruta `/perfil`)

**Interfaces:**
- Consumes: endpoints de Task 2 (`GET /api/perfil`, `PATCH /api/perfil/password`, `PATCH /api/perfil/foto`).
- Produces (usado por Task 5): `useAuth().actualizarUsuario(patch)`, ruta `/perfil`.

- [ ] **Step 1: Crear `frontend/src/services/perfil.service.js`**

```js
import api from '../api/axios';

const perfilService = {
  obtener:         () => api.get('/perfil'),
  cambiarPassword: (data) => api.patch('/perfil/password', data),
  subirFoto:       (formData) => api.patch('/perfil/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export default perfilService;
```

- [ ] **Step 2: Agregar `actualizarUsuario` a `frontend/src/contexts/AuthContext.jsx`**

Ubicar (línea ~33-37):

```js
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);
```

Agregar justo debajo:

```js
  const actualizarUsuario = useCallback((patch) => {
    setUsuario((prev) => {
      if (!prev) return prev;
      const actualizado = { ...prev, ...patch };
      localStorage.setItem('usuario', JSON.stringify(actualizado));
      return actualizado;
    });
  }, []);
```

Ubicar (línea ~40):

```js
    <AuthContext.Provider value={{ usuario, login, logout, cargando, error }}>
```

Reemplazar por:

```js
    <AuthContext.Provider value={{ usuario, login, logout, actualizarUsuario, cargando, error }}>
```

- [ ] **Step 3: Verificar que compila**

```bash
curl -s -o /dev/null -w "AuthContext.jsx: %{http_code}\n" http://localhost:5173/src/contexts/AuthContext.jsx
```

Expected: `AuthContext.jsx: 200`, sin errores en el log del dev server de Vite.

- [ ] **Step 4: Crear `frontend/src/pages/perfil/Perfil.jsx`**

```jsx
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import perfilService from '../../services/perfil.service';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-xs sm:max-w-sm ${
      toast.tipo === 'ok'
        ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
    }`}>
      <span className="shrink-0">{toast.tipo === 'ok' ? '✅' : '⚠️'}</span>
      <span className="break-words">{toast.msg}</span>
    </div>
  );
}

export default function Perfil() {
  const { usuario, actualizarUsuario } = useAuth();
  const [searchParams] = useSearchParams();
  const obligatorio = searchParams.get('obligatorio') === '1';

  const [toast, setToast] = useState(null);
  const [preview, setPreview] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const inputRef = useRef(null);

  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    perfilService.obtener().catch(() => mostrarToast('error', 'Error al cargar el perfil'));
  }, []);

  const procesarArchivo = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      mostrarToast('error', 'Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      mostrarToast('error', 'La imagen no puede superar los 5 MB');
      return;
    }
    setArchivo(file);
    setPreview(URL.createObjectURL(file));
  };

  const guardarFoto = async () => {
    if (!archivo) return;
    setSubiendoFoto(true);
    try {
      const fd = new FormData();
      fd.append('foto', archivo);
      const res = await perfilService.subirFoto(fd);
      actualizarUsuario({ foto: res.data.foto });
      mostrarToast('ok', 'Foto actualizada');
      setArchivo(null);
      setPreview(null);
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const guardarPassword = async () => {
    if (!contrasenaActual || !nuevaContrasena) {
      mostrarToast('error', 'Completa la contraseña actual y la nueva');
      return;
    }
    if (nuevaContrasena.length < 6) {
      mostrarToast('error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      mostrarToast('error', 'La confirmación no coincide con la nueva contraseña');
      return;
    }
    setGuardandoPassword(true);
    try {
      await perfilService.cambiarPassword({ contrasena_actual: contrasenaActual, nueva_contrasena: nuevaContrasena });
      actualizarUsuario({ debe_cambiar_contrasena: false });
      mostrarToast('ok', 'Contraseña actualizada correctamente');
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setGuardandoPassword(false);
    }
  };

  const imagenMostrada = preview || (usuario?.foto ? `${API_BASE}/uploads/${usuario.foto}?v=${Date.now()}` : null);

  return (
    <PageWrapper>
      <Toast toast={toast} />
      <div className="max-w-2xl mx-auto space-y-6">
        {obligatorio && (
          <div className="p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl text-orange-800 dark:text-orange-300 text-sm font-semibold">
            ⚠️ Debes actualizar tu contraseña para continuar.
          </div>
        )}

        {!obligatorio && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Foto de perfil</h2>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center text-zinc-400">
                {imagenMostrada ? (
                  <img src={imagenMostrada} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold">{usuario?.nombre?.[0]}{usuario?.apellido?.[0]}</span>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => procesarArchivo(e.target.files[0])} />
                <button
                  onClick={() => inputRef.current?.click()}
                  className="self-start px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Elegir foto
                </button>
                {archivo && (
                  <button
                    onClick={guardarFoto}
                    disabled={subiendoFoto}
                    className="self-start px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {subiendoFoto ? 'Subiendo...' : 'Guardar foto'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Cambiar contraseña</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Contraseña actual</label>
              <input
                type="password"
                value={contrasenaActual}
                onChange={(e) => setContrasenaActual(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Nueva contraseña</label>
              <input
                type="password"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={guardarPassword}
              disabled={guardandoPassword}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
            >
              {guardandoPassword ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
```

- [ ] **Step 5: Agregar la ruta `/perfil` en `frontend/src/App.jsx`**

Ubicar el bloque de imports de páginas (línea ~38):

```js
import Configuracion  from './pages/configuracion/Configuracion';
```

Agregar debajo:

```js
import Perfil          from './pages/perfil/Perfil';
```

Ubicar el bloque de rutas de Dashboard (línea ~305-310):

```js
            {/* ── Dashboard ───────────────────────────────────────────── */}
            <Route path="/dashboard" element={
              <PageRoute>
                <Dashboard />
              </PageRoute>
            }/>
```

Agregar debajo (misma estructura, sin `action`/`subject` — solo requiere sesión):

```js

            {/* ── Perfil (autoservicio) ──────────────────────────────── */}
            <Route path="/perfil" element={
              <PageRoute>
                <Perfil />
              </PageRoute>
            }/>
```

- [ ] **Step 6: Verificar que compila**

```bash
curl -s -o /dev/null -w "Perfil.jsx: %{http_code}\n" http://localhost:5173/src/pages/perfil/Perfil.jsx
curl -s -o /dev/null -w "App.jsx: %{http_code}\n" http://localhost:5173/src/App.jsx
```

Expected: ambos `200`, sin errores en el log del dev server de Vite.

---

## Task 5: `Topbar.jsx` (link a Perfil) + gate obligatorio en `ProtectedRoute.jsx`

**Files:**
- Modify: `frontend/src/components/Topbar.jsx`
- Modify: `frontend/src/components/ProtectedRoute.jsx`

**Interfaces:**
- Consumes: `usuario.foto`, `usuario.debe_cambiar_contrasena` (Task 3), ruta `/perfil` (Task 4).
- Produces: nada consumido por otras tareas — es la última.

- [ ] **Step 1: Convertir el círculo de iniciales en link a `/perfil` en `Topbar.jsx`**

Ubicar el import de `useNavigate` (línea 2):

```js
import { useNavigate } from 'react-router-dom';
```

Reemplazar por:

```js
import { useNavigate, Link } from 'react-router-dom';
```

Ubicar (línea ~81-84):

```js
      <div className="w-9 h-9 rounded-full bg-yellow-400 text-zinc-900
                      flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
        {iniciales}
      </div>
```

Reemplazar por:

```js
      <Link
        to="/perfil"
        title="Mi perfil"
        className="w-9 h-9 rounded-full bg-yellow-400 text-zinc-900
                      flex items-center justify-center text-xs font-bold shrink-0 shadow-sm
                      overflow-hidden hover:opacity-90 transition-opacity"
      >
        {usuario?.foto ? (
          <img
            src={`${import.meta.env.VITE_API_URL.replace('/api', '')}/uploads/${usuario.foto}`}
            alt="Mi perfil"
            className="w-full h-full object-cover"
          />
        ) : (
          iniciales
        )}
      </Link>
```

- [ ] **Step 2: Verificar que compila**

```bash
curl -s -o /dev/null -w "Topbar.jsx: %{http_code}\n" http://localhost:5173/src/components/Topbar.jsx
```

Expected: `Topbar.jsx: 200`, sin errores en el log del dev server.

- [ ] **Step 3: Agregar el gate obligatorio en `ProtectedRoute.jsx`**

Ubicar (línea ~28-32):

```js
  // ── 1. No autenticado → redirigir al login ────────────────────────────
  // Guardamos la ruta actual para redirigir de vuelta tras el login
  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
```

Agregar justo debajo:

```js

  // ── 1.5. Debe cambiar contraseña → bloquear cualquier otra ruta ───────
  if (usuario.debe_cambiar_contrasena && location.pathname !== '/perfil') {
    return <Navigate to="/perfil?obligatorio=1" replace />;
  }
```

- [ ] **Step 4: Verificar que compila**

```bash
curl -s -o /dev/null -w "ProtectedRoute.jsx: %{http_code}\n" http://localhost:5173/src/components/ProtectedRoute.jsx
```

Expected: `ProtectedRoute.jsx: 200`, sin errores en el log del dev server.

- [ ] **Step 5: Verificación manual en el navegador**

1. Como admin, ir a Usuarios → "Resetear clave" de un usuario de prueba (o crear uno nuevo).
2. Cerrar sesión, iniciar sesión con ese usuario y la clave nueva/temporal.
3. Confirmar que cualquier intento de navegar (ej. a `/productos`) redirige a `/perfil?obligatorio=1` mostrando solo el banner + formulario de contraseña (sin la card de foto).
4. Cambiar la contraseña con éxito → confirmar que ahora sí puede navegar libremente a otros módulos.
5. Entrar de nuevo a `/perfil` sin el query param → confirmar que ahora sí se ve la card de foto, subir una imagen y confirmar que el círculo del Topbar la muestra.

---

## Self-Review (completado durante la escritura del plan)

**Cobertura del spec:**
- DB (`usuario.foto`, `usuario.debe_cambiar_contrasena`) → Task 1. ✅
- Módulo `perfil.Controller.js`/`perfil.Routes.js` (GET perfil, cambiar password, subir foto) → Task 2. ✅
- `usuarios.Controller.js` activa el flag en reset y en creación; `auth.Controller.js` expone `foto`/`debe_cambiar_contrasena` en login → Task 3. ✅
- Servicio frontend, `AuthContext.actualizarUsuario`, página `Perfil.jsx` (foto + contraseña, banner obligatorio) → Task 4. ✅
- Link del Topbar a `/perfil`, gate obligatorio en `ProtectedRoute.jsx` → Task 5. ✅
- Fuera de alcance (editar nombre/correo/etc. desde Perfil, historial de contraseñas, verificación por correo/SMS) → ninguna tarea lo implementa. ✅

**Placeholders:** ninguno — todos los pasos incluyen código completo.

**Consistencia de tipos/nombres:** `foto`/`debe_cambiar_contrasena` (mismos nombres en DB, backend y frontend), `perfilService.obtener/cambiarPassword/subirFoto` (definidos en Task 4, usados en Task 4 mismo — Task 5 no los llama directamente), `actualizarUsuario` (definido en Task 4 Step 2, usado en `Perfil.jsx` Task 4 Step 4), `usuario.debe_cambiar_contrasena` (consumido en `ProtectedRoute.jsx` Task 5, producido en login Task 3).

**Nota sobre verificación automatizada:** igual que en el plan anterior de esta sesión (QR Banco), el entorno de desarrollo actual tiene un desajuste preexistente entre `TEST_USER`/`TEST_PASSWORD` (usados por `backend/tests/helpers.js:authHeader()`) y la contraseña real del admin en la BD de desarrollo — esto hace que **todos** los tests que dependen de `authHeader()` fallen en este entorno, no solo los de este plan. Si el ejecutor de este plan encuentra el mismo problema, no debe intentar resetear la contraseña del admin sin permiso explícito; debe usar el Step 5 de verificación manual de la Task 5 (y curls equivalentes para las Tasks 2-3) como alternativa, y reportarlo igual que se hizo antes.
