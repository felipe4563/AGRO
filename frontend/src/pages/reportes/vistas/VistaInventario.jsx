import { useState, useEffect, useRef } from 'react';
import { usePermission } from '../../../hooks/usePermission';
import reporteService from '../../../services/reporte.service';
import FiltrosAvanzados from '../components/FiltrosAvanzados';
import TablaReporte from '../components/TablaReporte';
import BotonesExportar from '../components/BotonesExportar';

export default function VistaInventario() {
  const { puede } = usePermission();

  const SUB_TABS = [
    { id: 'actual', label: 'Inventario Actual', permiso: 'inventario' },
    { id: 'valorizado', label: 'Inventario Valorizado', permiso: 'inventario_valorizado' },
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

  useEffect(() => {
    reporteService.catalogos.productos().then(res => {
      setCatalogos({ productos: res.data });
    }).catch(() => {});
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

  const opcionesFiltros = {
    fechas: false,
    productos: activeTab === 'kardex'
  };

  const getColumnas = () => {
    switch (activeTab) {
      case 'actual':
        return [
          { key: 'codigo_barras', header: 'Código', render: v => v || 'N/A' },
          { key: 'nombre', header: 'Producto' },
          { key: 'categoria', header: 'Categoría', render: v => v || 'Sin Categoría' },
          { key: 'stock_total_unidades', header: 'Stock Total (Unid.)', align: 'center', render: v => <span className="font-bold text-blue-600">{v} u</span>, excelValue: r => r.stock_total_unidades }
        ];
      case 'valorizado':
        return [
          { key: 'codigo_barras', header: 'Código', render: v => v || 'N/A' },
          { key: 'nombre', header: 'Producto' },
          { key: 'stock_total_unidades', header: 'Stock Total', align: 'center' },
          { key: 'costo_total_estimado', header: 'Valor Estimado (Bs)', align: 'right', render: v => parseFloat(v).toFixed(2), excelValue: r => parseFloat(r.costo_total_estimado) }
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
          { key: 'numero_lote', header: 'Lote', render: (v, r) => v || r.id_lote },
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
        catalogos={catalogos}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Registros</p>
            <p className="text-xl font-black text-zinc-900 dark:text-white">{resumen?.total_registros || 0}</p>
          </div>
          {resumen?.valor_total !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Costo Total del Almacén</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                Bs {parseFloat(resumen.valor_total).toLocaleString('en-US', {minimumFractionDigits: 2})}
              </p>
            </div>
          )}
        </div>
        
        <BotonesExportar datos={datos} columnas={getColumnas()} titulo={`Reporte_Inventario_${tituloActual.replace(/\s+/g, '_')}`} />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <TablaReporte columnas={getColumnas()} datos={datos} cargando={cargando} />
      </div>
    </div>
  );
}
