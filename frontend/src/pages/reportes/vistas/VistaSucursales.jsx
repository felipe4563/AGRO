import { useState, useEffect, useRef } from 'react';
import { usePermission } from '../../../hooks/usePermission';
import reporteService from '../../../services/reporte.service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import FiltrosAvanzados from '../components/FiltrosAvanzados';
import TablaReporte from '../components/TablaReporte';
import BotonesExportar from '../components/BotonesExportar';

const ESTADO_BADGE = {
  PENDIENTE:   'bg-yellow-100 text-yellow-800 border-yellow-300',
  CONFIRMADO:  'bg-emerald-100 text-emerald-800 border-emerald-300',
  CANCELADO:   'bg-red-100 text-red-800 border-red-300'
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function VistaSucursales() {
  const { puede } = usePermission();

  const SUB_TABS = [
    { id: 'traslados',   label: 'Traslados',             permiso: 'traslados' },
    { id: 'comparativo', label: 'Comparativo Sucursales', permiso: 'comparativo_sucursales' }
  ];

  const tabsPermitidos = SUB_TABS.filter(t => puede(t.permiso, 'reportes'));
  const [activeTab, setActiveTab] = useState(tabsPermitidos.length > 0 ? tabsPermitidos[0].id : null);

  const [datos, setDatos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [filtros, setFiltros] = useState({});
  const [cargando, setCargando] = useState(false);

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
      let res;
      if (activeTab === 'traslados') {
        res = await reporteService.traslados(filtros);
      } else {
        res = await reporteService.comparativoSucursales(filtros);
      }
      if (solicitudIdRef.current !== miSolicitud) return;
      setDatos(res.data.data || []);
      setResumen(res.data.resumen || {});
    } catch (err) {
      if (solicitudIdRef.current !== miSolicitud) return;
      console.error(err);
    } finally {
      if (solicitudIdRef.current === miSolicitud) setCargando(false);
    }
  };

  const columnasTraslados = [
    { key: 'id_traslado', header: 'Nro', render: v => `#${String(v).padStart(4,'0')}`, excelValue: r => r.id_traslado },
    { key: 'fecha_traslado', header: 'Fecha', excelValue: r => new Date(r.fecha_traslado).toLocaleString() },
    { key: 'producto_nombre', header: 'Producto' },
    { key: 'numero_lote', header: 'Lote', render: v => v || 'N/A' },
    { key: 'sucursal_origen', header: 'Origen' },
    { key: 'sucursal_destino', header: 'Destino' },
    { key: 'cantidad_cajas', header: 'Cajas', align: 'center' },
    { key: 'cantidad_unidades', header: 'Unidades', align: 'center' },
    { key: 'estado', header: 'Estado', align: 'center', render: v => (
      <span className={`px-2 py-0.5 text-xs font-bold rounded border ${ESTADO_BADGE[v] || ''}`}>{v}</span>
    ), excelValue: r => r.estado },
    { key: 'usuario_nombre', header: 'Registró', render: (_, r) => `${r.usuario_nombre} ${r.usuario_apellido}`, excelValue: r => `${r.usuario_nombre} ${r.usuario_apellido}` }
  ];

  const columnasComparativo = [
    { key: 'sucursal', header: 'Sucursal' },
    { key: 'ciudad', header: 'Ciudad', render: v => v || 'N/A' },
    { key: 'total_ventas', header: 'Nro Ventas', align: 'center' },
    { key: 'total_ingresos', header: 'Ingresos (Bs)', align: 'right', render: v => parseFloat(v).toFixed(2), excelValue: r => parseFloat(r.total_ingresos) },
    { key: 'total_descuentos', header: 'Descuentos (Bs)', align: 'right', render: v => parseFloat(v).toFixed(2), excelValue: r => parseFloat(r.total_descuentos) },
    { key: 'ganancia_bruta', header: 'Ganancia Bruta (Bs)', align: 'right',
      render: v => <span className={parseFloat(v) >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{parseFloat(v).toFixed(2)}</span>,
      excelValue: r => parseFloat(r.ganancia_bruta) }
  ];

  const columnas = activeTab === 'traslados' ? columnasTraslados : columnasComparativo;
  const tituloActual = tabsPermitidos.find(t => t.id === activeTab)?.label || 'Reporte';

  if (!activeTab) {
    return <div className="p-8 text-center text-zinc-500">No tienes permisos para ver reportes de sucursales.</div>;
  }

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
        opciones={{ fechas: true }}
        catalogos={{}}
      />

      {/* Gráfico comparativo (solo para comparativo) */}
      {activeTab === 'comparativo' && datos.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">Ingresos por Sucursal (Bs)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <BarChart data={datos} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} />
                <XAxis dataKey="sucursal" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(v) => [`Bs ${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Ingresos']}
                />
                <Bar dataKey="total_ingresos" radius={[4, 4, 0, 0]}>
                  {datos.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Registros</p>
            <p className="text-xl font-black text-zinc-900 dark:text-white">{resumen?.total_registros || 0}</p>
          </div>
          {activeTab === 'comparativo' && resumen?.total_global !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Total Global (Bs)</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {parseFloat(resumen.total_global).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
        <BotonesExportar
          datos={datos}
          columnas={columnas}
          titulo={`Reporte_${tituloActual.replace(/\s+/g, '_')}`}
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <TablaReporte columnas={columnas} datos={datos} cargando={cargando} />
      </div>
    </div>
  );
}
