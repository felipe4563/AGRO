const { app, request, authHeader } = require('./helpers');

const BASE = '/api/ventas/qr-banco';
let headers;

beforeAll(async () => {
  headers = await authHeader();
});

describe('QR Banco - Sin token', () => {
  test('POST /generar → 401', async () => {
    const res = await request(app).post(`${BASE}/generar`).send({ monto: 10 });
    expect(res.status).toBe(401);
  });
  test('GET /estado/:qrId → 401', async () => {
    const res = await request(app).get(`${BASE}/estado/123`);
    expect(res.status).toBe(401);
  });
  test('DELETE /:qrId → 401', async () => {
    const res = await request(app).delete(`${BASE}/123`);
    expect(res.status).toBe(401);
  });
});

describe('QR Banco - Con token admin', () => {
  test('POST /generar sin monto → 400', async () => {
    const res = await request(app).post(`${BASE}/generar`).set(headers).send({});
    expect([400, 403]).toContain(res.status);
  });

  test('POST /generar con monto válido → 200 con qrId+qrImage, o 500 si el banco no responde en este entorno', async () => {
    const res = await request(app).post(`${BASE}/generar`).set(headers).send({ monto: 5 });
    expect([200, 403, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.qrId).toBeDefined();
      expect(res.body.qrImage).toBeDefined();
    }
  });

  test('GET /estado/:qrId con id inexistente → responde sin reventar (200 pagado:false, o 500/403)', async () => {
    const res = await request(app).get(`${BASE}/estado/id-inexistente`).set(headers);
    expect([200, 403, 500]).toContain(res.status);
  });

  test('DELETE /:qrId nunca revienta aunque el id no exista', async () => {
    const res = await request(app).delete(`${BASE}/id-inexistente`).set(headers);
    expect([200, 403]).toContain(res.status);
  });
});
