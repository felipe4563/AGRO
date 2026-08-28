const { app, request, authHeader } = require('./helpers');

let headers;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Perfil - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get('/api/perfil');
    expect(res.status).toBe(401);
  });
  test('PATCH /password → 401', async () => {
    const res = await request(app).patch('/api/perfil/password').send({});
    expect(res.status).toBe(401);
  });
});

describe('Perfil - Con token', () => {
  test('GET / devuelve el perfil propio', async () => {
    const res = await request(app).get('/api/perfil').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.id_usuario).toBeDefined();
    expect(res.body).toHaveProperty('debe_cambiar_contrasena');
  });

  test('PATCH /password sin contrasena_actual → 400', async () => {
    const res = await request(app).patch('/api/perfil/password').set(headers).send({ nueva_contrasena: 'nueva123' });
    expect(res.status).toBe(400);
  });

  test('PATCH /password con nueva_contrasena corta → 400', async () => {
    const res = await request(app).patch('/api/perfil/password').set(headers).send({ contrasena_actual: 'x', nueva_contrasena: '123' });
    expect(res.status).toBe(400);
  });

  test('PATCH /password con contrasena_actual incorrecta → 401', async () => {
    const res = await request(app).patch('/api/perfil/password').set(headers).send({ contrasena_actual: 'clave-incorrecta-xyz', nueva_contrasena: 'nueva123' });
    expect(res.status).toBe(401);
  });
});
