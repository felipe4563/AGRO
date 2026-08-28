import api from '../api/axios';

const ventaService = {
  listarProductosPOS: () => api.get('/ventas/pos-productos'),
  listar:  () => api.get('/ventas'),
  obtener: (id) => api.get(`/ventas/${id}`),
  crear:   (data) => api.post('/ventas', data),
  anular:  (id) => api.patch(`/ventas/${id}/anular`),
  generarQrBanco: (data) => api.post('/ventas/qr-banco/generar', data),
  estadoQrBanco:  (qrId) => api.get(`/ventas/qr-banco/estado/${qrId}`),
  anularQrBanco:  (qrId) => api.delete(`/ventas/qr-banco/${qrId}`),
};

export default ventaService;
