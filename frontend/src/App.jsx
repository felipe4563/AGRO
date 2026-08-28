import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider }    from './contexts/AuthContext';
import { AbilityProvider } from './contexts/AbilityContext';
import { ThemeProvider }   from './contexts/ThemeContext';
import { ConfiguracionProvider } from './contexts/ConfiguracionContext';
import ProtectedRoute      from './components/ProtectedRoute';
import Sidebar             from './components/sidebar';
import Topbar              from './components/Topbar';

// ── Pages ────────────────────────────────────────────────────────────────
import Login        from './pages/Login';
import SinPermiso   from './pages/SinPermiso';
import Dashboard    from './pages/Dashboard';
import Roles        from './pages/roles/Roles';
import Usuarios       from './pages/usuarios/Usuarios';
import Sucursales     from './pages/sucursales/Sucursales';
import Productos      from './pages/productos/Productos';
import Catalogos      from './pages/catalogos/Catalogos';
import Clientes       from './pages/clientes/Clientes';
import Proveedores    from './pages/proveedores/Proveedores';
import Compras        from './pages/compras/Compras';
import NuevaCompra    from './pages/compras/NuevaCompra';
import Almacen        from './pages/almacen/Almacen';
import Combos         from './pages/combos/Combos';
import Promociones    from './pages/promociones/Promociones';
import Fidelizacion   from './pages/fidelizacion/Fidelizacion';
import HistorialVentas from './pages/ventas/HistorialVentas';
import NuevaVenta     from './pages/ventas/NuevaVenta';
import VentaTicket    from './pages/ventas/VentaTicket';
import Caja           from './pages/caja/Caja';
import TicketResumenCaja from './pages/caja/TicketResumenCaja';
import LibroCaja      from './pages/caja/LibroCaja';
import CuentasPorCobrar from './pages/cobros/CuentasPorCobrar';
import TicketCobro      from './pages/cobros/TicketCobro';
import LayoutReportes from './pages/reportes/LayoutReportes';
import Backups        from './pages/backups/Backups';
import Configuracion  from './pages/configuracion/Configuracion';
import Perfil          from './pages/perfil/Perfil';

// Nota: Reportes/Órdenes de salida aún no están integrados aquí.

