import api from '../api/axios';

const clienteService = {
  listar:       () => api.get('/clientes'),
  obtener:      (id) => api.get(`/clientes/${id}`),
  crear:        (data) => api.post('/clientes', data),
  editar:       (id, data) => api.put(`/clientes/${id}`, data),
  eliminar:     (id) => api.delete(`/clientes/${id}`),
  toggleActivo: (id, activo) => api.patch(`/clientes/${id}/activo`, { activo }),
  historial:    (id) => api.get(`/clientes/${id}/historial`),
  buscarPersona: (codigo) => api.get(`/clientes/buscar-persona/${codigo}`),
};

export default clienteService;
