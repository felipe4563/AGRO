const { app, request, authHeader } = require('./helpers');

const BASE = '/api/usuarios';
let headers;
let usuarioCreadoId;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Usuarios - Sin token', () => {
  test('GET / → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe('Usuarios - Con token', () => {
  test('GET / → 200 y array', async () => {
    const res = await request(app).get(BASE).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST / → crea usuario', async () => {
    const timestamp = Date.now();
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({
        nombre:     'TestJest',
        apellido:   'Usuario',
        correo:     `testjest_${timestamp}@test.com`,
        ci:         `CI_TEST_${timestamp}`,
        celular:    '70000000',
        contrasena: 'Clave1234!',
        id_rol:     1,
        id_sucursal: 1,
      });
    expect([200, 201]).toContain(res.status);
    usuarioCreadoId = res.body.id_usuario ?? res.body.id ?? res.body.insertId;
  });

  test('POST / → 400 si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post(BASE)
      .set(headers)
      .send({ nombre: 'SoloNombre' });
    expect([400, 422]).toContain(res.status);
  });

  test('PUT /:id → edita usuario', async () => {
    if (!usuarioCreadoId) return;
    const res = await request(app)
      .put(`${BASE}/${usuarioCreadoId}`)
      .set(headers)
      .send({ nombre: 'TestJestEditado', apellido: 'EditadoApellido', celular: '71111111' });
    expect([200, 204]).toContain(res.status);
  });

  test('PATCH /:id/activo → toggle activo', async () => {
    if (!usuarioCreadoId) return;
    const res = await request(app)
      .patch(`${BASE}/${usuarioCreadoId}/activo`)
      .set(headers);
    expect([200, 204]).toContain(res.status);
  });

  test('PATCH /:id/password → resetea contraseña', async () => {
    if (!usuarioCreadoId) return;
    const res = await request(app)
      .patch(`${BASE}/${usuarioCreadoId}/password`)
      .set(headers)
      .send({ nueva_contrasena: 'NuevaClave123!' });
    expect([200, 204]).toContain(res.status);
  });

  test('DELETE /:id → elimina usuario', async () => {
    if (!usuarioCreadoId) return;
    const res = await request(app).delete(`${BASE}/${usuarioCreadoId}`).set(headers);
    expect([200, 204]).toContain(res.status);
  });
});
