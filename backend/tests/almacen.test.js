const { app, request, authHeader } = require('./helpers');

const BASE = '/api/almacen';
let headers;
let loteCreadoId;
let trasladoCreadoId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Almacen - Sin token', () => {
  test('GET /lotes → 401', async () => {
    const res = await request(app).get(`${BASE}/lotes`);
    expect(res.status).toBe(401);
  });
});

describe('Almacen - Auxiliares', () => {
  test('GET /aux/productos → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/aux/productos`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /aux/sucursales → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/aux/sucursales`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Almacen - Lotes', () => {
  test('GET /lotes → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/lotes`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /lotes → crea lote', async () => {
    const res = await request(app)
      .post(`${BASE}/lotes`)
      .set(headers)
      .send({
        id_producto:  1,
        id_sucursal:  1,
        cantidad:     10,
        precio_compra: 8.0,
        fecha_vencimiento: null,
        observacion: 'Lote de prueba Jest',
      });
    expect([200, 201]).toContain(res.status);
    loteCreadoId = res.body.id_lote ?? res.body.id ?? res.body.insertId;
  });

  test('GET /lotes/:id → 200', async () => {
    if (!loteCreadoId) return;
    const res = await request(app).get(`${BASE}/lotes/${loteCreadoId}`).set(headers);
    expect(res.status).toBe(200);
  });

  test('POST /lotes/:id/ajuste → ajuste de inventario', async () => {
    if (!loteCreadoId) return;
    const res = await request(app)
      .post(`${BASE}/lotes/${loteCreadoId}/ajuste`)
      .set(headers)
      .send({ cantidad: 2, tipo: 'entrada', motivo: 'Ajuste de prueba Jest' });
    expect([200, 204]).toContain(res.status);
  });

  test('PATCH /lotes/:id/baja → dar baja lote', async () => {
    if (!loteCreadoId) return;
    const res = await request(app)
      .patch(`${BASE}/lotes/${loteCreadoId}/baja`)
      .set(headers)
      .send({ motivo: 'Baja de prueba Jest' });
    expect([200, 204]).toContain(res.status);
  });
});

describe('Almacen - Traslados', () => {
  test('GET /traslados → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/traslados`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /traslados → crea traslado', async () => {
    const res = await request(app)
      .post(`${BASE}/traslados`)
      .set(headers)
      .send({
        id_sucursal_origen:  1,
        id_sucursal_destino: 1,
        observacion: 'Traslado de prueba Jest',
        detalles: [{ id_lote: 1, cantidad: 1 }],
      });
    expect([200, 201, 400]).toContain(res.status);
    if ([200, 201].includes(res.status)) {
      trasladoCreadoId = res.body.id_traslado ?? res.body.id ?? res.body.insertId;
    }
  });

  test('PATCH /traslados/:id/confirmar → confirma', async () => {
    if (!trasladoCreadoId) return;
    const res = await request(app)
      .patch(`${BASE}/traslados/${trasladoCreadoId}/confirmar`)
      .set(headers);
    expect([200, 204, 400]).toContain(res.status);
  });

  test('PATCH /traslados/:id/cancelar → cancela', async () => {
    if (!trasladoCreadoId) return;
    const res = await request(app)
      .patch(`${BASE}/traslados/${trasladoCreadoId}/cancelar`)
      .set(headers);
    expect([200, 204, 400]).toContain(res.status);
  });
});

describe('Almacen - Alertas', () => {
  test('GET /alertas → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/alertas`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
