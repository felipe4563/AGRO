import { usePermission } from '../../../hooks/usePermission';

export default function TablaLotes({
  lotes,
  cargando,
  onVerMovimientos,
  onAjustar,
  onNuevoTraslado,
  onDarBaja,
}) {
  const { puede } = usePermission();

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
        <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p>Cargando inventario...</p>
      </div>
    );
  }

  if (!lotes || lotes.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-lg">El almacén está vacío.</p>
        <p className="text-sm mt-1">Usa "Nueva Entrada" para registrar el primer lote.</p>
      </div>
    );
  }

  const calcularEstadoVencimiento = (fecha) => {
    if (!fecha) return null;
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const dias = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
    if (dias < 0) return { texto: 'Vencido', color: 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800' };
    if (dias <= 30) return { texto: `Vence en ${dias} d`, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
    return { texto: 'Vigente', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Lote / Producto</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Detalles</th>
              <th className="px-4 py-3 font-medium text-center">Stock</th>
              <th className="px-4 py-3 font-medium text-center">Vencimiento</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {lotes.map((l) => {
              const estVenc = calcularEstadoVencimiento(l.fecha_vencimiento);
              const stockBajo = l.stock_minimo > 0 && l.stock_unidades < l.stock_minimo;
              return (
                <tr key={l.id_lote} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${l.stock_unidades <= 0 ? 'opacity-60 grayscale' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                      {l.producto_nombre}
                      {stockBajo && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] rounded border border-amber-200 dark:border-amber-700 font-bold">
                          BAJO
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-xs font-mono border border-zinc-200 dark:border-zinc-700">
                        {l.numero_lote || `ID-${l.id_lote}`}
                      </span>
                      <span className="text-xs text-zinc-400">{l.sucursal_nombre}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell text-sm text-zinc-600 dark:text-zinc-400">
                    {l.clasificacion_nombre && <p>🏷️ {l.clasificacion_nombre}</p>}
                    {l.marca_nombre && <p>🏆 {l.marca_nombre}</p>}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-zinc-900 dark:text-white">{l.stock_unidades} u</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">({l.stock_cajas} cajas)</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {l.fecha_vencimiento ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">
                          {new Date(l.fecha_vencimiento).toLocaleDateString()}
                        </span>
                        {estVenc && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${estVenc.color}`}>
                            {estVenc.texto}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">No aplica</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onVerMovimientos(l)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Ver kardex / historial"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>

                      {puede('ajustar', 'almacen') && (
                        <button
                          onClick={() => onAjustar(l)}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 rounded transition-colors"
                          title="Ajuste de inventario"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}

                      {puede('trasladar', 'almacen') && l.stock_unidades > 0 && (
                        <button
                          onClick={() => onNuevoTraslado(l)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded transition-colors"
                          title="Trasladar a otra sucursal"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                      )}

                      {puede('dar_baja_lote', 'almacen') && (
                        <button
                          onClick={() => onDarBaja(l)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Dar de baja lote"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
