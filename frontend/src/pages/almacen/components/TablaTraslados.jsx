import { usePermission } from '../../../hooks/usePermission';

export default function TablaTraslados({ traslados, cargando, onConfirmar, onCancelar }) {
  const { puede } = usePermission();

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
        <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p>Cargando traslados...</p>
      </div>
    );
  }

  if (!traslados || traslados.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-lg">No hay traslados registrados.</p>
        <p className="text-sm mt-1">Usa "Nuevo Traslado" desde un lote para mover stock entre sucursales.</p>
      </div>
    );
  }

  const estadoBadge = (estado) => {
    if (estado === 'PENDIENTE') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700';
    if (estado === 'CONFIRMADO') return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700';
    return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Producto / Lote</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Origen → Destino</th>
              <th className="px-4 py-3 font-medium text-center">Cantidad</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Fecha</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {traslados.map((t) => (
              <tr key={t.id_traslado} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t.producto_nombre}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{t.numero_lote || `ID-${t.id_lote_origen}`}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">{t.sucursal_origen}</span>
                  <span className="mx-2 text-zinc-400">→</span>
                  <span className="font-medium">{t.sucursal_destino}</span>
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {t.cantidad_cajas > 0 && <p className="text-zinc-900 dark:text-white">{t.cantidad_cajas} caj</p>}
                  {t.cantidad_unidades > 0 && <p className="text-zinc-600 dark:text-zinc-400">{t.cantidad_unidades} u</p>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold uppercase border ${estadoBadge(t.estado)}`}>
                    {t.estado}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(t.fecha_traslado).toLocaleString()}
                  {t.usuario_nombre && <p>por {t.usuario_nombre}</p>}
                </td>
                <td className="px-4 py-3 text-right">
                  {t.estado === 'PENDIENTE' && puede('trasladar', 'almacen') && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onConfirmar(t)}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-lg transition-colors"
                        title="Confirmar traslado"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => onCancelar(t)}
                        className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg transition-colors"
                        title="Cancelar traslado"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
