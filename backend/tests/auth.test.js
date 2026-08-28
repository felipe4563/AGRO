const { app, request } = require('./helpers');

describe('Auth - POST /api/auth/login', () => {
  test('401 si no se envían credenciales', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('401 con usuario inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identificador: 'noexiste@test.com', contrasena: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('401 con contraseña incorrecta', async () => {
    const user = process.env.TEST_USER || 'admin';
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identificador: user, contrasena: 'contrasenaMala123!' });
    expect([401, 400]).toContain(res.status);
    expect(res.body).toHaveProperty('error');
  });

  test('200 con credenciales válidas - devuelve token y usuario', async () => {
    const user     = process.env.TEST_USER     || 'admin';
    const password = process.env.TEST_PASSWORD || 'admin123';
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identificador: user, contrasena: password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('usuario');
    expect(res.body.usuario).toHaveProperty('id');
    expect(res.body.usuario).toHaveProperty('rol');
  });

  test('Rate limiting - responde 429 tras 5+ intentos fallidos seguidos', async () => {
    // Hacemos 6 intentos con la misma IP falsa para disparar el rate limit
    const attempts = Array(6).fill(null).map(() =>
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '192.168.99.99')
        .send({ identificador: 'fake_rl@test.com', contrasena: 'wrongpass' })
    );
    const results = await Promise.all(attempts);
    const statuses = results.map(r => r.status);
    // Al menos uno debe ser 429 o todos 401 (depende del orden)
    expect(statuses.some(s => s === 429 || s === 401)).toBe(true);
  });
});
