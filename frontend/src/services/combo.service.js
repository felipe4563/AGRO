import api from '../api/axios';

const comboService = {
  listar:      () => api.get('/combos'),
  listarPOS:   () => api.get('/combos/pos'),
  obtener:     (id) => api.get(`/combos/${id}`),
  crear:       (data) => api.post('/combos', data),
  editar:      (id, data) => api.put(`/combos/${id}`, data),
  toggleActivo:(id, activo) => api.patch(`/combos/${id}/activo`, { activo }),
  eliminar:    (id) => api.delete(`/combos/${id}`),
  subirImagen:    (id, formData) => api.patch(`/combos/${id}/imagen`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  eliminarImagen: (id) => api.delete(`/combos/${id}/imagen`),
};

export default comboService;
