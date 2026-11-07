import { useState, useEffect, useRef, useMemo } from 'react';
import { usePermission } from '../../../hooks/usePermission';
import reporteService from '../../../services/reporte.service';
import FiltrosAvanzados from '../components/FiltrosAvanzados';
import TablaReporte from '../components/TablaReporte';
import BotonesExportar from '../components/BotonesExportar';

export default function VistaInventario() {
  const { puede } = usePermission();

  const SUB_TABS = [
    { id: 'actual', label: 'Inventario Actual', permiso: 'inventario' },
    { id: 'global', label: 'Por Sucursal', permiso: 'inventario' },
    { id: 'valorizado', label: 'Inventario Valorizado', permiso: 'inventario_valorizado' },
    { id: 'rentabilidad', label: 'Rentabilidad', permiso: 'rentabilidad' },
    { id: 'stock_bajo', label: 'Stock Bajo', permiso: 'stock_bajo' },
    { id: 'vencimientos', label: 'Próximos a Vencer', permiso: 'vencimientos' },
    { id: 'kardex', label: 'Kardex de Lotes', permiso: 'kardex' }
  ];

  const tabsPermitidos = SUB_TABS.filter(t => puede(t.permiso, 'reportes'));

  const [activeTab, setActiveTab] = useState(tabsPermitidos.length > 0 ? tabsPermitidos[0].id : null);
  const [datos, setDatos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [filtros, setFiltros] = useState({});
  const [catalogos, setCatalogos] = useState({ productos: [] });
  // Precio hipotético que el usuario escribe por fila en la calculadora de
  // rentabilidad (tab 'rentabilidad') — nunca se guarda, solo recalcula el
  // margen en pantalla mientras se escribe. Clave: id_lote.
  const [preciosSimulados, setPreciosSimulados] = useState({});

  useEffect(() => {
    reporteService.catalogos.productos().then(res => setCatalogos(prev => ({ ...prev, productos: res.data }))).catch(() => {});
    reporteService.catalogos.sucursales().then(res => setCatalogos(prev => ({ ...prev, sucursales: res.data }))).catch(() => {});
    reporteService.catalogos.marcas().then(res => setCatalogos(prev => ({ ...prev, marcas: res.data }))).catch(() => {});
    reporteService.catalogos.clasificaciones().then(res => setCatalogos(prev => ({ ...prev, clasificaciones: res.data }))).catch(() => {});
  }, []);

  const solicitudIdRef = useRef(0);

  useEffect(() => {
    if (activeTab && !(activeTab === 'kardex' && !filtros.id_producto)) buscarDatos();
  }, [activeTab]);

  const cambiarTab = (id) => {
    setDatos([]);
    setResumen(null);
    setActiveTab(id);
  };

  const buscarDatos = async () => {
    if (activeTab === 'kardex' && !filtros.id_producto) {
      return alert('Debe seleccionar un producto para generar el Kardex.');
    }

    const miSolicitud = ++solicitudIdRef.current;
    setCargando(true);
    try {
      const res = await reporteService.inventario(activeTab, filtros);
      if (solicitudIdRef.current !== miSolicitud) return;
      setDatos(res.data.data || []);
      setResumen(res.data.resumen || {});
    } catch (err) {
      if (solicitudIdRef.current !== miSolicitud) return;
      console.error(err);
      alert('Error cargando reporte de inventario');
    } finally {
      if (solicitudIdRef.current === miSolicitud) setCargando(false);
    }
  };

  const esMultiSucursal = activeTab === 'global' || activeTab === 'valorizado';
  // Tabs donde tiene sentido filtrar por marca/categoría además de producto
  // (multi-sucursal, o 'rentabilidad' que lista por lote de la sucursal actual).
  const tieneFiltrosDeCatalogo = esMultiSucursal || activeTab === 'rentabilidad';

  const opcionesFiltros = {
    fechas: false,
    productos: activeTab === 'kardex' || tieneFiltrosDeCatalogo,
    marcas: tieneFiltrosDeCatalogo,
    categorias: tieneFiltrosDeCatalogo
  };

  // Filtro escalonado: al elegir marca y/o categoría, la lista de productos
  // del select se reduce a los que coinciden.
  const productosFiltrados = useMemo(() => {
    if (!tieneFiltrosDeCatalogo) return catalogos.productos || [];
    return (catalogos.productos || []).filter(p =>
      (!filtros.id_marca || String(p.id_marca) === String(filtros.id_marca)) &&
      (!filtros.id_clasificacion || String(p.id_clasificacion) === String(filtros.id_clasificacion))
    );
  }, [activeTab, catalogos.productos, filtros.id_marca, filtros.id_clasificacion]);

  const getDetalleSucursales = (row) =>
    Array.isArray(row.detalle_sucursales) ? row.detalle_sucursales :
    (typeof row.detalle_sucursales === 'string' ? JSON.parse(row.detalle_sucursales || '[]') : []);

  // Extrae las sucursales únicas presentes en los datos (o el catálogo, si existe).
  // Compartido por 'global' y 'valorizado', los dos reportes multi-sucursal.
  const getSucursalesArray = () => {
    const sucursalesMap = new Map();
    if (catalogos.sucursales && catalogos.sucursales.length > 0) {
      catalogos.sucursales.forEach(s => sucursalesMap.set(s.id_sucursal, s));
    } else {
      datos.forEach(row => {
        getDetalleSucursales(row).forEach(d => {
          if (!sucursalesMap.has(d.id_sucursal)) {
            sucursalesMap.set(d.id_sucursal, { id_sucursal: d.id_sucursal, nombre: d.sucursal_nombre, ciudad: d.ciudad || '' });
          }
        });
      });
    }
    return Array.from(sucursalesMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const getColumnas = () => {
    switch (activeTab) {
      case 'global': {
        const columnasGlobales = [
          { key: 'nombre', header: 'PRODUCTO' },
          { key: 'categoria', header: 'CATEGORÍA', render: v => <span className="text-zinc-500">{v || 'Sin Categoría'}</span> },
        ];

        getSucursalesArray().forEach(suc => {
          columnasGlobales.push({
            key: `sucursal_${suc.id_sucursal}`,
            header: (
              <div className="text-center">
                <span className="text-emerald-600 font-bold uppercase block">{suc.nombre}</span>
                {suc.ciudad && <span className="text-[9px] text-zinc-400 font-normal">{suc.ciudad}</span>}
              </div>
            ),
            exportHeader: suc.nombre,
            align: 'center',
            render: (_, r) => {
              const sucData = getDetalleSucursales(r).find(d => d.id_sucursal === suc.id_sucursal);
              return <span className={sucData?.stock > 0 ? "text-emerald-600 font-bold" : "text-zinc-300"}>{sucData?.stock > 0 ? sucData.stock : '—'}</span>;
            },
            excelValue: (r) => {
              const sucData = getDetalleSucursales(r).find(d => d.id_sucursal === suc.id_sucursal);
              return sucData ? sucData.stock : 0;
            }
          });
        });

        columnasGlobales.push({
          key: 'stock_total_unidades',
          header: 'TOTAL',
          align: 'center',
          render: v => <span className="font-bold text-black dark:text-white">{v || 0}</span>,
          excelValue: r => r.stock_total_unidades || 0
        });

        return columnasGlobales;
      }
      case 'actual':
        return [
          { key: 'codigo_barras', header: 'Código', render: v => v || 'N/A' },
          { key: 'nombre', header: 'Producto' },
          { key: 'categoria', header: 'Categoría', render: v => v || 'Sin Categoría' },
          { key: 'stock_total_unidades', header: 'Stock Total (Unid.)', align: 'center', render: v => <span className="font-bold text-blue-600">{v} u</span>, excelValue: r => r.stock_total_unidades }
        ];
      case 'valorizado': {
        const columnasValorizado = [
          { key: 'codigo_barras', header: 'Código', render: v => v || 'N/A' },
          { key: 'nombre', header: 'Producto' },
          { key: 'categoria', header: 'Categoría', render: v => <span className="text-zinc-500">{v || 'Sin Categoría'}</span> },
        ];

        getSucursalesArray().forEach(suc => {
          columnasValorizado.push({
            key: `sucursal_${suc.id_sucursal}`,
            header: (
              <div className="text-center">
                <span className="text-emerald-600 font-bold uppercase block">{suc.nombre}</span>
                {suc.ciudad && <span className="text-[9px] text-zinc-400 font-normal">{suc.ciudad}</span>}
              </div>
            ),
            exportHeader: suc.nombre,
            align: 'center',
            render: (_, r) => {
              const sucData = getDetalleSucursales(r).find(d => d.id_sucursal === suc.id_sucursal);
              if (!sucData || !(sucData.stock > 0)) return <span className="text-zinc-300">—</span>;
              return (
                <div className="flex flex-col items-center">
                  <span className="font-bold text-emerald-600">{sucData.stock} u</span>
                  <span className="text-[10px] text-zinc-400">Bs {parseFloat(sucData.valor || 0).toFixed(2)}</span>
                </div>
              );
            },
            excelValue: (r) => {
              const sucData = getDetalleSucursales(r).find(d => d.id_sucursal === suc.id_sucursal);
              return sucData ? parseFloat(sucData.valor || 0) : 0;
            }
          });
        });

        columnasValorizado.push(
          { key: 'stock_total_unidades', header: 'Stock Total', align: 'center', render: v => <span className="font-bold text-black dark:text-white">{v || 0} u</span>, excelValue: r => r.stock_total_unidades || 0 },
          { key: 'costo_total_estimado', header: 'Valor Total (Bs)', align: 'right', render: v => <span className="font-bold text-emerald-600">{parseFloat(v || 0).toFixed(2)}</span>, excelValue: r => parseFloat(r.costo_total_estimado || 0) }
        );

        return columnasValorizado;
      }
      case 'rentabilidad':
        return [
          { key: 'codigo_barras', header: 'Código', render: v => v || 'N/A' },
          { key: 'nombre', header: 'Producto' },
          { key: 'numero_lote', header: 'Lote', render: (v, r) => v || `#${r.id_lote}`, excelValue: r => r.numero_lote || `#${r.id_lote}` },
          { key: 'stock_unidades', header: 'Stock', align: 'center', excelValue: r => r.stock_unidades },
          { key: 'costo_unitario', header: 'Costo/Unid. (Bs)', align: 'right', render: v => parseFloat(v).toFixed(2), excelValue: r => parseFloat(r.costo_unitario) },
          { key: 'precio_menor', header: 'Precio Venta (Bs)', align: 'right', render: v => parseFloat(v).toFixed(2), excelValue: r => parseFloat(r.precio_menor) },
          {
            key: 'margen_menor',
            header: 'Margen Actual (Bs)',
            align: 'right',
            render: v => {
              const m = parseFloat(v);
              return <span className={`font-bold ${m < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{m.toFixed(2)}</span>;
            },
            excelValue: r => parseFloat(r.margen_menor)
          },
          {
            key: '_simulador',
            header: 'Probar precio (Bs)',
            align: 'center',
            exportar: false, // cálculo interactivo de pantalla, no tiene sentido en Excel/PDF
            render: (_, r) => {
              const costo = parseFloat(r.costo_unitario);
              const valorTexto = preciosSimulados[r.id_lote] ?? '';
              const precioProbado = parseFloat(valorTexto);
              const margenProbado = valorTexto !== '' && !isNaN(precioProbado) ? precioProbado - costo : null;
              return (
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    placeholder={parseFloat(r.precio_menor).toFixed(2)}
                    value={valorTexto}
                    onChange={(e) => setPreciosSimulados(prev => ({ ...prev, [r.id_lote]: e.target.value }))}
                    className="w-20 px-1.5 py-1 text-xs text-right rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:text-white"
                  />
                  {margenProbado !== null && (
                    <span className={`text-[10px] font-bold ${margenProbado < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      margen: {margenProbado.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            }
          }
        ];
      case 'stock_bajo':
        return [
          { key: 'codigo_barras', header: 'Código' },
          { key: 'nombre', header: 'Producto' },
          { key: 'stock_minimo', header: 'Mínimo', align: 'center', excelValue: r => r.stock_minimo },
          { key: 'stock_total_unidades', header: 'Stock Actual', align: 'center', render: v => <span className="font-bold text-red-600">{v} u</span>, excelValue: r => r.stock_total_unidades }
        ];
      case 'vencimientos':
        return [
          { key: 'numero_lote', header: 'Lote', render: (v, r) => v || r.id_lote, excelValue: r => r.numero_lote || r.id_lote },
          { key: 'producto_nombre', header: 'Producto' },
          { key: 'stock_unidades', header: 'Stock (Unid.)', align: 'center' },
          { key: 'fecha_vencimiento', header: 'Caducidad', excelValue: r => new Date(r.fecha_vencimiento).toLocaleDateString() },
          { key: 'dias_restantes', header: 'Estado', align: 'center', render: v => (
            <span className={`px-2 py-1 rounded text-xs font-bold ${v < 0 ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100'}`}>
              {v < 0 ? `Vencido (${Math.abs(v)}d)` : `En ${v} d`}
            </span>
          ), excelValue: r => r.dias_restantes < 0 ? 'VENCIDO' : 'POR VENCER' }
        ];
      case 'kardex':
        return [
          { key: 'fecha', header: 'Fecha', excelValue: r => new Date(r.fecha).toLocaleString() },
          { key: 'tipo', header: 'Movimiento', render: v => (
            <span className={`px-2 py-0.5 rounded text-xs border ${v==='ENTRADA' ? 'border-emerald-500 text-emerald-600' : 'border-red-500 text-red-600'}`}>{v}</span>
          ), excelValue: r => r.tipo },
          { key: 'motivo', header: 'Motivo' },
          { key: 'cantidad_unidades', header: 'Cantidad', align: 'right', render: (v, r) => (
             <span className={`font-bold ${r.tipo==='ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
               {r.tipo==='ENTRADA' ? '+' : '-'}{v}
             </span>
          ), excelValue: r => r.tipo==='ENTRADA' ? r.cantidad_unidades : -r.cantidad_unidades },
          { key: 'numero_lote', header: 'Lote Afectado', render: v => v || 'N/A' },
          { key: 'usuario_nombre', header: 'Usuario' }
        ];
      default: return [];
    }
  };

  if (!activeTab) {
    return <div className="p-8 text-center text-zinc-500">No tienes permisos para ver reportes de inventario.</div>;
  }

  const tituloActual = tabsPermitidos.find(t => t.id === activeTab)?.label || 'Reporte de Inventario';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabsPermitidos.map(tab => (
          <button
            key={tab.id}
            onClick={() => cambiarTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 shadow-md'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <FiltrosAvanzados
        filtros={filtros}
        setFiltros={setFiltros}
        onBuscar={buscarDatos}
        cargando={cargando}
        opciones={opcionesFiltros}
        catalogos={{ ...catalogos, productos: productosFiltrados }}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
              {esMultiSucursal ? 'Productos Distintos' : 'Registros'}
            </p>
            <p className="text-xl font-black text-zinc-900 dark:text-white">{resumen?.total_registros || 0}</p>
          </div>
          {activeTab === 'global' && resumen?.unidades_total !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Unidades Totales</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {resumen.unidades_total} u
              </p>
            </div>
          )}
          {resumen?.valor_total !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Costo Total del Almacén</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                Bs {parseFloat(resumen.valor_total).toLocaleString('en-US', {minimumFractionDigits: 2})}
              </p>
            </div>
          )}
          {resumen?.lotes_en_perdida !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Lotes Vendiendo a Pérdida</p>
              <p className={`text-xl font-black ${resumen.lotes_en_perdida > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {resumen.lotes_en_perdida}
              </p>
            </div>
          )}
        </div>
        
        <BotonesExportar
          datos={datos}
          columnas={getColumnas().filter(c => c.exportar !== false)}
          titulo={`Reporte_Inventario_${tituloActual.replace(/\s+/g, '_')}`} 
          resumen={resumen}
          subtitulo={`Filtros aplicados: ${filtros.id_producto ? 'Producto específico' : 'Todos los productos'}`}
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <TablaReporte columnas={getColumnas()} datos={datos} cargando={cargando} />
      </div>
    </div>
  );
}
