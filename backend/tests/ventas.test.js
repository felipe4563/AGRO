const { app, request, authHeader } = require('./helpers');

const BASE = '/api/ventas';
let headers;
let ventaCreadaId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Ventas - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe('Ventas - Con token', () => {
  test('GET / → 200 y array', async () => {
    const res = await request(app).get(BASE).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST / → crea venta', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({
        id_cliente:  1,
        id_sucursal: 1,
        observacion: 'Venta de prueba Jest',
        detalles: [
          {
            id_lote:        1,
            cantidad:       1,
            precio_unitario: 10.5,
          }
        ],
      });
    expect([200, 201]).toContain(res.status);
    ventaCreadaId = res.body.id_venta ?? res.body.id ?? res.body.insertId;
  });

  test('POST / → 400 si no hay detalles', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({ id_cliente: 1, id_sucursal: 1, detalles: [] });
    expect([400, 422]).toContain(res.status);
  });

  test('GET /:id → 200 con venta existente', async () => {
    if (!ventaCreadaId) return;
    const res = await request(app).get(`${BASE}/${ventaCreadaId}`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id_venta');
  });

  test('PATCH /:id/anular → anula venta', async () => {
    if (!ventaCreadaId) return;
    const res = await request(app)
      .patch(`${BASE}/${ventaCreadaId}/anular`)
      .set(headers)
      .send({ motivo: 'Anulación de prueba Jest' });
    expect([200, 204]).toContain(res.status);
  });

  test('GET /:id → 404 con id inexistente', async () => {
    const res = await request(app).get(`${BASE}/999999`).set(headers);
    expect([404, 400]).toContain(res.status);
  });
});
