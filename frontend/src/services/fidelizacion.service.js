import api from '../api/axios';

const fidelizacionService = {
  obtenerConfiguracion: () => api.get('/fidelizacion/configuracion'),
  actualizarConfiguracion: (bs_por_punto) => api.put('/fidelizacion/configuracion', { bs_por_punto }),

  listarRecompensas: () => api.get('/fidelizacion/recompensas'),
  crearRecompensa: (data) => api.post('/fidelizacion/recompensas', data),
  editarRecompensa: (id, data) => api.put(`/fidelizacion/recompensas/${id}`, data),
  toggleActivoRecompensa: (id, activo) => api.patch(`/fidelizacion/recompensas/${id}/activo`, { activo }),
  eliminarRecompensa: (id) => api.delete(`/fidelizacion/recompensas/${id}`),

  obtenerCliente: (id) => api.get(`/fidelizacion/clientes/${id}`),
  canjear: (id_cliente, id_recompensa) => api.post('/fidelizacion/canjear', { id_cliente, id_recompensa }),
};

export default fidelizacionService;
