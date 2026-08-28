export default function PanelAlertas({ alertas, cargando }) {
  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
        <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p>Analizando alertas...</p>
      </div>
    );
  }

  const { bajo_stock = [], prox_vencer = [] } = alertas || {};
  const total = bajo_stock.length + prox_vencer.length;

  if (total === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-lg font-semibold text-zinc-900 dark:text-white">Sin alertas activas</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Todo el inventario está en niveles adecuados y sin vencimientos próximos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bajo_stock.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">
              Bajo Stock Mínimo ({bajo_stock.length})
            </h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {bajo_stock.map((item) => (
              <div key={item.id_lote} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{item.producto_nombre}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.sucursal_nombre} · Lote: {item.numero_lote || `ID-${item.id_lote}`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{item.stock_unidades} u</p>
                  <p className="text-xs text-zinc-500">mín: {item.stock_minimo} u</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {prox_vencer.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold text-red-800 dark:text-red-300">
              Próximos a Vencer ({prox_vencer.length})
            </h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {prox_vencer.map((item) => (
              <div key={item.id_lote} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{item.producto_nombre}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.sucursal_nombre} · Lote: {item.numero_lote || `ID-${item.id_lote}`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={`text-sm font-bold ${item.dias_restantes < 0 ? 'text-red-700 dark:text-red-400' : item.dias_restantes <= 7 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {item.dias_restantes < 0 ? 'Vencido' : `${item.dias_restantes} días`}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(item.fecha_vencimiento).toLocaleDateString()} · {item.stock_unidades} u
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
