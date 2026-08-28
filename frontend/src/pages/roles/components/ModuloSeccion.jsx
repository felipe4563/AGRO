const ICONOS = {
  dashboard:      '📊',
  encomiendas:    '📦',
  manifiestos:    '📋',
  ordenes_salida: '🚗',
  reportes:       '📈',
  roles:          '🔐',
  sectores:       '🗺',
  sucursales:     '🏪',
  usuarios:       '👥',
};

export default function ModuloSeccion({
  modulo, permisos, seleccionados, onChange, readonly = false
}) {
  const total    = permisos.length;
  const marcados = permisos.filter(p => seleccionados.has(p.id_permiso)).length;
  const todos    = marcados === total && total > 0;
  const algunos  = marcados > 0 && !todos;

  const toggleTodos = () => {
    const ids = permisos.map(p => p.id_permiso);
    onChange(prev => {
      const next = new Set(prev);
      todos
        ? ids.forEach(id => next.delete(id))
        : ids.forEach(id => next.add(id));
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700
                    overflow-hidden bg-white dark:bg-zinc-800/50">

      {/* Header del módulo */}
      <div className="flex items-center justify-between px-4 py-3
                      bg-zinc-50 dark:bg-zinc-800
                      border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span>{ICONOS[modulo] ?? '📁'}</span>
          <span className="text-sm font-bold capitalize
                           text-zinc-800 dark:text-white">
            {modulo.replace(/_/g, ' ')}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                            ${todos
                              ? 'bg-green-100 dark:bg-green-400/20 text-green-700 dark:text-green-400'
                              : algunos
                                ? 'bg-yellow-100 dark:bg-yellow-400/20 text-yellow-700 dark:text-yellow-400'
                                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                            }`}>
            {marcados}/{total}
          </span>
        </div>

        {!readonly && (
          <label className="flex items-center gap-1.5 cursor-pointer
                            text-xs text-zinc-500 dark:text-zinc-400
                            hover:text-zinc-700 dark:hover:text-white
                            transition-colors select-none">
            <input
              type="checkbox"
              checked={todos}
              ref={el => { if (el) el.indeterminate = algunos; }}
              onChange={toggleTodos}
              className="w-4 h-4 accent-yellow-400 cursor-pointer"
            />
            Todos
          </label>
        )}
      </div>

      {/* Permisos */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
        {permisos.map(permiso => {
          const marcado = seleccionados.has(permiso.id_permiso);
          return (
            <label
              key={permiso.id_permiso}
              className={`flex items-start gap-2.5 px-3 py-2 rounded-lg
                          transition-colors duration-150 select-none
                          ${readonly ? 'cursor-default' : 'cursor-pointer'}
                          ${marcado
                            ? 'bg-yellow-50 dark:bg-yellow-400/10'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/40'
                          }`}
            >
              <input
                type="checkbox"
                checked={marcado}
                disabled={readonly}
                onChange={() => {
                  if (readonly) return;
                  onChange(prev => {
                    const next = new Set(prev);
                    next.has(permiso.id_permiso)
                      ? next.delete(permiso.id_permiso)
                      : next.add(permiso.id_permiso);
                    return next;
                  });
                }}
                className="w-4 h-4 accent-yellow-400 mt-0.5 shrink-0 cursor-pointer"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-700
                               dark:text-zinc-300 truncate capitalize">
                  {permiso.accion.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500
                               truncate">
                  {permiso.descripcion}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}