import api from '../api/axios';

const rolService = {
  // Roles CRUD
  listar:             ()              => api.get('/roles'),
  obtener:            (id)            => api.get(`/roles/${id}`),
  crear:              (data)          => api.post('/roles', data),
  editar:             (id, data)      => api.put(`/roles/${id}`, data),
  eliminar:           (id)            => api.delete(`/roles/${id}`),

  // Permisos
  listarPermisos:     ()              => api.get('/roles/permisos'),
  actualizarPermisos: (id, permisos)  => api.put(`/roles/${id}/permisos`, { permisos }),
};

export default rolService;