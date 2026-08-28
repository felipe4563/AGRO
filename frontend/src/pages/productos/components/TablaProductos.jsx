import { usePermission } from '../../../hooks/usePermission';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

function AccionesProducto({ p, onEditar, onEliminar, onGestionarImagen, onImprimirEtiqueta, puede }) {
  return (
    <div className="flex items-center gap-2">
      {puede('editar', 'productos') && (
        <button
          onClick={() => onImprimirEtiqueta(p)}
          className="p-1.5 text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
          title="Imprimir etiqueta (30x20mm)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2v-5a2 2 0 00-2-2H7a2 2 0 00-2 2v5a2 2 0 002 2zm0 0v-4a1 1 0 011-1h8a1 1 0 011 1v4M5 12V7a2 2 0 012-2h10a2 2 0 012 2v5M9 7h6" />
          </svg>
        </button>
      )}
      {puede('gestionar_imagen', 'productos') && (
        <button
          onClick={() => onGestionarImagen(p)}
          className="p-1.5 text-zinc-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition-colors"
          title="Gestionar imagen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 6h.008v.008H3.75V6zm0 0a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121.75 6v12a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18V6z" />
          </svg>
        </button>
      )}
      {puede('editar', 'productos') && (
        <button
          onClick={() => onEditar(p)}
          className="p-1.5 text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors"
          title="Editar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
      {puede('eliminar', 'productos') && (
        <button
          onClick={() => onEliminar(p)}
          className="p-1.5 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
          title="Eliminar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}

function EstadoToggle({ p, onToggleActivo, puede }) {
  if (!puede('activar', 'productos')) {
    return (
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full ${p.activo ? 'bg-emerald-500' : 'bg-zinc-400'}`}
        title={p.activo ? 'Activo' : 'Inactivo'}
      />
    );
  }
  return (
    <button
      onClick={() => onToggleActivo(p)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        p.activo ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
      }`}
      title={p.activo ? 'Desactivar producto' : 'Activar producto'}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          p.activo ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function TablaProductos({
  productos,
  cargando,
  onEditar,
  onEliminar,
  onToggleActivo,
  onGestionarImagen,
  onImprimirEtiqueta,
}) {
  const { puede } = usePermission();

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
        <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>Cargando productos...</p>
      </div>
    );
  }

  if (!productos || productos.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p className="text-lg">No hay productos registrados.</p>
        <p className="text-sm mt-1">Haz clic en "Nuevo Producto" para comenzar.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Móvil: tarjetas apiladas ── */}
      <div className="md:hidden space-y-3">
        {productos.map((p) => (
          <div
            key={p.id_producto}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4"
          >
            <div className="flex gap-3">
              <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                {p.imagen ? (
                  <img src={`${API_BASE}/uploads/${p.imagen}`} alt={p.nombre} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{p.nombre}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Cod: {p.codigo_barras || 'N/A'}</p>
                  </div>
                  <EstadoToggle p={p} onToggleActivo={onToggleActivo} puede={puede} />
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate">
                  {p.clasificacion_nombre} · {p.marca_nombre}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-sm">
                <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                  Mayor: Bs {p.precio_mayor} <span className="text-xs text-red-500">(-{p.descuento_mayor}%)</span>
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Menor: Bs {p.precio_menor} <span className="text-xs text-red-500">(-{p.descuento_menor}%)</span>
                </p>
              </div>
              <AccionesProducto
                p={p}
                onEditar={onEditar}
                onEliminar={onEliminar}
                onGestionarImagen={onGestionarImagen}
                onImprimirEtiqueta={onImprimirEtiqueta}
                puede={puede}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Tablet / escritorio: tabla ── */}
      <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="px-4 py-3 font-medium w-12"></th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categorización</th>
                <th className="px-4 py-3 font-medium">Precios</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Stock Mín.</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {productos.map((p) => (
                <tr key={p.id_producto} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                      {p.imagen ? (
                        <img src={`${API_BASE}/uploads/${p.imagen}`} alt={p.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-5 h-5 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {p.nombre}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Cod: {p.codigo_barras || 'N/A'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                    <p><span className="font-medium">Cat:</span> {p.clasificacion_nombre}</p>
                    <p><span className="font-medium">Marca:</span> {p.marca_nombre}</p>
                    <p className="hidden lg:block"><span className="font-medium">U.M:</span> {p.unidad_abreviatura}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                      Mayor: Bs {p.precio_mayor} <span className="text-xs text-red-500">(-{p.descuento_mayor}%)</span>
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Menor: Bs {p.precio_menor} <span className="text-xs text-red-500">(-{p.descuento_menor}%)</span>
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-zinc-700 dark:text-zinc-300">
                    {p.stock_minimo}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <EstadoToggle p={p} onToggleActivo={onToggleActivo} puede={puede} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <AccionesProducto
                        p={p}
                        onEditar={onEditar}
                        onEliminar={onEliminar}
                        onGestionarImagen={onGestionarImagen}
                        onImprimirEtiqueta={onImprimirEtiqueta}
                        puede={puede}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
