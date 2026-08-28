import { usePermission } from '../../../hooks/usePermission';

export default function TablaCatalogos({
  activeTab,
  datos,
  cargando,
  onEditar,
  onEliminar,
  onToggleActivo
}) {
  const { puede } = usePermission();

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
        <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>Cargando {activeTab}...</p>
      </div>
    );
  }

  if (!datos || datos.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-lg">No hay registros de {activeTab}.</p>
      </div>
    );
  }

  const tieneEstado = activeTab === 'clasificaciones' || activeTab === 'marcas';

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Nombre</th>
              {activeTab === 'marcas' && <th className="px-4 py-3 font-medium">País de Origen</th>}
              {activeTab === 'unidades' && <th className="px-4 py-3 font-medium">Abreviatura</th>}
              {(activeTab === 'clasificaciones' || activeTab === 'marcas') && (
                <th className="px-4 py-3 font-medium hidden md:table-cell">Descripción</th>
              )}
              {tieneEstado && <th className="px-4 py-3 font-medium text-center">Estado</th>}
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {datos.map((item) => {
              const id = item.id_clasificacion || item.id_marca || item.id_unidad;
              return (
                <tr key={id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {item.nombre}
                    </p>
                  </td>
                  
                  {activeTab === 'marcas' && (
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {item.pais_origen || '—'}
                    </td>
                  )}

                  {activeTab === 'unidades' && (
                    <td className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {item.abreviatura}
                    </td>
                  )}

                  {(activeTab === 'clasificaciones' || activeTab === 'marcas') && (
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-zinc-500 dark:text-zinc-500 truncate max-w-xs">
                      {item.descripcion || '—'}
                    </td>
                  )}

                  {tieneEstado && (
                    <td className="px-4 py-3 text-center">
                      {puede('editar', activeTab) ? (
                        <button
                          onClick={() => onToggleActivo(item)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            item.activo ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                          }`}
                          title={item.activo ? 'Desactivar' : 'Activar'}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              item.activo ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full ${
                            item.activo ? 'bg-emerald-500' : 'bg-zinc-400'
                          }`}
                          title={item.activo ? 'Activo' : 'Inactivo'}
                        />
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {puede('editar', activeTab) && (
                        <button
                          onClick={() => onEditar(item)}
                          className="p-1.5 text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                      {puede('eliminar', activeTab) && (
                        <button
                          onClick={() => onEliminar(item)}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
