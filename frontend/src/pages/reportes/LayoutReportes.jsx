import { useState } from 'react';
import { usePermission } from '../../hooks/usePermission';
import PageWrapper from '../../components/PageWrapper';
import DashboardReportes from './DashboardReportes';
import VistaVentas from './vistas/VistaVentas';
import VistaCompras from './vistas/VistaCompras';
import VistaInventario from './vistas/VistaInventario';
import VistaGanancias from './vistas/VistaGanancias';
import VistaSucursales from './vistas/VistaSucursales';
import VistaCaja from './vistas/VistaCaja';

export default function LayoutReportes() {
  const { puede } = usePermission();

  // Definición estructurada de las pestañas principales
  const TABS = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icono: '🖥️',
      component: <DashboardReportes />,
      visible: puede('ganancias', 'reportes')
    },
    {
      id: 'ganancias',
      label: 'Ganancias',
      icono: '📈',
      component: <VistaGanancias />,
      visible: puede('ganancias', 'reportes') || puede('top_productos', 'reportes')
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icono: '🧾',
      component: <VistaVentas />,
      visible: puede('ventas_diarias', 'reportes') || puede('ventas_rango', 'reportes') || puede('ventas_vendedor', 'reportes') || puede('ventas_producto', 'reportes') || puede('ventas_cliente', 'reportes')
    },
    {
      id: 'compras',
      label: 'Compras',
      icono: '🛒',
      component: <VistaCompras />,
      visible: puede('compras', 'reportes') || puede('compras_proveedor', 'reportes')
    },
    {
      id: 'inventario',
      label: 'Inventario',
      icono: '📦',
      component: <VistaInventario />,
      visible: puede('inventario', 'reportes') || puede('inventario_valorizado', 'reportes') || puede('stock_bajo', 'reportes') || puede('vencimientos', 'reportes') || puede('kardex', 'reportes')
    },
    {
      id: 'sucursales',
      label: 'Sucursales',
      icono: '🏢',
      component: <VistaSucursales />,
      visible: puede('traslados', 'reportes') || puede('comparativo_sucursales', 'reportes')
    },
    {
      id: 'caja',
      label: 'Caja',
      icono: '🏧',
      component: <VistaCaja />,
      visible: puede('caja', 'reportes')
    }
  ];

  // Filtrar pestañas visibles según permisos
  const tabsVisibles = TABS.filter(t => t.visible);

  const [activeTab, setActiveTab] = useState(tabsVisibles.length > 0 ? tabsVisibles[0].id : null);

  if (tabsVisibles.length === 0) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">Acceso Denegado</h1>
          <p className="text-zinc-500 max-w-md">No tienes permisos asignados para visualizar ningún reporte. Contacta a un administrador.</p>
        </div>
      </PageWrapper>
    );
  }

  const activeComponent = tabsVisibles.find(t => t.id === activeTab)?.component;

  return (
    <PageWrapper>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2 tracking-tight">
            📊 Centro de Reportes ERP
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Analíticas avanzadas y exportación de documentos (PDF/Excel).
          </p>
        </div>
      </div>

      {/* Navegación Horizontal de Pestañas tipo SaaS */}
      <div className="relative mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex overflow-x-auto gap-1 sm:gap-2 pb-2 sin-scrollbar">
          {tabsVisibles.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 px-3 sm:px-5 py-2.5 sm:py-3 rounded-t-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border-b-2 -mb-[2px] ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="text-base sm:text-lg">{tab.icono}</span>
              {tab.label}
            </button>
          ))}
        </div>
        {/* Degradados en los bordes que insinúan que hay más pestañas por scrollear (móvil) */}
        <div className="sm:hidden pointer-events-none absolute top-0 left-0 h-full w-6 bg-gradient-to-r from-gray-100 dark:from-zinc-950 to-transparent" />
        <div className="sm:hidden pointer-events-none absolute top-0 right-0 h-full w-6 bg-gradient-to-l from-gray-100 dark:from-zinc-950 to-transparent" />
      </div>

      {/* Contenido Dinámico de la Pestaña Activa */}
      <div className="animate-fade-in">
        {activeComponent}
      </div>

    </PageWrapper>
  );
}
