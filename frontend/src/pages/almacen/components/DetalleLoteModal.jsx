import { useState, useEffect } from 'react';
import almacenService from '../../../services/almacen.service';

export default function DetalleLoteModal({ loteId, onClose }) {
  const [lote, setLote] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (loteId) {
      cargarDetalle();
    }
  }, [loteId]);

  const cargarDetalle = async () => {
    setCargando(true);
    try {
      const res = await almacenService.obtenerLote(loteId);
      setLote(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 flex items-center justify-center">
          <p className="text-zinc-500">Cargando historial del lote...</p>
        </div>
      </div>
    );
  }

  if (!lote) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            Historial de Movimientos: Lote {lote.numero_lote || `ID-${lote.id_lote}`}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Producto</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{lote.producto_nombre}</p>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">F. Vencimiento</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{lote.fecha_vencimiento ? new Date(lote.fecha_vencimiento).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Cajas Actuales</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{lote.stock_cajas}</p>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Unidades Actuales</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg leading-none mt-1">{lote.stock_unidades}</p>
            </div>
          </div>

          <h4 className="font-semibold text-zinc-900 dark:text-white mb-3">Movimientos</h4>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300">Fecha</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300 text-center">Tipo</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300">Motivo / Ref.</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300 text-right">Cantidad (u)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {!lote.movimientos || lote.movimientos.length === 0 ? (
                  <tr><td colSpan="4" className="p-4 text-center text-zinc-500">No hay movimientos registrados.</td></tr>
                ) : (
                  lote.movimientos.map((m) => (
                    <tr key={m.id_movimiento} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                        {new Date(m.fecha_movimiento).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          m.tipo === 'ENTRADA' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800' :
                          m.tipo === 'SALIDA' ? 'text-red-600 bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800' :
                          'text-orange-600 bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800'
                        }`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{m.motivo}</p>
                        <p className="text-xs text-zinc-500">
                          {m.referencia_tipo} {m.referencia_id ? `#${m.referencia_id}` : ''} | Usr: {m.usuario_nombre}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">
                        {m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SALIDA' ? '-' : ''}{m.cantidad_unidades}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
