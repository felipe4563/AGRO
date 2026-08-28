import { useState, useEffect, useCallback } from 'react';
import clienteService from '../../../services/cliente.service';

export function ModalCrearEditar({ cliente, onConfirm, onClose, guardando }) {
  const isEditing = !!cliente;
  
  const [formData, setFormData] = useState({
    ci_nit: '',
    nombre: '',
    apellido: '',
    empresa: '',
    telefono: '',
    correo: '',
    direccion: '',
    tipo_cliente: 'MINORISTA'
  });
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [mensajeBusqueda, setMensajeBusqueda] = useState(null);

  useEffect(() => {
    if (cliente) {
      setFormData({
        ci_nit: cliente.ci_nit || '',
        nombre: cliente.nombre || '',
        apellido: cliente.apellido || '',
        empresa: cliente.empresa || '',
        telefono: cliente.telefono || '',
        correo: cliente.correo || '',
        direccion: cliente.direccion || '',
        tipo_cliente: cliente.tipo_cliente || 'MINORISTA'
      });
    }
  }, [cliente]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const buscarPersona = async () => {
    const codigo = formData.ci_nit.trim();
    if (!codigo) return;
    setMensajeBusqueda(null);
    setBuscandoPersona(true);
    try {
      const res = await clienteService.buscarPersona(codigo);
      const tieneDatos = formData.nombre.trim() || formData.apellido.trim();
      if (tieneDatos && !window.confirm('Ya hay nombre/apellido escritos. ¿Reemplazarlos con los datos encontrados?')) {
        return;
      }
      setFormData((prev) => ({
        ...prev,
        nombre: res.data.nombre || prev.nombre,
        apellido: res.data.apellido || prev.apellido,
      }));
      setMensajeBusqueda({ tipo: 'ok', texto: 'Persona encontrada, datos completados' });
    } catch (err) {
      if (err.response?.status === 404) {
        setMensajeBusqueda({ tipo: 'error', texto: 'No se encontró ninguna persona con ese CI' });
      } else {
        setMensajeBusqueda({ tipo: 'error', texto: 'Error al consultar la API de personas' });
      }
    } finally {
      setBuscandoPersona(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="cliente-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Tipo y CI */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Tipo de Cliente *
              </label>
              <select
                name="tipo_cliente"
                required
                value={formData.tipo_cliente}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="MINORISTA">MINORISTA (Consumidor Final)</option>
                <option value="MAYORISTA">MAYORISTA (Distribuidor)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                CI / NIT
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="ci_nit"
                  value={formData.ci_nit}
                  onChange={handleChange}
                  onBlur={!isEditing ? buscarPersona : undefined}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Documento de identidad..."
                />
                {buscandoPersona && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">Buscando...</span>
                )}
              </div>
              {mensajeBusqueda && (
                <p className={`text-[11px] mt-1 ${mensajeBusqueda.tipo === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {mensajeBusqueda.texto}
                </p>
              )}
            </div>

            {/* Nombres y Empresa */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Nombres *
              </label>
              <input
                type="text"
                name="nombre"
                required
                value={formData.nombre}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                placeholder="Ej. Juan"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Apellidos
              </label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                placeholder="Ej. Pérez"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Razón Social / Empresa
              </label>
              <input
                type="text"
                name="empresa"
                value={formData.empresa}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                placeholder="Nombre de la institución (opcional)"
              />
            </div>

            {/* Contacto */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Teléfono / Celular
              </label>
              <input
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                placeholder="Ej. +591 71234567"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                placeholder="ejemplo@correo.com"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Dirección
              </label>
              <textarea
                name="direccion"
                rows="2"
                value={formData.direccion}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all resize-none"
                placeholder="Dirección física o sucursal..."
              />
            </div>

          </form>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="cliente-form"
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {guardando && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalHistorial({ cliente, onClose }) {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await clienteService.historial(cliente.id_cliente);
      setVentas(res.data);
    } catch {
      setError('No se pudo cargar el historial');
    } finally {
      setCargando(false);
    }
  }, [cliente.id_cliente]);

  useEffect(() => { cargar(); }, [cargar]);

  const formatFecha = (f) => new Date(f).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatMonto = (m) => `Bs ${Number(m).toFixed(2)}`;

  const estadoColor = {
    COMPLETADA: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    ANULADA:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    PENDIENTE:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Historial de Compras</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{cliente.nombre} {cliente.apellido || ''}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {cargando ? (
            <div className="p-8 flex justify-center items-center">
              <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : ventas.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              <p className="text-lg">Sin compras registradas</p>
              <p className="text-sm mt-1">Este cliente aún no tiene ventas en el sistema.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Pago</th>
                  <th className="px-4 py-3 font-medium text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {ventas.map((v) => (
                  <tr key={v.id_venta} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      <p>{formatFecha(v.fecha_venta)}</p>
                      {v.nro_factura && <p className="text-xs text-zinc-400">Fact. {v.nro_factura}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${v.tipo_venta === 'MAYOR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                        {v.tipo_venta}
                      </span>
                      <p className="text-xs text-zinc-400 mt-0.5">{v.cantidad_items} ítem(s)</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-white text-right">
                      {formatMonto(v.total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                      {v.metodo_pago}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estadoColor[v.estado] || ''}`}>
                        {v.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
          <p className="text-xs text-zinc-400">{ventas.length} venta(s) — últimas 50</p>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalEliminar({ cliente, onConfirm, onClose, guardando }) {
  if (!cliente) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm overflow-hidden text-center p-6">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
          ¿Desactivar cliente?
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Estás a punto de desactivar a <strong className="text-zinc-700 dark:text-zinc-300">{cliente.nombre} {cliente.apellido}</strong>.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Sí, desactivar
          </button>
        </div>
      </div>
    </div>
  );
}
