import { useEffect, useRef } from 'react';

export default function FiltrosAvanzados({
  filtros,
  setFiltros,
  onBuscar,
  cargando,
  opciones = { fechas: true, clientes: false, productos: false, vendedores: false, proveedores: false, sucursales: false },
  catalogos = { clientes: [], productos: [], usuarios: [], proveedores: [], sucursales: [] }
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const limpiar = () => setFiltros({});

  // Búsqueda automática: al cambiar cualquier filtro, se dispara sola tras
  // una breve pausa (evita golpear la API en cada tecla/clic). El primer
  // render se salta porque el padre ya busca al montar/cambiar de pestaña.
  const primerRenderRef = useRef(true);
  useEffect(() => {
    if (primerRenderRef.current) {
      primerRenderRef.current = false;
      return;
    }
    const timer = setTimeout(() => onBuscar(), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        
        {opciones.fechas && (
          <>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Fecha Inicio</label>
              <input 
                type="date" 
                name="fechaInicio" 
                value={filtros.fechaInicio || ''} 
                onChange={handleChange}
                className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Fecha Fin</label>
              <input 
                type="date" 
                name="fechaFin" 
                value={filtros.fechaFin || ''} 
                onChange={handleChange}
                className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </>
        )}

        {opciones.clientes && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Cliente</label>
            <select 
              name="id_cliente" 
              value={filtros.id_cliente || ''} 
              onChange={handleChange}
              className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los clientes</option>
              {catalogos.clientes?.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido || c.empresa}</option>)}
            </select>
          </div>
        )}

        {opciones.productos && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Producto</label>
            <select 
              name="id_producto" 
              value={filtros.id_producto || ''} 
              onChange={handleChange}
              className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los productos</option>
              {catalogos.productos?.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}
            </select>
          </div>
        )}

        {opciones.vendedores && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Vendedor</label>
            <select 
              name="id_usuario" 
              value={filtros.id_usuario || ''} 
              onChange={handleChange}
              className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los vendedores</option>
              {catalogos.usuarios?.map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} {u.apellido}</option>)}
            </select>
          </div>
        )}

        {opciones.proveedores && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Proveedor</label>
            <select
              name="id_proveedor"
              value={filtros.id_proveedor || ''}
              onChange={handleChange}
              className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los proveedores</option>
              {catalogos.proveedores?.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.empresa}</option>)}
            </select>
          </div>
        )}

        {opciones.sucursales && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Sucursal</label>
            <select
              name="id_sucursal"
              value={filtros.id_sucursal || ''}
              onChange={handleChange}
              className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas las sucursales</option>
              {catalogos.sucursales?.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
            </select>
          </div>
        )}

        {/* Los filtros se aplican solos al cambiarlos; solo queda el botón de limpiar */}
        <div className="flex items-end gap-2">
          <button
            onClick={limpiar}
            className="px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5"
            title="Limpiar filtros"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            Limpiar
          </button>
          {cargando && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <svg className="animate-spin h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Buscando...
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
