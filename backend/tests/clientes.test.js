const { app, request, authHeader } = require('./helpers');

const BASE = '/api/clientes';
let headers;
let clienteCreadoId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Clientes - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe('Clientes - Con token', () => {
  test('GET / → 200 y array', async () => {
    const res = await request(app).get(BASE).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST / → crea cliente', async () => {
    const ts = Date.now();
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({
        nombre:   `CLI_TEST_${ts}`,
        apellido: 'Jest',
        ci:       `CI_CLI_${ts}`,
        telefono: '70000002',
        correo:   `cli_${ts}@test.com`,
        direccion: 'Calle Test 456',
      });
    expect([200, 201]).toContain(res.status);
    clienteCreadoId = res.body.id_cliente ?? res.body.id ?? res.body.insertId;
  });

  test('POST / → 400 si falta nombre', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({ telefono: '70000000' });
    expect([400, 422]).toContain(res.status);
  });

  test('GET /:id → 200 con cliente existente', async () => {
    if (!clienteCreadoId) return;
    const res = await request(app).get(`${BASE}/${clienteCreadoId}`).set(headers);
    expect(res.status).toBe(200);
  });

  test('PUT /:id → edita cliente', async () => {
    if (!clienteCreadoId) return;
    const res = await request(app)
      .put(`${BASE}/${clienteCreadoId}`)
      .set(headers)
      .send({ nombre: 'CLI_EDITADO', apellido: 'JestEditado', telefono: '71111112' });
    expect([200, 204]).toContain(res.status);
  });

  test('GET /:id/historial → historial de compras del cliente', async () => {
    if (!clienteCreadoId) return;
    const res = await request(app).get(`${BASE}/${clienteCreadoId}/historial`).set(headers);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.body)).toBe(true);
  });

  test('PATCH /:id/activo → toggle activo', async () => {
    if (!clienteCreadoId) return;
    const res = await request(app)
      .patch(`${BASE}/${clienteCreadoId}/activo`)
      .set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('DELETE /:id → elimina cliente', async () => {
    if (!clienteCreadoId) return;
    const res = await request(app).delete(`${BASE}/${clienteCreadoId}`).set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('GET /:id → 404 con id inexistente', async () => {
    const res = await request(app).get(`${BASE}/999999`).set(headers);
    expect([404, 400]).toContain(res.status);
  });
});
