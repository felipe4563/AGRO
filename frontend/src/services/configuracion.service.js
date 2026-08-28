import api from '../api/axios';

const configuracionService = {
  obtener:        () => api.get('/configuracion'),
  actualizar:     (data) => api.put('/configuracion', data),
  subirLogo:      (formData) => api.patch('/configuracion/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  eliminarLogo:   () => api.delete('/configuracion/logo'),
};

export default configuracionService;
