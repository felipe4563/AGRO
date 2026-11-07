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
  ['actual', 'valorizado', 'rentabilidad', 'stock_bajo', 'vencimientos', 'kardex'].forEach(tipo => {
    test(`GET /inventario/${tipo} → 200 o 403`, async () => {
      const res = await request(app).get(`${BASE}/inventario/${tipo}`).set(headers);
      expect([200, 403]).toContain(res.status);
    });
  });

  test('GET /inventario/valorizado trae desglose por sucursal (detalle_sucursales) en vez de estar limitado a una sola sucursal', async () => {
    const res = await request(app).get(`${BASE}/inventario/valorizado`).set(headers);
    expect([200, 403]).toContain(res.status);
    if (res.status === 200 && res.body.data.length > 0) {
      const fila = res.body.data[0];
      expect(fila).toHaveProperty('detalle_sucursales');
      expect(fila).toHaveProperty('costo_total_estimado');
      const detalle = Array.isArray(fila.detalle_sucursales)
        ? fila.detalle_sucursales
        : JSON.parse(fila.detalle_sucursales || '[]');
      expect(Array.isArray(detalle)).toBe(true);
      if (detalle.length > 0) {
        expect(detalle[0]).toHaveProperty('id_sucursal');
        expect(detalle[0]).toHaveProperty('sucursal_nombre');
        expect(detalle[0]).toHaveProperty('stock');
        expect(detalle[0]).toHaveProperty('valor');
      }
    }
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
