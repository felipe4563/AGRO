import { useState, useEffect } from 'react';
import compraService from '../../../services/compra.service';
import ModalImprimirEtiquetas from '../../../components/ModalImprimirEtiquetas';

export default function DetalleCompraModal({ compraId, onClose }) {
  const [compra, setCompra] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(false);

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
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            Detalle de Compra #{compra.id_compra.toString().padStart(5, '0')}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Proveedor</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">{compra.proveedor_nombre}</p>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Fecha de Compra</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                {new Date(compra.fecha_compra).toLocaleDateString()}
              </p>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Estado</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">{compra.estado}</p>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white mb-3">Productos Adquiridos</h4>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/80">
                  <tr>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300">Producto</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300 text-center">Cajas</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300 text-center">U/Caja</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300 text-center">Costo/Caja</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-300 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  {compra.detalles && compra.detalles.map((d) => (
                    <tr key={d.id_detalle_compra}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900 dark:text-white">{d.producto_nombre}</p>
                        {d.numero_lote_fab && <p className="text-xs text-zinc-500">Lote: {d.numero_lote_fab}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">{d.cantidad_cajas}</td>
                      <td className="px-4 py-3 text-center">{d.unidades_por_caja}</td>
                      <td className="px-4 py-3 text-center">Bs {parseFloat(d.precio_por_caja).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium">Bs {parseFloat(d.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Subtotal</span>
                <span>Bs {parseFloat(compra.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Descuento</span>
                <span>- Bs {parseFloat(compra.descuento).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-zinc-900 dark:text-white pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span>Total</span>
                <span>Bs {parseFloat(compra.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 shrink-0">
          {compra.estado === 'RECIBIDO' && (
            <button
              onClick={() => setMostrarEtiquetas(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center gap-2"
            >
              🏷️ Imprimir etiquetas
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {mostrarEtiquetas && (
        <ModalImprimirEtiquetas
          items={(compra.detalles || []).map((d) => ({
            id_producto: d.id_producto,
            nombre: d.producto_nombre,
            codigo_barras: d.codigo_barras,
            precio_menor: d.precio_menor,
            cantidad: 1,
          }))}
          onClose={() => setMostrarEtiquetas(false)}
        />
      )}
    </div>
  );
}
