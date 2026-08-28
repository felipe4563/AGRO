const { app, request, authHeader } = require('./helpers');

const BASE = '/api/productos';
let headers;
let productoCreadoId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Productos - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe('Productos - Con token', () => {
  test('GET / → 200 y array', async () => {
    const res = await request(app).get(BASE).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST / → crea producto', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({
        nombre:          `PROD_TEST_${Date.now()}`,
        descripcion:     'Producto de prueba Jest',
        codigo_barras:   `CB${Date.now()}`,
        precio_venta:    10.5,
        precio_compra:   7.0,
        stock_minimo:    5,
        id_clasificacion: 1,
        id_marca:        1,
        id_unidad:       1,
      });
    expect([200, 201]).toContain(res.status);
    productoCreadoId = res.body.id_producto ?? res.body.id ?? res.body.insertId;
  });

  test('POST / → 400 si falta nombre', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({ precio_venta: 5.0 });
    expect([400, 422]).toContain(res.status);
  });

  test('PUT /:id → edita producto', async () => {
    if (!productoCreadoId) return;
    const res = await request(app)
      .put(`${BASE}/${productoCreadoId}`)
      .set(headers)
      .send({ nombre: 'PROD_TEST_EDITADO', precio_venta: 12.0, precio_compra: 8.0, stock_minimo: 3 });
    expect([200, 204]).toContain(res.status);
  });

  test('PATCH /:id/activo → toggle activo', async () => {
    if (!productoCreadoId) return;
    const res = await request(app)
      .patch(`${BASE}/${productoCreadoId}/activo`)
      .set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('DELETE /:id → elimina producto', async () => {
    if (!productoCreadoId) return;
    const res = await request(app).delete(`${BASE}/${productoCreadoId}`).set(headers);
    expect([200, 204]).toContain(res.status);
  });
});
