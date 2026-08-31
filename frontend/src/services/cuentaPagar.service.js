import api from '../api/axios';

const cuentaPagarService = {
  listar:  () => api.get('/cuentas-pagar'),
  obtener: (idCompra) => api.get(`/cuentas-pagar/${idCompra}`),
  registrarPago: (idCompra, data) => api.post(`/cuentas-pagar/${idCompra}/pagos`, data),
  obtenerPago: (idPago) => api.get(`/cuentas-pagar/pagos/${idPago}`),
  listarHistorial: () => api.get('/cuentas-pagar/historial'),
};

export default cuentaPagarService;
