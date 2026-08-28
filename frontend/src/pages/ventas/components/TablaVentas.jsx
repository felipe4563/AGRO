import { usePermission } from '../../../hooks/usePermission';

export default function TablaVentas({
  ventas,
  cargando,
  onVerDetalle,
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
        <p>Cargando registro de ventas...</p>
      </div>
    );
  }

  if (!ventas || ventas.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-lg">No hay ventas registradas.</p>
        <p className="text-sm mt-1">Haz clic en "Punto de Venta" para comenzar a vender.</p>
      </div>
    );
  }

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'COMPLETADA':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-medium">COMPLETADA</span>;
      case 'ANULADA':
        return <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md text-xs font-medium">ANULADA</span>;
      default:
        return <span className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded-md text-xs font-medium">{estado}</span>;
    }
  };

  const AccionesFila = ({ v }) => (
    <>
      <button
        onClick={() => onVerDetalle(v)}
        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
        title="Ver Recibo"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {v.estado === 'COMPLETADA' && puede('anular', 'ventas') && (
        <button
          onClick={() => onAnular(v)}
          className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
          title="Anular Venta"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
    </>
  );

  return (
    <>
      {/* ── Vista tabla (desktop / tablet ancho) ─────────────────────── */}
      <div className="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="px-4 py-3 font-medium">Comprobante</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium text-center">Tipo</th>
                <th className="px-4 py-3 font-medium text-right">Monto (Bs)</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {ventas.map((v) => (
                <tr key={v.id_venta} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      # {v.id_venta.toString().padStart(5, '0')}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex flex-col gap-0.5">
                      <span>{new Date(v.fecha_venta).toLocaleDateString()} {new Date(v.fecha_venta).toLocaleTimeString()}</span>
                      <span>Vendedor: {v.usuario_nombre}</span>
                    </p>
                  </td>

                  <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                    {v.cliente_nombre ? (
                      <>
                        <p className="font-semibold">{v.cliente_nombre} {v.cliente_apellido || ''}</p>
                        <p className="text-xs text-zinc-500">CI/NIT: {v.ci_nit || 'S/N'}</p>
                      </>
                    ) : (
                      <span className="italic text-zinc-500">Cliente Casual</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                      v.tipo_venta === 'MAYOR'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                    }`}>
                      Por {v.tipo_venta === 'MAYOR' ? 'Mayor' : 'Menor'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {parseFloat(v.total).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase">{v.metodo_pago}</p>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {getEstadoBadge(v.estado)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <AccionesFila v={v} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Vista tarjetas (móvil) ────────────────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {ventas.map((v) => (
          <div key={v.id_venta} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  # {v.id_venta.toString().padStart(5, '0')}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {new Date(v.fecha_venta).toLocaleDateString()} {new Date(v.fecha_venta).toLocaleTimeString()}
                </p>
              </div>
              {getEstadoBadge(v.estado)}
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100">
              {v.cliente_nombre ? (
                <>
                  <p className="font-semibold">{v.cliente_nombre} {v.cliente_apellido || ''}</p>
                  <p className="text-xs text-zinc-500">CI/NIT: {v.ci_nit || 'S/N'}</p>
                </>
              ) : (
                <span className="italic text-zinc-500">Cliente Casual</span>
              )}
              <p className="text-xs text-zinc-500 mt-1">Vendedor: {v.usuario_nombre}</p>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                v.tipo_venta === 'MAYOR'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
              }`}>
                Por {v.tipo_venta === 'MAYOR' ? 'Mayor' : 'Menor'}
              </span>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Bs {parseFloat(v.total).toFixed(2)}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase">{v.metodo_pago}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
              <AccionesFila v={v} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
