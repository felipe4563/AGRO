import api from '../api/axios';

const usuarioService = {
  listar:           () => api.get('/usuarios'),
  obtener:          (id) => api.get(`/usuarios/${id}`),
  crear:            (data) => api.post('/usuarios', data),
  editar:           (id, data) => api.put(`/usuarios/${id}`, data),
  eliminar:         (id) => api.delete(`/usuarios/${id}`),
  toggleActivo:     (id, activo) => api.patch(`/usuarios/${id}/activo`, { activo }),
  cambiarRol:       (id, id_rol) => api.patch(`/usuarios/${id}/rol`, { id_rol }),
  cambiarSucursal:  (id, id_sucursal) => api.patch(`/usuarios/${id}/sucursal`, { id_sucursal }),
  resetearClave:    (id, nueva_contrasena) => api.patch(`/usuarios/${id}/password`, { nueva_contrasena }),
};

export default usuarioService;
