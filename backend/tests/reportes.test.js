const { app, request, authHeader } = require('./helpers');

const BASE = '/api/reportes';
let headers;

beforeAll(async () => {
  headers = await authHeader();
});

describe('Reportes - Sin token', () => {
  test('GET /financiero → 401', async () => {
    const res = await request(app).get(`${BASE}/financiero`);
    expect(res.status).toBe(401);
  });
});

describe('Reportes - Ventas', () => {
  const tipos = ['diarias', 'rango', 'vendedor', 'producto', 'cliente'];
  tipos.forEach(tipo => {
    test(`GET /ventas/${tipo} → 200 o 403`, async () => {
      const res = await request(app).get(`${BASE}/ventas/${tipo}`).set(headers);
      expect([200, 403]).toContain(res.status);
      if (res.status === 200) expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true);
    });
  });

  test('GET /ventas/tipo_invalido → 400', async () => {
    const res = await request(app).get(`${BASE}/ventas/tipo_invalido`).set(headers);
    expect(res.status).toBe(400);
  });
});

describe('Reportes - Compras', () => {
  ['generales', 'proveedor'].forEach(tipo => {
    test(`GET /compras/${tipo} → 200 o 403`, async () => {
      const res = await request(app).get(`${BASE}/compras/${tipo}`).set(headers);
      expect([200, 403]).toContain(res.status);
    });
  });
});

describe('Reportes - Inventario', () => {
  ['actual', 'valorizado', 'stock_bajo', 'vencimientos', 'kardex'].forEach(tipo => {
    test(`GET /inventario/${tipo} → 200 o 403`, async () => {
      const res = await request(app).get(`${BASE}/inventario/${tipo}`).set(headers);
      expect([200, 403]).toContain(res.status);
    });
  });
});

describe('Reportes - Financiero / Dashboard', () => {
  test('GET /financiero → 200 o 403', async () => {
    const res = await request(app).get(`${BASE}/financiero`).set(headers);
    expect([200, 403]).toContain(res.status);
  });

  test('GET /top-productos → 200 o 403', async () => {
    const res = await request(app).get(`${BASE}/top-productos`).set(headers);
    expect([200, 403]).toContain(res.status);
  });

  test('GET /vencimientos → 200 o 403', async () => {
    const res = await request(app).get(`${BASE}/vencimientos`).set(headers);
    expect([200, 403]).toContain(res.status);
  });

  test('GET /ganancias/producto → 200 o 403', async () => {
    const res = await request(app).get(`${BASE}/ganancias/producto`).set(headers);
    expect([200, 403]).toContain(res.status);
  });
});

describe('Reportes - Sucursales', () => {
  test('GET /sucursales/traslados → 200 o 403', async () => {
    const res = await request(app).get(`${BASE}/sucursales/traslados`).set(headers);
    expect([200, 403]).toContain(res.status);
  });

  test('GET /sucursales/comparativo → 200 o 403', async () => {
    const res = await request(app).get(`${BASE}/sucursales/comparativo`).set(headers);
    expect([200, 403]).toContain(res.status);
  });
});

describe('Reportes - Caja', () => {
  test('GET /caja → 200 o 403', async () => {
    const res = await request(app).get(`${BASE}/caja`).set(headers);
    expect([200, 403]).toContain(res.status);
  });
});
