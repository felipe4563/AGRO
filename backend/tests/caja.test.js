const { app, request, authHeader } = require('./helpers');

const BASE = '/api/caja';
let headers;
let cajaCreadaId;
let turnoActivo;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Caja - Sin token', () => {
  test('GET /cajas → 401', async () => {
    const res = await request(app).get(`${BASE}/cajas`);
    expect(res.status).toBe(401);
  });
});

describe('Caja - Gestión de cajas', () => {
  test('GET /cajas → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/cajas`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /cajas → crea caja', async () => {
    const res = await request(app)
      .post(`${BASE}/cajas`)
      .set(headers)
      .send({
        nombre:      `CAJA_TEST_${Date.now()}`,
        id_sucursal: 1,
      });
    expect([200, 201]).toContain(res.status);
    cajaCreadaId = res.body.id_caja ?? res.body.id ?? res.body.insertId;
  });

  test('PUT /cajas/:id → edita caja', async () => {
    if (!cajaCreadaId) return;
    const res = await request(app)
      .put(`${BASE}/cajas/${cajaCreadaId}`)
      .set(headers)
      .send({ nombre: 'CAJA_TEST_EDITADA' });
    expect([200, 204]).toContain(res.status);
  });

  test('PATCH /cajas/:id/toggle → toggle activo', async () => {
    if (!cajaCreadaId) return;
    const res = await request(app)
      .patch(`${BASE}/cajas/${cajaCreadaId}/toggle`)
      .set(headers);
    expect([200, 204]).toContain(res.status);
  });
});

describe('Caja - Turnos', () => {
  test('GET /turnos → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/turnos`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /turno-activo → 200 o 404 (sin turno activo)', async () => {
    const res = await request(app).get(`${BASE}/turno-activo`).set(headers);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      turnoActivo = res.body.id_turno ?? res.body.id;
    }
  });

  test('POST /abrir → abre turno de caja', async () => {
    if (!cajaCreadaId) return;
    const res = await request(app)
      .post(`${BASE}/abrir`)
      .set(headers)
      .send({
        id_caja:        cajaCreadaId,
        monto_apertura: 100.0,
        observacion:    'Apertura de prueba Jest',
      });
    // 200=ok, 400=ya hay turno activo
    expect([200, 201, 400]).toContain(res.status);
    if ([200, 201].includes(res.status)) {
      turnoActivo = res.body.id_turno ?? res.body.id;
    }
  });

  test('PATCH /:id/cerrar → cierra turno', async () => {
    if (!turnoActivo) return;
    const res = await request(app)
      .patch(`${BASE}/${turnoActivo}/cerrar`)
      .set(headers)
      .send({
        monto_cierre: 100.0,
        observacion:  'Cierre de prueba Jest',
      });
    expect([200, 204, 400]).toContain(res.status);
  });
});
