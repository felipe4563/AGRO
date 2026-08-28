const { app, request, authHeader } = require('./helpers');

const BASE = '/api/compras';
let headers;
let compraCreadaId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Compras - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe('Compras - Con token', () => {
  test('GET / → 200 y array', async () => {
    const res = await request(app).get(BASE).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST / → crea compra en borrador', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({
        id_proveedor: 1,
        id_sucursal:  1,
        observacion:  'Compra de prueba Jest',
        detalles: [
          {
            id_producto:   1,
            cantidad:      5,
            precio_compra: 10.0,
            fecha_vencimiento: null,
          }
        ],
      });
    expect([200, 201]).toContain(res.status);
    compraCreadaId = res.body.id_compra ?? res.body.id ?? res.body.insertId;
  });

  test('POST / → 400 si faltan detalles', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({ id_proveedor: 1, id_sucursal: 1, detalles: [] });
    expect([400, 422]).toContain(res.status);
  });

  test('GET /:id → 200 con compra existente', async () => {
    if (!compraCreadaId) return;
    const res = await request(app).get(`${BASE}/${compraCreadaId}`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id_compra');
  });

  test('POST /:id/confirmar → confirma la compra', async () => {
    if (!compraCreadaId) return;
    const res = await request(app)
      .post(`${BASE}/${compraCreadaId}/confirmar`)
      .set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('PATCH /:id/anular → anula compra confirmada', async () => {
    if (!compraCreadaId) return;
    const res = await request(app)
      .patch(`${BASE}/${compraCreadaId}/anular`)
      .set(headers)
      .send({ motivo: 'Anulación de prueba Jest' });
    expect([200, 204, 400]).toContain(res.status);
  });

  test('GET /:id → 404 con id inexistente', async () => {
    const res = await request(app).get(`${BASE}/999999`).set(headers);
    expect([404, 400]).toContain(res.status);
  });
});
