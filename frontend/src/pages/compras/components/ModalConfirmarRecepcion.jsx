import { useState, useEffect } from 'react';
import compraService from '../../../services/compra.service';

export default function ModalConfirmarRecepcion({ compraId, onClose, onConfirmado }) {
  const [compra, setCompra] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [filas, setFilas] = useState([]);

  useEffect(() => {
    if (compraId) {
      cargarDetalle();
    }
  }, [compraId]);

  const cargarDetalle = async () => {
    setCargando(true);
    try {
      const res = await compraService.obtener(compraId);
      setCompra(res.data);
      setFilas((res.data.detalles || []).map((d) => ({
        id_detalle_compra: d.id_detalle_compra,
        producto_nombre: d.producto_nombre,
        cantidad_cajas: d.cantidad_cajas,
        unidades_por_caja: d.unidades_por_caja,
        numero_lote_fab: d.numero_lote_fab || '',
        fecha_produccion: d.fecha_produccion ? d.fecha_produccion.split('T')[0] : '',
        fecha_vencimiento: d.fecha_vencimiento ? d.fecha_vencimiento.split('T')[0] : '',
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const handleCambioFila = (id_detalle_compra, campo, valor) => {
    setFilas((prev) => prev.map((f) =>
      f.id_detalle_compra === id_detalle_compra ? { ...f, [campo]: valor } : f
    ));
  };

  const handleConfirmar = async () => {
    setConfirmando(true);
    try {
      const res = await compraService.confirmar(compraId, filas.map((f) => ({
        id_detalle_compra: f.id_detalle_compra,
        numero_lote_fab: f.numero_lote_fab || null,
        fecha_produccion: f.fecha_produccion || null,
        fecha_vencimiento: f.fecha_vencimiento || null,
      })));
      onConfirmado(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al confirmar la compra');
    } finally {
      setConfirmando(false);
    }
  };

  if (cargando) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 flex items-center justify-center">
          <p className="text-zinc-500">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!compra) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Confirmar recepción — Compra #{compra.id_compra.toString().padStart(5, '0')}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Cargá lote y fechas de cada producto tal cual llegaron (opcional). Esto va a generar el stock en Almacén.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[760px]">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300">Producto</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300 text-center">Cant.</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300">Nro. Lote</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300">F. Producción</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300">F. Vencimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {filas.map((f) => (
                  <tr key={f.id_detalle_compra}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{f.producto_nombre}</td>
                    <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">
                      {f.cantidad_cajas} × {f.unidades_por_caja}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={f.numero_lote_fab}
                        onChange={(e) => handleCambioFila(f.id_detalle_compra, 'numero_lote_fab', e.target.value)}
                        placeholder="Ej. L-2993"
                        className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={f.fecha_produccion}
                        onChange={(e) => handleCambioFila(f.id_detalle_compra, 'fecha_produccion', e.target.value)}
                        className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={f.fecha_vencimiento}
                        onChange={(e) => handleCambioFila(f.id_detalle_compra, 'fecha_vencimiento', e.target.value)}
                        className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            disabled={confirmando}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={confirmando}
            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50"
          >
            {confirmando ? 'Confirmando...' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  );
}
