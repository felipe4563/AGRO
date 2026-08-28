process.env.BANCO_ECONOMICO_BASE_URL = 'https://banco.test/ApiGateway';
process.env.BANCO_ECONOMICO_USER = 'user_test';
process.env.BANCO_ECONOMICO_PASSWORD = 'pass_test';
process.env.BANCO_ECONOMICO_AES_KEY = 'clave_test';
process.env.BANCO_ECONOMICO_ACCOUNT_CREDIT = '1234567890';

const jwt = require('jsonwebtoken');

function tokenFalso(segundosParaExpirar) {
  return jwt.sign({ usr: 'x' }, 'firma-cualquiera', { expiresIn: segundosParaExpirar });
}

describe('bancoEconomico.service', () => {
  let bancoEconomico;

  beforeEach(() => {
    jest.resetModules();
    bancoEconomico = require('../services/bancoEconomico.service');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('encriptar hace GET a /api/authentication/encrypt y devuelve el texto cifrado', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'TEXTO_CIFRADO_BASE64',
    });

    const resultado = await bancoEconomico.encriptar('1234');

    expect(resultado).toBe('TEXTO_CIFRADO_BASE64');
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/authentication/encrypt');
    expect(url).toContain('text=1234');
    expect(url).toContain('aesKey=clave_test');
  });

  test('generarQR obtiene token, cifra la cuenta y llama a generateQR', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'PASSWORD_CIFRADO' }) // encrypt password
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: tokenFalso(3600), responseCode: 0, message: '' }) }) // authenticate
      .mockResolvedValueOnce({ ok: true, text: async () => 'CUENTA_CIFRADA' }) // encrypt accountCredit
      .mockResolvedValueOnce({ ok: true, json: async () => ({ qrId: '999', qrImage: 'BASE64IMG', responseCode: 0, message: '' }) }); // generateQR

    const resultado = await bancoEconomico.generarQR({
      transactionId: 'venta-1',
      monto: 10.5,
      moneda: 'BOB',
      descripcion: 'Venta POS',
      dueDate: '2026-08-25',
    });

    expect(resultado).toEqual({ qrId: '999', qrImage: 'BASE64IMG' });
    const llamadaGenerar = global.fetch.mock.calls[3];
    expect(llamadaGenerar[0]).toContain('/api/qrsimple/generateQR');
    const body = JSON.parse(llamadaGenerar[1].body);
    expect(body.accountCredit).toBe('CUENTA_CIFRADA');
    expect(body.amount).toBe(10.5);
    expect(llamadaGenerar[1].headers.Authorization).toMatch(/^Bearer /);
  });

  test('estadoQR interpreta statusQRCode = 1 como pagado', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'PASSWORD_CIFRADO' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: tokenFalso(3600), responseCode: 0, message: '' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ statusQrCode: 1, payment: [{ qrId: '999' }], responseCode: 0, message: '' }) });

    const resultado = await bancoEconomico.estadoQR('999');

    expect(resultado.pagado).toBe(true);
  });

  test('anularQR nunca lanza, incluso si el banco responde error', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'PASSWORD_CIFRADO' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: tokenFalso(3600), responseCode: 0, message: '' }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ responseCode: 1, message: 'error' }) });

    await expect(bancoEconomico.anularQR('999')).resolves.toBeUndefined();
  });

  test('el token se reutiliza si no está por expirar (no vuelve a autenticar)', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'PASSWORD_CIFRADO' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: tokenFalso(3600), responseCode: 0, message: '' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => 'CUENTA_CIFRADA' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ qrId: '1', qrImage: 'A', responseCode: 0, message: '' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => 'CUENTA_CIFRADA' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ qrId: '2', qrImage: 'B', responseCode: 0, message: '' }) });

    await bancoEconomico.generarQR({ transactionId: 't1', monto: 1, moneda: 'BOB', descripcion: 'x', dueDate: '2026-08-25' });
    await bancoEconomico.generarQR({ transactionId: 't2', monto: 1, moneda: 'BOB', descripcion: 'x', dueDate: '2026-08-25' });

    // 2 llamadas de encrypt password + authenticate solo la primera vez = 2 llamadas de "login",
    // más 2 de encrypt-cuenta y 2 de generateQR = 6 llamadas totales, no 8.
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });
});
