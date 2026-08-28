const { app, request, authHeader } = require('./helpers');

let headers;
beforeAll(async () => { headers = await authHeader(); });

describe('GET /api/clientes/buscar-persona/:codigo', () => {
  test('sin token → 401', async () => {
    const res = await request(app).get('/api/clientes/buscar-persona/123');
    expect(res.status).toBe(401);
  });

  test('con token, código inexistente → 404, 502 o 403', async () => {
    const res = await request(app).get('/api/clientes/buscar-persona/codigo-inexistente-xyz').set(headers);
    expect([404, 502, 403]).toContain(res.status);
  });
});
