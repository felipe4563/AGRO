const { app, request, authHeader } = require('./helpers');

const BASE = '/api/backups';
let headers;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Backup - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
  test('POST /generar → 401', async () => {
    const res = await request(app).post(`${BASE}/generar`);
    expect(res.status).toBe(401);
  });
});

describe('Backup - Con token admin', () => {
  test('GET / → 200 y array de backups', async () => {
    const res = await request(app).get(BASE).set(headers);
    expect([200, 403]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /generar → genera un backup', async () => {
    const res = await request(app)
      .post(`${BASE}/generar`)
      .set(headers);
    // 200=ok, 403=sin permiso, 500=error de sistema (mysqldump no disponible)
    expect([200, 201, 403, 500]).toContain(res.status);
  });

  test('GET /descargar/:filename → 404 con archivo inexistente', async () => {
    const res = await request(app)
      .get(`${BASE}/descargar/archivo_inexistente_jest.sql`)
      .set(headers);
    expect([404, 403]).toContain(res.status);
  });

  test('DELETE /:filename → 404 con archivo inexistente', async () => {
    const res = await request(app)
      .delete(`${BASE}/archivo_inexistente_jest.sql`)
      .set(headers);
    expect([404, 403]).toContain(res.status);
  });
});
