const { app, request, authHeader } = require('./helpers');

const BASE = '/api/sucursales';
let headers;
let sucursalCreadaId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Sucursales - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe('Sucursales - Con token', () => {
  test('GET / → 200 y array', async () => {
    const res = await request(app).get(BASE).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST / → crea sucursal', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({
        nombre:    `TEST_SUC_${Date.now()}`,
        direccion: 'Calle Test 123',
        telefono:  '70000001',
      });
    expect([200, 201]).toContain(res.status);
    sucursalCreadaId = res.body.id_sucursal ?? res.body.id ?? res.body.insertId;
  });

  test('POST / → 400 si falta nombre', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({ direccion: 'Sin nombre' });
    expect([400, 422]).toContain(res.status);
  });

  test('PUT /:id → edita sucursal', async () => {
    if (!sucursalCreadaId) return;
    const res = await request(app)
      .put(`${BASE}/${sucursalCreadaId}`)
      .set(headers)
      .send({ nombre: 'SUC_TEST_EDITADA', direccion: 'Nueva dirección', telefono: '72222222' });
    expect([200, 204]).toContain(res.status);
  });

  test('PATCH /:id/activo → toggle activo', async () => {
    if (!sucursalCreadaId) return;
    const res = await request(app)
      .patch(`${BASE}/${sucursalCreadaId}/activo`)
      .set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('DELETE /:id → elimina sucursal', async () => {
    if (!sucursalCreadaId) return;
    const res = await request(app).delete(`${BASE}/${sucursalCreadaId}`).set(headers);
    expect([200, 204]).toContain(res.status);
  });
});
