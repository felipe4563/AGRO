import { usePermission } from '../../../hooks/usePermission';

export default function TablaCompras({
  compras,
  cargando,
  onVerDetalle,
  onConfirmar,
  onAnular
}) {
  const { puede } = usePermission();

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
        <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>Cargando historial de compras...</p>
      </div>
    );
  }

  if (!compras || compras.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-lg">No hay compras registradas.</p>
        <p className="text-sm mt-1">Haz clic en "Nueva Compra" para comenzar.</p>
      </div>
    );
  }

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'PENDIENTE':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-xs font-medium">PENDIENTE</span>;
      case 'RECIBIDO':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-medium">RECIBIDO</span>;
      case 'ANULADA':
        return <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md text-xs font-medium">ANULADA</span>;
      default:
        return <span className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded-md text-xs font-medium">{estado}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">ID / Fecha</th>
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Total</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {compras.map((c) => (
              <tr key={c.id_compra} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">
                    # {c.id_compra.toString().padStart(5, '0')}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {new Date(c.fecha_compra).toLocaleDateString()}
                  </p>
                </td>
                
                <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                  <p className="font-semibold">{c.proveedor_nombre}</p>
                  {c.nro_factura && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Factura: {c.nro_factura}</p>}
                </td>

                <td className="px-4 py-3 hidden md:table-cell text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Bs {parseFloat(c.total).toFixed(2)}
                </td>

                <td className="px-4 py-3 text-center">
                  {getEstadoBadge(c.estado)}
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onVerDetalle(c)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title="Ver Detalle"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    {c.estado === 'PENDIENTE' && puede('confirmar', 'compras') && (
                      <button
                        onClick={() => onConfirmar(c)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded transition-colors"
                        title="Confirmar Recepción"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}

                    {c.estado === 'PENDIENTE' && puede('editar', 'compras') && (
                      <button
                        onClick={() => onAnular(c)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Anular"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
