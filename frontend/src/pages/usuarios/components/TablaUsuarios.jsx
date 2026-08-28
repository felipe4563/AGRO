import { usePermission } from '../../../hooks/usePermission';

export default function TablaUsuarios({
  usuarios,
  cargando,
  onEditar,
  onEliminar,
  onToggleActivo,
  onResetClave,
  onCambiarSucursal,
}) {
  const { puede } = usePermission();

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
        <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  if (!usuarios || usuarios.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-lg">No hay usuarios registrados.</p>
        <p className="text-sm mt-1">Haz clic en "Nuevo Usuario" para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">CI</th>
              <th className="px-4 py-3 font-medium">Nombre Completo</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Contacto</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Sucursal</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {usuarios.map((u) => (
              <tr key={u.id_usuario} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                  {u.ci}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {u.nombre} {u.apellido}
                  </p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{u.correo || '—'}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">{u.celular || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {u.rol_nombre || 'Sin rol'}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm text-zinc-600 dark:text-zinc-400">
                  {u.sucursal || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {puede('activar', 'usuarios') ? (
                    <button
                      onClick={() => onToggleActivo(u)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        u.activo ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}
                      title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          u.activo ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  ) : (
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full ${
                        u.activo ? 'bg-emerald-500' : 'bg-zinc-400'
                      }`}
                      title={u.activo ? 'Activo' : 'Inactivo'}
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {puede('resetear_clave', 'usuarios') && (
                      <button
                        onClick={() => onResetClave(u)}
                        className="p-1.5 text-zinc-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors"
                        title="Resetear contraseña"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                    )}
                    {puede('cambiar_sucursal', 'usuarios') && (
                      <button
                        onClick={() => onCambiarSucursal(u)}
                        className="p-1.5 text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
                        title="Cambiar sucursal"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </button>
                    )}
                    {puede('editar', 'usuarios') && (
                      <button
                        onClick={() => onEditar(u)}
                        className="p-1.5 text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                    {puede('eliminar', 'usuarios') && (
                      <button
                        onClick={() => onEliminar(u)}
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
