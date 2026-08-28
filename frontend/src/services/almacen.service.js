import api from '../api/axios';

const almacenService = {
  listarLotes:       ()         => api.get('/almacen/lotes'),
  obtenerLote:       (id)       => api.get(`/almacen/lotes/${id}`),
  crearLote:         (data)     => api.post('/almacen/lotes', data),
  ajustarLote:       (id, data) => api.post(`/almacen/lotes/${id}/ajuste`, data),
  darBajaLote:       (id, data) => api.patch(`/almacen/lotes/${id}/baja`, data),

  listarTraslados:   ()         => api.get('/almacen/traslados'),
  crearTraslado:     (data)     => api.post('/almacen/traslados', data),
  confirmarTraslado: (id)       => api.patch(`/almacen/traslados/${id}/confirmar`),
  cancelarTraslado:  (id)       => api.patch(`/almacen/traslados/${id}/cancelar`),

  listarAlertas:     ()         => api.get('/almacen/alertas'),

  listarProductos:   ()         => api.get('/almacen/aux/productos'),
  listarSucursales:  ()         => api.get('/almacen/aux/sucursales'),
};

export default almacenService;
