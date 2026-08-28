import api from '../api/axios';

const productoService = {
  listar:         () => api.get('/productos'),
  obtener:        (id) => api.get(`/productos/${id}`),
  crear:          (data) => api.post('/productos', data),
  editar:         (id, data) => api.put(`/productos/${id}`, data),
  eliminar:       (id) => api.delete(`/productos/${id}`),
  toggleActivo:   (id, activo) => api.patch(`/productos/${id}/activo`, { activo }),
  subirImagen:    (id, formData) => api.patch(`/productos/${id}/imagen`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  eliminarImagen: (id) => api.delete(`/productos/${id}/imagen`),
  generarCodigoBarras: (id) => api.patch(`/productos/${id}/codigo-barras`),
};

export default productoService;
