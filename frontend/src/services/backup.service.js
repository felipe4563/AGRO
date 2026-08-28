import api from '../api/axios';

const backupService = {
  listar:    ()         => api.get('/backups'),
  generar:   ()         => api.post('/backups/generar'),
  descargar: (filename) => api.get(`/backups/descargar/${encodeURIComponent(filename)}`, { responseType: 'blob' }),
  eliminar:  (filename) => api.delete(`/backups/${encodeURIComponent(filename)}`),
};

export default backupService;
