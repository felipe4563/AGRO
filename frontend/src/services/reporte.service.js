import api from '../api/axios';

const reporteService = {
  financiero:   (params) => api.get('/reportes/financiero', { params }),
  topProductos: (params) => api.get('/reportes/top-productos', { params }),
  vencimientos: () => api.get('/reportes/vencimientos'),
  ventas: (tipo, params) => api.get(`/reportes/ventas/${tipo}`, { params }),
  compras: (tipo, params) => api.get(`/reportes/compras/${tipo}`, { params }),
  inventario: (tipo, params) => api.get(`/reportes/inventario/${tipo}`, { params }),
  gananciasProducto: (params) => api.get('/reportes/ganancias/producto', { params }),
  traslados:             (params) => api.get('/reportes/sucursales/traslados', { params }),
  comparativoSucursales: (params) => api.get('/reportes/sucursales/comparativo', { params }),
  caja: (params) => api.get('/reportes/caja', { params }),
  catalogos: {
    clientes:    () => api.get('/clientes'),
    proveedores: () => api.get('/proveedores'),
    usuarios:    () => api.get('/usuarios'),
    productos:   () => api.get('/productos'),
    sucursales:  () => api.get('/sucursales')
  }
};

export default reporteService;
