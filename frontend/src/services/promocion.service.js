import api from '../api/axios';

const promocionService = {
  listar:      () => api.get('/promociones'),
  obtener:     (id) => api.get(`/promociones/${id}`),
  crear:       (data) => api.post('/promociones', data),
  editar:      (id, data) => api.put(`/promociones/${id}`, data),
  toggleActivo:(id, activo) => api.patch(`/promociones/${id}/activo`, { activo }),
  eliminar:    (id) => api.delete(`/promociones/${id}`),
};

export default promocionService;
