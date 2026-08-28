process.env.PERSONAS_API_BASE_URL = 'https://personas.test';
process.env.PERSONAS_API_USER = 'user_test';
process.env.PERSONAS_API_PASSWORD = 'pass_test';

function expiraFutura() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

describe('personas.service', () => {
  let personas;

  beforeEach(() => {
    jest.resetModules();
    personas = require('../services/personas.service');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('buscarPorCodigo hace login y luego consulta la persona', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN123', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ codigo: '1011300', primerNombre: 'MIRIAN', primerApellido: 'NAVARRO' }) });

    const resultado = await personas.buscarPorCodigo('1011300');

    expect(resultado.primerNombre).toBe('MIRIAN');
    const [urlLogin] = global.fetch.mock.calls[0];
    expect(urlLogin).toContain('/auth/login');
    const [, opcionesConsulta] = global.fetch.mock.calls[1];
    expect(opcionesConsulta.headers.Authorization).toBe('Bearer TOKEN123');
  });

  test('el token se reutiliza si no está por expirar (no vuelve a loguear)', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN123', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ codigo: '1' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ codigo: '2' }) });

    await personas.buscarPorCodigo('1');
    await personas.buscarPorCodigo('2');

    // 1 login + 2 consultas = 3 llamadas, no 4
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('propaga 404 como error con noEncontrado = true', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN123', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(personas.buscarPorCodigo('inexistente')).rejects.toMatchObject({ noEncontrado: true });
  });

  test('reintenta login una vez si el token cacheado devuelve 401', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN_VIEJO', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'TOKEN_NUEVO', expiraEn: expiraFutura() }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ codigo: '1' }) });

    const resultado = await personas.buscarPorCodigo('1');

    expect(resultado.codigo).toBe('1');
    const ultimaLlamada = global.fetch.mock.calls[3];
    expect(ultimaLlamada[1].headers.Authorization).toBe('Bearer TOKEN_NUEVO');
  });
});
