const { app, request, authHeader } = require('./helpers');

const BASE = '/api/proveedores';
let headers;
let proveedorCreadoId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Proveedores - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe('Proveedores - Con token', () => {
  test('GET / → 200 y array', async () => {
    const res = await request(app).get(BASE).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST / → crea proveedor', async () => {
    const ts = Date.now();
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({
        nombre:    `PROV_TEST_${ts}`,
        telefono:  '70000003',
        correo:    `prov_${ts}@test.com`,
        direccion: 'Av. Proveedor 789',
        nit:       `NIT_${ts}`,
      });
    expect([200, 201]).toContain(res.status);
    proveedorCreadoId = res.body.id_proveedor ?? res.body.id ?? res.body.insertId;
  });

  test('POST / → 400 si falta nombre', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({ telefono: '70000000' });
    expect([400, 422]).toContain(res.status);
  });

  test('GET /:id → 200 con proveedor existente', async () => {
    if (!proveedorCreadoId) return;
    const res = await request(app).get(`${BASE}/${proveedorCreadoId}`).set(headers);
    expect(res.status).toBe(200);
  });

  test('PUT /:id → edita proveedor', async () => {
    if (!proveedorCreadoId) return;
    const res = await request(app)
      .put(`${BASE}/${proveedorCreadoId}`)
      .set(headers)
      .send({ nombre: 'PROV_EDITADO', telefono: '72222223' });
    expect([200, 204]).toContain(res.status);
  });

  test('PATCH /:id/activo → toggle activo', async () => {
    if (!proveedorCreadoId) return;
    const res = await request(app)
      .patch(`${BASE}/${proveedorCreadoId}/activo`)
      .set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('DELETE /:id → elimina proveedor', async () => {
    if (!proveedorCreadoId) return;
    const res = await request(app).delete(`${BASE}/${proveedorCreadoId}`).set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('GET /:id → 404 con id inexistente', async () => {
    const res = await request(app).get(`${BASE}/999999`).set(headers);
    expect([404, 400]).toContain(res.status);
  });
});
