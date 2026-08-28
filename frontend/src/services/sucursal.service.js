import api from '../api/axios';

const sucursalService = {
  listar:       () => api.get('/sucursales'),
  obtener:      (id) => api.get(`/sucursales/${id}`),
  crear:        (data) => api.post('/sucursales', data),
  editar:       (id, data) => api.put(`/sucursales/${id}`, data),
  eliminar:     (id) => api.delete(`/sucursales/${id}`),
  toggleActivo: (id, activo) => api.patch(`/sucursales/${id}/activo`, { activo }),
};

export default sucursalService;
