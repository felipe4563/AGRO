import api from '../api/axios';

const compraService = {
  listar:    () => api.get('/compras'),
  obtener:   (id) => api.get(`/compras/${id}`),
  crear:     (data) => api.post('/compras', data),
  confirmar: (id) => api.post(`/compras/${id}/confirmar`),
  anular:    (id) => api.patch(`/compras/${id}/anular`)
};

export default compraService;
