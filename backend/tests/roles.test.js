const { app, request, authHeader } = require('./helpers');

const BASE = '/api/roles';
let headers;
let rolCreadoId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Roles - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
  test('POST / → 401', async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(401);
  });
});

describe('Roles - Con token', () => {
  test('GET /permisos → 200 y array de permisos', async () => {
    const res = await request(app).get(`${BASE}/permisos`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET / → 200 y array de roles', async () => {
    const res = await request(app).get(BASE).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST / → crea rol', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({ nombre: 'ROL_TEST_JEST', descripcion: 'Rol de prueba Jest' });
    expect([200, 201]).toContain(res.status);
    if (res.status === 201 || res.status === 200) {
      rolCreadoId = res.body.id_rol ?? res.body.id ?? res.body.insertId;
    }
  });

  test('POST / → 400 si falta nombre', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({ descripcion: 'Sin nombre' });
    expect([400, 422]).toContain(res.status);
  });

  test('GET /:id → 200 con rol existente', async () => {
    if (!rolCreadoId) return;
    const res = await request(app).get(`${BASE}/${rolCreadoId}`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id_rol');
  });

  test('PUT /:id → edita rol', async () => {
    if (!rolCreadoId) return;
    const res = await request(app)
      .put(`${BASE}/${rolCreadoId}`)
      .set(headers)
      .send({ nombre: 'ROL_TEST_JEST_EDITADO', descripcion: 'Editado' });
    expect([200, 204]).toContain(res.status);
  });

  test('DELETE /:id → elimina rol creado', async () => {
    if (!rolCreadoId) return;
    const res = await request(app).delete(`${BASE}/${rolCreadoId}`).set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('GET /:id → 404 con id inexistente', async () => {
    const res = await request(app).get(`${BASE}/999999`).set(headers);
    expect([404, 400]).toContain(res.status);
  });
});
