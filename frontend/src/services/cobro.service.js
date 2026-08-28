import api from '../api/axios';

const cobroService = {
  listar:  () => api.get('/cobros'),
  obtener: (idVenta) => api.get(`/cobros/${idVenta}`),
  registrarPago: (idVenta, data) => api.post(`/cobros/${idVenta}/pagos`, data),
  obtenerPago: (idPago) => api.get(`/cobros/pagos/${idPago}`),
  listarHistorial: () => api.get('/cobros/historial'),
};

export default cobroService;
