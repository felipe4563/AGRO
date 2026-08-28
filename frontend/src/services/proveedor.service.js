import api from '../api/axios';

const proveedorService = {
  listar:       () => api.get('/proveedores'),
  obtener:      (id) => api.get(`/proveedores/${id}`),
  crear:        (data) => api.post('/proveedores', data),
  editar:       (id, data) => api.put(`/proveedores/${id}`, data),
  eliminar:     (id) => api.delete(`/proveedores/${id}`),
  toggleActivo: (id, activo) => api.patch(`/proveedores/${id}/activo`, { activo }),
};

export default proveedorService;
