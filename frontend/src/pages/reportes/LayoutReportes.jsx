import { useState, useRef, useEffect, useCallback } from 'react';
import { usePermission } from '../../hooks/usePermission';
import PageWrapper from '../../components/PageWrapper';
import DashboardReportes from './DashboardReportes';
import VistaVentas from './vistas/VistaVentas';
import VistaCompras from './vistas/VistaCompras';
import VistaInventario from './vistas/VistaInventario';
import VistaGanancias from './vistas/VistaGanancias';
import VistaSucursales from './vistas/VistaSucursales';
import VistaCaja from './vistas/VistaCaja';

const ICONOS_TAB = {
  dashboard: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5V6a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 6v7.5M3 13.5h18M3 13.5v4.5A1.5 1.5 0 004.5 19.5h15a1.5 1.5 0 001.5-1.5v-4.5M8 19.5v-3m8 3v-3" />
    </svg>
  ),
  ganancias: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8m0 0h-5m5 0v5" />
    </svg>
  ),
  ventas: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  compras: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.999-4.706 2.62-7.201.128-.513-.26-1.01-.789-1.01H5.25M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  ),
  inventario: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  sucursales: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  caja: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
};

export default function LayoutReportes() {
  const { puede } = usePermission();

  // Definición estructurada de las pestañas principales
  const TABS = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      component: <DashboardReportes />,
      visible: puede('ganancias', 'reportes')
    },
    {
      id: 'ganancias',
      label: 'Ganancias',
      component: <VistaGanancias />,
      visible: puede('ganancias', 'reportes') || puede('top_productos', 'reportes')
    },
    {
      id: 'ventas',
      label: 'Ventas',
      component: <VistaVentas />,
      visible: puede('ventas_diarias', 'reportes') || puede('ventas_rango', 'reportes') || puede('ventas_vendedor', 'reportes') || puede('ventas_producto', 'reportes') || puede('ventas_cliente', 'reportes')
    },
    {
      id: 'compras',
      label: 'Compras',
      component: <VistaCompras />,
      visible: puede('compras', 'reportes') || puede('compras_proveedor', 'reportes')
    },
    {
      id: 'inventario',
      label: 'Inventario',
      component: <VistaInventario />,
      visible: puede('inventario', 'reportes') || puede('inventario_valorizado', 'reportes') || puede('stock_bajo', 'reportes') || puede('vencimientos', 'reportes') || puede('kardex', 'reportes')
    },
    {
      id: 'sucursales',
      label: 'Sucursales',
      component: <VistaSucursales />,
      visible: puede('traslados', 'reportes') || puede('comparativo_sucursales', 'reportes')
    },
    {
      id: 'caja',
      label: 'Caja',
      component: <VistaCaja />,
      visible: puede('caja', 'reportes')
    }
  ];

  // Filtrar pestañas visibles según permisos
  const tabsVisibles = TABS.filter(t => t.visible);

  const [activeTab, setActiveTab] = useState(tabsVisibles.length > 0 ? tabsVisibles[0].id : null);

  // Flechas y degradados de la barra de pestañas: solo se muestran cuando
  // realmente hay contenido oculto a ese lado (evita mostrarlos si todas
  // las pestañas ya caben en pantalla).
  const scrollRef = useRef(null);
  const [puedeScrollIzq, setPuedeScrollIzq] = useState(false);
  const [puedeScrollDer, setPuedeScrollDer] = useState(false);

  const actualizarScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setPuedeScrollIzq(el.scrollLeft > 4);
    setPuedeScrollDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    actualizarScrollState();
    window.addEventListener('resize', actualizarScrollState);
    return () => window.removeEventListener('resize', actualizarScrollState);
  }, [actualizarScrollState, tabsVisibles.length]);

  const desplazarTabs = (direccion) => {
    scrollRef.current?.scrollBy({ left: direccion * 200, behavior: 'smooth' });
  };

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
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <svg className="w-6 h-6 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5V6a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 6v7.5M3 13.5h18M3 13.5v4.5A1.5 1.5 0 004.5 19.5h15a1.5 1.5 0 001.5-1.5v-4.5M8 19.5v-3m8 3v-3" />
            </svg>
            Centro de Reportes ERP
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Analíticas avanzadas y exportación de documentos (PDF/Excel).
          </p>
        </div>
      </div>

      {/* Navegación Horizontal de Pestañas tipo SaaS */}
      <div className="relative mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div
          ref={scrollRef}
          onScroll={actualizarScrollState}
          className="flex overflow-x-auto gap-1 sm:gap-2 pb-2 sin-scrollbar"
        >
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
              {ICONOS_TAB[tab.id]}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Aviso + acceso rápido de que hay más pestañas por scrollear, en cualquier tamaño de pantalla */}
        {puedeScrollIzq && (
          <>
            <div className="pointer-events-none absolute top-0 left-0 h-[calc(100%-8px)] w-8 bg-gradient-to-r from-gray-100 dark:from-zinc-950 to-transparent" />
            <button
              type="button"
              onClick={() => desplazarTabs(-1)}
              aria-label="Ver pestañas anteriores"
              className="absolute left-0 top-1/2 -translate-y-1/2 -mt-1 z-10 hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-500 hover:text-emerald-600 hover:border-emerald-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
          </>
        )}
        {puedeScrollDer && (
          <>
            <div className="pointer-events-none absolute top-0 right-0 h-[calc(100%-8px)] w-8 bg-gradient-to-l from-gray-100 dark:from-zinc-950 to-transparent" />
            <button
              type="button"
              onClick={() => desplazarTabs(1)}
              aria-label="Ver más pestañas"
              className="absolute right-0 top-1/2 -translate-y-1/2 -mt-1 z-10 hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-500 hover:text-emerald-600 hover:border-emerald-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Contenido Dinámico de la Pestaña Activa */}
      <div className="animate-fade-in">
        {activeComponent}
      </div>

    </PageWrapper>
  );
}