// ── Layout con Sidebar ───────────────────────────────────────────────────
function AppLayout({ children }) {
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem('sidebar_oculto') === '1'; }
    catch { return false; }
  });
  const location = useLocation();

  useEffect(() => {
    setDrawerAbierto(false);
  }, [location.pathname]);

  const ocultarSidebar = () => {
    setOculto(true);
    try { localStorage.setItem('sidebar_oculto', '1'); } catch { /* noop */ }
  };

  // Botón hamburguesa del Topbar: en escritorio muestra/oculta el sidebar fijo;
  // en móvil abre el drawer (ahí el sidebar no ocupa espacio propio).
  const alternarMenu = () => {
    if (window.innerWidth >= 1024) {
      setOculto((v) => {
        const nuevo = !v;
        try { localStorage.setItem('sidebar_oculto', nuevo ? '1' : '0'); } catch { /* noop */ }
        return nuevo;
      });
    } else {
      setDrawerAbierto((v) => !v);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden
                    bg-gray-100  dark:bg-zinc-950
                    transition-colors duration-300">
      <Sidebar
        oculto={oculto}
        onCerrar={ocultarSidebar}
        drawerAbierto={drawerAbierto}
        onCerrarDrawer={() => setDrawerAbierto(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onAbrirMenu={alternarMenu} />
        <main className="flex-1 overflow-y-auto sin-scrollbar
                         bg-gray-100  dark:bg-zinc-950
                         transition-colors duration-300">
          <div className="px-4 sm:px-6 py-4 sm:py-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Rutas protegidas reutilizables ───────────────────────────────────────
// Agrupa ProtectedRoute + AppLayout para no repetir estructura
function PageRoute({ action, subject, children }) {
  return (
    <ProtectedRoute action={action} subject={subject}>
      <AppLayout>
        {children}
      </AppLayout>
    </ProtectedRoute>
  );
}

// ── App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <ConfiguracionProvider>
      <AuthProvider>
        <AbilityProvider>
          <Routes>

            {/* ── Rutas públicas ──────────────────────────────────────── */}
            <Route path="/login"       element={<Login />} />
            <Route path="/sin-permiso" element={<SinPermiso />} />

            {/* ── Roles y permisos ────────────────────────────────────── */}
            <Route path="/roles" element={
              <PageRoute action="ver" subject="roles">
                <Roles />
              </PageRoute>
            }/>

            {/* ── Usuarios ───────────────────────────────────────────── */}
            <Route path="/usuarios" element={
              <PageRoute action="ver" subject="usuarios">
                <Usuarios />
              </PageRoute>
            }/>

            {/* ── Sucursales ───────────────────────────────────────────── */}
            <Route path="/sucursales" element={
              <PageRoute action="ver" subject="sucursales">
                <Sucursales />
              </PageRoute>
            }/>

            {/* ── Productos ────────────────────────────────────────────── */}
            <Route path="/productos" element={
              <PageRoute action="ver" subject="productos">
                <Productos />
              </PageRoute>
            }/>

            {/* ── Catálogos ────────────────────────────────────────────── */}
            <Route path="/catalogos" element={
              <PageRoute action="ver" subject="clasificaciones">
                <Catalogos />
              </PageRoute>
            }/>

            {/* ── Clientes ─────────────────────────────────────────────── */}
            <Route path="/clientes" element={
              <PageRoute action="ver" subject="clientes">
                <Clientes />
              </PageRoute>
            }/>

            {/* ── Proveedores ──────────────────────────────────────────── */}
            <Route path="/proveedores" element={
              <PageRoute action="ver" subject="proveedores">
                <Proveedores />
              </PageRoute>
            }/>

            {/* ── Compras ────────────────────────────────────────────── */}
            <Route path="/compras" element={
              <PageRoute action="ver" subject="compras">
                <Compras />
              </PageRoute>
            }/>
            <Route path="/compras/nueva" element={
              <PageRoute action="crear" subject="compras">
                <NuevaCompra />
              </PageRoute>
            }/>

            {/* ── Almacén ────────────────────────────────────────────── */}
            <Route path="/almacen" element={
              <PageRoute action="ver" subject="almacen">
                <Almacen />
              </PageRoute>
            }/>

            {/* ── Combos ─────────────────────────────────────────────── */}
            <Route path="/combos" element={
              <PageRoute action="ver" subject="combos">
                <Combos />
              </PageRoute>
            }/>

            {/* ── Promociones ────────────────────────────────────────── */}
            <Route path="/promociones" element={
              <PageRoute action="ver" subject="promociones">
                <Promociones />
              </PageRoute>
            }/>

            {/* ── Fidelización ───────────────────────────────────────── */}
            <Route path="/fidelizacion" element={
              <PageRoute action="ver" subject="fidelizacion">
                <Fidelizacion />
              </PageRoute>
            }/>

            {/* ── Ventas (POS) ───────────────────────────────────────── */}
            <Route path="/ventas" element={
              <PageRoute action="ver" subject="ventas">
                <HistorialVentas />
              </PageRoute>
            }/>
            <Route path="/ventas/nueva" element={
              <PageRoute action="crear" subject="ventas">
                <NuevaVenta />
              </PageRoute>
            }/>
            {/* Sin AppLayout: página full-screen para impresión 80mm */}
            <Route path="/ventas/:id/ticket" element={
              <ProtectedRoute action="ver" subject="ventas">
                <VentaTicket />
              </ProtectedRoute>
            }/>

            {/* ── Cuentas por Cobrar ───────────────────────────────────── */}
            <Route path="/cobros" element={
              <PageRoute action="ver" subject="cobros">
                <CuentasPorCobrar />
              </PageRoute>
            }/>
            {/* Sin AppLayout: página full-screen para impresión 80mm */}
            <Route path="/cobros/pagos/:id/ticket" element={
              <ProtectedRoute action="ver" subject="cobros">
                <TicketCobro />
              </ProtectedRoute>
            }/>

            {/* ── Caja ───────────────────────────────────────────────── */}
            <Route path="/caja" element={
              <PageRoute action="ver" subject="caja">
                <Caja />
              </PageRoute>
            }/>
            {/* Sin AppLayout: página full-screen para impresión 80mm */}
            <Route path="/caja/turnos/:id/resumen" element={
              <ProtectedRoute action="ver_historial" subject="caja">
                <TicketResumenCaja />
              </ProtectedRoute>
            }/>
            <Route path="/caja/libro" element={
              <PageRoute action="ver_libro" subject="caja">
                <LibroCaja />
              </PageRoute>
            }/>

            {/* ── Reportes ───────────────────────────────────────────── */}
            {/* No existe 'reportes.ver' en BD; acceso si tiene cualquier permiso de reportes */}
            <Route path="/reportes" element={
              <ProtectedRoute anyPermission={[
                { action: 'ventas_diarias',        subject: 'reportes' },
                { action: 'ventas_rango',          subject: 'reportes' },
                { action: 'ventas_vendedor',       subject: 'reportes' },
                { action: 'ventas_producto',       subject: 'reportes' },
                { action: 'ventas_cliente',        subject: 'reportes' },
                { action: 'compras',               subject: 'reportes' },
                { action: 'compras_proveedor',     subject: 'reportes' },
                { action: 'inventario',            subject: 'reportes' },
                { action: 'inventario_valorizado', subject: 'reportes' },
                { action: 'ganancias',             subject: 'reportes' },
                { action: 'ganancias_producto',    subject: 'reportes' },
                { action: 'top_productos',         subject: 'reportes' },
                { action: 'vencimientos',          subject: 'reportes' },
                { action: 'stock_bajo',            subject: 'reportes' },
                { action: 'kardex',                subject: 'reportes' },
                { action: 'traslados',             subject: 'reportes' },
                { action: 'comparativo_sucursales',subject: 'reportes' },
                { action: 'caja',                  subject: 'reportes' },
              ]}>
                <AppLayout>
                  <LayoutReportes />
                </AppLayout>
              </ProtectedRoute>
            }/>

            {/* ── Backups ────────────────────────────────────────────── */}
            <Route path="/backups" element={
              <PageRoute action="ver" subject="roles">
                <Backups />
              </PageRoute>
            }/>

            {/* ── Configuración del negocio ────────────────────────────── */}
            <Route path="/configuracion" element={
              <PageRoute action="ver" subject="configuracion">
                <Configuracion />
              </PageRoute>
            }/>

            {/* ── Dashboard ───────────────────────────────────────────── */}
            <Route path="/dashboard" element={
              <PageRoute>
                <Dashboard />
              </PageRoute>
            }/>

            {/* ── Perfil (autoservicio) ──────────────────────────────── */}
            <Route path="/perfil" element={
              <PageRoute>
                <Perfil />
              </PageRoute>
            }/>


            {/* ── Redirigir raíz y rutas desconocidas ─────────────────── */}
            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/dashboard" replace />} />

          </Routes>
        </AbilityProvider>
      </AuthProvider>
      </ConfiguracionProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}