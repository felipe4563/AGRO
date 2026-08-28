import api from '../api/axios';

const perfilService = {
  obtener:         () => api.get('/perfil'),
  cambiarPassword: (data) => api.patch('/perfil/password', data),
  subirFoto:       (formData) => api.patch('/perfil/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export default perfilService;
