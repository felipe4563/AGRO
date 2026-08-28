const { app, request, authHeader } = require('./helpers');

const BASE = '/api/catalogos';
let headers;
let clasificacionId;
let marcaId;
let unidadId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Catalogos - Sin token', () => {
  test('GET /clasificaciones → 401', async () => {
    const res = await request(app).get(`${BASE}/clasificaciones`);
    expect(res.status).toBe(401);
  });
});

describe('Clasificaciones', () => {
  test('GET /clasificaciones → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/clasificaciones`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /clasificaciones → crea', async () => {
    const res = await request(app)
      .post(`${BASE}/clasificaciones`)
      .set(headers)
      .send({ nombre: `CLASIF_TEST_${Date.now()}`, descripcion: 'Test' });
    expect([200, 201]).toContain(res.status);
    clasificacionId = res.body.id_clasificacion ?? res.body.id ?? res.body.insertId;
  });

  test('PUT /clasificaciones/:id → edita', async () => {
    if (!clasificacionId) return;
    const res = await request(app)
      .put(`${BASE}/clasificaciones/${clasificacionId}`)
      .set(headers)
      .send({ nombre: 'CLASIF_EDITADA', descripcion: 'Editada' });
    expect([200, 204]).toContain(res.status);
  });

  test('PATCH /clasificaciones/:id/activo → toggle', async () => {
    if (!clasificacionId) return;
    const res = await request(app)
      .patch(`${BASE}/clasificaciones/${clasificacionId}/activo`)
      .set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('DELETE /clasificaciones/:id → elimina', async () => {
    if (!clasificacionId) return;
    const res = await request(app).delete(`${BASE}/clasificaciones/${clasificacionId}`).set(headers);
    expect([200, 204]).toContain(res.status);
  });
});

describe('Marcas', () => {
  test('GET /marcas → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/marcas`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /marcas → crea', async () => {
    const res = await request(app)
      .post(`${BASE}/marcas`)
      .set(headers)
      .send({ nombre: `MARCA_TEST_${Date.now()}` });
    expect([200, 201]).toContain(res.status);
    marcaId = res.body.id_marca ?? res.body.id ?? res.body.insertId;
  });

  test('PUT /marcas/:id → edita', async () => {
    if (!marcaId) return;
    const res = await request(app)
      .put(`${BASE}/marcas/${marcaId}`)
      .set(headers)
      .send({ nombre: 'MARCA_EDITADA' });
    expect([200, 204]).toContain(res.status);
  });

  test('DELETE /marcas/:id → elimina', async () => {
    if (!marcaId) return;
    const res = await request(app).delete(`${BASE}/marcas/${marcaId}`).set(headers);
    expect([200, 204]).toContain(res.status);
  });
});

describe('Unidades', () => {
  test('GET /unidades → 200 y array', async () => {
    const res = await request(app).get(`${BASE}/unidades`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /unidades → crea', async () => {
    const res = await request(app)
      .post(`${BASE}/unidades`)
      .set(headers)
      .send({ nombre: `UNID_TEST_${Date.now()}`, abreviatura: 'UT' });
    expect([200, 201]).toContain(res.status);
    unidadId = res.body.id_unidad ?? res.body.id ?? res.body.insertId;
  });

  test('PUT /unidades/:id → edita', async () => {
    if (!unidadId) return;
    const res = await request(app)
      .put(`${BASE}/unidades/${unidadId}`)
      .set(headers)
      .send({ nombre: 'UNID_EDITADA', abreviatura: 'UE' });
    expect([200, 204]).toContain(res.status);
  });

  test('DELETE /unidades/:id → elimina', async () => {
    if (!unidadId) return;
    const res = await request(app).delete(`${BASE}/unidades/${unidadId}`).set(headers);
    expect([200, 204]).toContain(res.status);
  });
});
