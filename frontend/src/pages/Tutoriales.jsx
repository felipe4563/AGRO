import { useState } from 'react';
import { usePermission } from '../hooks/usePermission';
import PageWrapper from '../components/PageWrapper';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

// Cada tutorial requiere al menos uno de los permisos listados para
// mostrarse (como el ítem "Reportes" del sidebar). Sin `permisos`, es
// visible para cualquiera con sesión (ej. introducción general).
const TUTORIALES = [
  {
    archivo: '01-introduccion.mp4',
    titulo: 'Introducción',
    subtitulo: 'Entrar al sistema, Dashboard, modo oscuro y perfil.',
    permisos: null,
  },
  {
    archivo: '02-operacion.mp4',
    titulo: 'Operación diaria',
    subtitulo: 'Ventas (POS), Cuentas por Cobrar/Pagar, Caja y Libro de Caja.',
    permisos: [
      { action: 'ver', subject: 'ventas' },
      { action: 'ver', subject: 'cobros' },
      { action: 'ver', subject: 'cuentas_pagar' },
      { action: 'ver', subject: 'caja' },
    ],
  },
  {
    archivo: '03-inventario.mp4',
    titulo: 'Inventario',
    subtitulo: 'Productos, Catálogos, Almacén, Compras, Combos y Promociones.',
    permisos: [
      { action: 'ver', subject: 'productos' },
      { action: 'ver', subject: 'clasificaciones' },
      { action: 'ver', subject: 'almacen' },
      { action: 'ver', subject: 'compras' },
      { action: 'ver', subject: 'combos' },
      { action: 'ver', subject: 'promociones' },
    ],
  },
  {
    archivo: '04-terceros.mp4',
    titulo: 'Clientes y Proveedores',
    subtitulo: 'Clientes, Proveedores y Fidelización.',
    permisos: [
      { action: 'ver', subject: 'clientes' },
      { action: 'ver', subject: 'proveedores' },
      { action: 'ver', subject: 'fidelizacion' },
    ],
  },
  {
    archivo: '05-reportes.mp4',
    titulo: 'Reportes',
    subtitulo: 'Centro de Reportes: Dashboard gerencial, Ganancias, Ventas, Compras, Inventario, Sucursales y Caja.',
    permisos: [
      { action: 'ventas_diarias', subject: 'reportes' },
      { action: 'ventas_rango', subject: 'reportes' },
      { action: 'ventas_vendedor', subject: 'reportes' },
      { action: 'ventas_producto', subject: 'reportes' },
      { action: 'ventas_cliente', subject: 'reportes' },
      { action: 'compras', subject: 'reportes' },
      { action: 'compras_proveedor', subject: 'reportes' },
      { action: 'inventario', subject: 'reportes' },
      { action: 'inventario_valorizado', subject: 'reportes' },
      { action: 'ganancias', subject: 'reportes' },
      { action: 'ganancias_producto', subject: 'reportes' },
      { action: 'top_productos', subject: 'reportes' },
      { action: 'vencimientos', subject: 'reportes' },
      { action: 'stock_bajo', subject: 'reportes' },
      { action: 'kardex', subject: 'reportes' },
      { action: 'traslados', subject: 'reportes' },
      { action: 'comparativo_sucursales', subject: 'reportes' },
      { action: 'caja', subject: 'reportes' },
    ],
  },
  {
    archivo: '06-administracion.mp4',
    titulo: 'Administración',
    subtitulo: 'Sucursales, Usuarios, Roles y Permisos, y Configuración del negocio.',
    permisos: [
      { action: 'ver', subject: 'sucursales' },
      { action: 'ver', subject: 'usuarios' },
      { action: 'ver', subject: 'roles' },
      { action: 'ver', subject: 'configuracion' },
    ],
  },
];

export default function Tutoriales() {
  const { puede } = usePermission();
  const [abierto, setAbierto] = useState(null);

  const visibles = TUTORIALES.filter(
    (t) => !t.permisos || t.permisos.some((p) => puede(p.action, p.subject))
  );

  return (
    <PageWrapper>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold mb-1">Tutoriales</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Videos cortos que explican cómo usar el sistema, módulo por módulo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibles.map((t) => {
            const estaAbierto = abierto === t.archivo;
            return (
              <div
                key={t.archivo}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800
                           bg-white dark:bg-zinc-900 overflow-hidden"
              >
                {estaAbierto ? (
                  <video
                    className="w-full aspect-video bg-black"
                    src={`${API_BASE}/tutoriales/${t.archivo}`}
                    controls
                    autoPlay
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAbierto(t.archivo)}
                    className="w-full aspect-video flex items-center justify-center
                               bg-zinc-100 dark:bg-zinc-800 group"
                  >
                    <span className="w-14 h-14 rounded-full bg-white/90 dark:bg-zinc-900/90
                                     flex items-center justify-center shadow
                                     group-hover:scale-105 transition-transform">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-0.5 text-emerald-600 dark:text-emerald-400">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </button>
                )}
                <div className="p-4">
                  <h2 className="font-medium text-sm">{t.titulo}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t.subtitulo}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
