import api from '../api/axios';

const cajaService = {
  listarCajas:        () => api.get('/caja/cajas'),
  crearCaja:          (data) => api.post('/caja/cajas', data),
  editarCaja:         (id, data) => api.put(`/caja/cajas/${id}`, data),
  toggleCaja:         (id) => api.patch(`/caja/cajas/${id}/toggle`),
  listarTurnos:       () => api.get('/caja/turnos'),
  obtenerTurnoActivo: () => api.get('/caja/turno-activo'),
  abrirCaja:          (data) => api.post('/caja/abrir', data),
  cerrarCaja:         (id, data) => api.patch(`/caja/${id}/cerrar`, data),
  obtenerResumenTurno:(id) => api.get(`/caja/turnos/${id}/resumen`),
  listarGastos:       (id_apertura) => api.get('/caja/gastos', { params: id_apertura ? { id_apertura } : {} }),
  registrarGasto:     (data) => api.post('/caja/gastos', data),
  obtenerLibroCaja:   (params) => api.get('/caja/libro', { params }),
};

export default cajaService;
