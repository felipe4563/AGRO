import { useState, useEffect, useRef } from 'react';
import { usePermission } from '../../../hooks/usePermission';
import reporteService from '../../../services/reporte.service';
import FiltrosAvanzados from '../components/FiltrosAvanzados';
import TablaReporte from '../components/TablaReporte';
import BotonesExportar from '../components/BotonesExportar';

export default function VistaCompras() {
  const { puede } = usePermission();

  const SUB_TABS = [
    { id: 'generales', label: 'Compras Generales', permiso: 'compras' },
    { id: 'proveedor', label: 'Por Proveedor', permiso: 'compras_proveedor' }
  ];

  const tabsPermitidos = SUB_TABS.filter(t => puede(t.permiso, 'reportes'));

  const [activeTab, setActiveTab] = useState(tabsPermitidos.length > 0 ? tabsPermitidos[0].id : null);
  const [datos, setDatos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [filtros, setFiltros] = useState({});

  const [catalogos, setCatalogos] = useState({ proveedores: [] });

  useEffect(() => {
    reporteService.catalogos.proveedores().then(res => {
      setCatalogos({ proveedores: res.data });
    }).catch(() => {});
  }, []);

  const solicitudIdRef = useRef(0);

  useEffect(() => {
    if (activeTab) buscarDatos();
  }, [activeTab]);

  const cambiarTab = (id) => {
    setDatos([]);
    setResumen(null);
    setActiveTab(id);
  };

  const buscarDatos = async () => {
    const miSolicitud = ++solicitudIdRef.current;
    setCargando(true);
    try {
      const res = await reporteService.compras(activeTab, filtros);
      if (solicitudIdRef.current !== miSolicitud) return;
      setDatos(res.data.data || []);
      setResumen(res.data.resumen || {});
    } catch (err) {
      if (solicitudIdRef.current !== miSolicitud) return;
      console.error(err);
      alert('Error cargando reporte de compras');
    } finally {
      if (solicitudIdRef.current === miSolicitud) setCargando(false);
    }
  };

  const opcionesFiltros = {
    fechas: true,
    proveedores: activeTab === 'proveedor'
  };

  const getColumnas = () => {
    switch (activeTab) {
      case 'generales':
        return [
          { key: 'id_compra', header: 'Nro Compra', render: v => `#${v.toString().padStart(5, '0')}`, excelValue: r => r.id_compra },
          { key: 'fecha_compra', header: 'Fecha', excelValue: r => new Date(r.fecha_compra).toLocaleString() },
          { key: 'empresa', header: 'Proveedor', render: (_, r) => r.empresa || r.representante_legal, excelValue: r => r.empresa || r.representante_legal },
          { key: 'estado', header: 'Estado', align: 'center' },
          { key: 'total', header: 'Total (Bs)', align: 'right', render: v => parseFloat(v).toFixed(2), excelValue: r => parseFloat(r.total) }
        ];
      case 'proveedor':
        return [
          { key: 'nit', header: 'NIT', render: v => v || 'N/A' },
          { key: 'empresa', header: 'Empresa Proveedora' },
          { key: 'cantidad_compras', header: 'Transacciones', align: 'center' },
          { key: 'total_comprado', header: 'Total Comprado (Bs)', align: 'right', render: v => parseFloat(v).toFixed(2), excelValue: r => parseFloat(r.total_comprado) }
        ];
      default: return [];
    }
  };

  if (!activeTab) {
    return <div className="p-8 text-center text-zinc-500">No tienes permisos para ver los reportes de compras.</div>;
  }

  const tituloActual = tabsPermitidos.find(t => t.id === activeTab)?.label || 'Reporte de Compras';

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
          {resumen?.suma_total !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Total Pagado (Bs)</p>
              <p className="text-xl font-black text-red-600 dark:text-red-400">
                {parseFloat(resumen.suma_total).toLocaleString('en-US', {minimumFractionDigits: 2})}
              </p>
            </div>
          )}
        </div>
        
        <BotonesExportar 
          datos={datos} 
          columnas={getColumnas()} 
          titulo={`Reporte_Compras_${tituloActual.replace(/\s+/g, '_')}`}
          resumen={resumen}
          subtitulo={`Filtros aplicados: ${filtros.fechaInicio ? `Desde ${filtros.fechaInicio} Hasta ${filtros.fechaFin}` : 'Todos los tiempos'} ${filtros.id_proveedor ? '| Proveedor: Específico' : ''}`}
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <TablaReporte columnas={getColumnas()} datos={datos} cargando={cargando} />
      </div>
    </div>
  );
}
