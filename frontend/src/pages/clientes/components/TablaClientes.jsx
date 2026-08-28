import { usePermission } from '../../../hooks/usePermission';

export default function TablaClientes({
  clientes,
  cargando,
  onEditar,
  onEliminar,
  onToggleActivo,
  onVerHistorial,
}) {
  const { puede } = usePermission();

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
        <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>Cargando clientes...</p>
      </div>
    );
  }

  if (!clientes || clientes.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-lg">No hay clientes registrados.</p>
        <p className="text-sm mt-1">Haz clic en "Nuevo Cliente" para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Cliente / Empresa</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Contacto</th>
              <th className="px-4 py-3 font-medium text-center">Tipo</th>
              <th className="px-4 py-3 font-medium text-center hidden lg:table-cell">Puntos</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {clientes.map((c) => (
              <tr key={c.id_cliente} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    {c.nombre} {c.apellido || ''}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    CI/NIT: {c.ci_nit || 'S/N'}
                    {c.empresa && <span className="ml-2 block sm:inline">🏢 {c.empresa}</span>}
                  </p>
                </td>
                
                <td className="px-4 py-3 hidden md:table-cell text-sm text-zinc-600 dark:text-zinc-400">
                  <p>📞 {c.telefono || '—'}</p>
                  {c.correo && <p>✉️ {c.correo}</p>}
                </td>

                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                    c.tipo_cliente === 'MAYORISTA' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' 
                      : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                  }`}>
                    {c.tipo_cliente}
                  </span>
                </td>

                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    ⭐ {c.puntos_fidelidad ?? 0}
                  </span>
                </td>

                <td className="px-4 py-3 text-center">
                  {puede('activar', 'clientes') ? (
                    <button
                      onClick={() => onToggleActivo(c)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        c.activo ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}
                      title={c.activo ? 'Desactivar cliente' : 'Activar cliente'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          c.activo ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  ) : (
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full ${
                        c.activo ? 'bg-emerald-500' : 'bg-zinc-400'
                      }`}
                      title={c.activo ? 'Activo' : 'Inactivo'}
                    />
                  )}
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {puede('ver_historial', 'clientes') && (
                      <button
                        onClick={() => onVerHistorial(c)}
                        className="p-1.5 text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
                        title="Ver historial de compras"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </button>
                    )}
                    {puede('editar', 'clientes') && (
                      <button
                        onClick={() => onEditar(c)}
                        className="p-1.5 text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                    {puede('eliminar', 'clientes') && (
                      <button
                        onClick={() => onEliminar(c)}
                        className="p-1.5 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
