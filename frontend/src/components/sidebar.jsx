import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermission }     from '../hooks/usePermission';
import cobroService          from '../services/cobro.service';
import cuentaPagarService    from '../services/cuentaPagar.service';
import { useConfiguracion }  from '../contexts/ConfiguracionContext';

const MENU_GROUPS = [
  {
    label: 'Operación',
    items: [
      { label: 'Dashboard',    path: '/dashboard', icono: 'dashboard', action: null,  subject: null },
      { label: 'Ventas (POS)', path: '/ventas',     icono: 'ventas', action: 'ver', subject: 'ventas' },
      { label: 'Cuentas por Cobrar', path: '/cobros', icono: 'cobros', action: 'ver', subject: 'cobros', badgeKey: 'cobros' },
      { label: 'Cuentas por Pagar', path: '/cuentas-pagar', icono: 'cuentas_pagar', action: 'ver', subject: 'cuentas_pagar', badgeKey: 'cuentas_pagar' },
      { label: 'Caja',         path: '/caja',       icono: 'caja', action: 'ver', subject: 'caja' },
      { label: 'Libro de Caja', path: '/caja/libro', icono: 'libro', action: 'ver_libro', subject: 'caja' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Productos',          path: '/productos', icono: 'productos', action: 'ver', subject: 'productos' },
      { label: 'Catálogos',          path: '/catalogos', icono: 'catalogos', action: 'ver', subject: 'clasificaciones' },
      { label: 'Almacén (Stock)',    path: '/almacen',   icono: 'almacen', action: 'ver', subject: 'almacen' },
      { label: 'Compras / Ingresos', path: '/compras',   icono: 'compras', action: 'ver', subject: 'compras' },
      { label: 'Combos',             path: '/combos',      icono: 'combos', action: 'ver', subject: 'combos' },
      { label: 'Promociones',        path: '/promociones', icono: 'promociones', action: 'ver', subject: 'promociones' },
    ],
  },
  {
    label: 'Terceros',
    items: [
      { label: 'Clientes',    path: '/clientes',    icono: 'clientes', action: 'ver', subject: 'clientes' },
      { label: 'Proveedores', path: '/proveedores', icono: 'proveedores', action: 'ver', subject: 'proveedores' },
      { label: 'Fidelización', path: '/fidelizacion', icono: 'fidelizacion', action: 'ver', subject: 'fidelizacion' },
    ],
  },
  {
    label: 'Reportes',
    collapsible: true,
    items: [
      { label: 'Reportes', path: '/reportes', icono: 'reportes', action: null, subject: null,
        anyPermission: [
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
        ]
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Sucursales',       path: '/sucursales', icono: 'sucursales', action: 'ver', subject: 'sucursales' },
      { label: 'Usuarios',         path: '/usuarios',   icono: 'usuarios', action: 'ver', subject: 'usuarios' },
      { label: 'Roles y Permisos', path: '/roles',      icono: 'roles', action: 'ver', subject: 'roles' },
      { label: 'Configuración',    path: '/configuracion', icono: 'configuracion', action: 'ver', subject: 'configuracion' },
    ],
  },
];

// ── Íconos de línea (inline SVG, sin dependencias externas) ────────────────
const ICONS = {
  dashboard: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  ventas: 'M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.876-4.79 2.182-7.407.055-.468-.311-.868-.782-.868H5.106M7.5 14.25 5.106 5.272M6 18.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z',
  cobros: 'M2.25 8.25c0-1.036.84-1.875 1.875-1.875h15.75c1.035 0 1.875.84 1.875 1.875v7.5A1.875 1.875 0 0 1 19.875 17.625H4.125A1.875 1.875 0 0 1 2.25 15.75v-7.5ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  cuentas_pagar: 'M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6.75A2.25 2.25 0 0 0 18.75 4.5H5.25A2.25 2.25 0 0 0 3 6.75V9',
  caja: 'M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm2.25-4.5h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5V13.5Zm0 2.25h.008v.008H10.5v-.008Zm2.25-4.5h.008v.008H12.75v-.008Zm0 2.25h.008v.008H12.75V13.5Zm0 2.25h.008v.008H12.75v-.008ZM15 9.75V18M6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75Zm7.5 3.75h3v3h-3v-3Z',
  libro: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
  productos: 'M21 7.5l-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9',
  catalogos: 'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3ZM6 6h.008v.008H6V6Z',
  almacen: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375C2.754 3.75 2.25 4.254 2.25 4.875v1.5c0 .621.504 1.125 1.125 1.125Z',
  compras: 'M8.25 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18.75 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z M3.75 3h1.386c.51 0 .955.343 1.087.836l.383 1.437m0 0L8.25 13.5h8.25L18.75 6H5.606m-.383-1.437L5.25 6m0 0h13.5',
  combos: 'M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v2.25c0 .621.504 1.125 1.125 1.125Z',
  promociones: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.048 8.287 8.287 0 0 0 9 9.6a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z',
  clientes: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  proveedores: 'M8.25 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18.75 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z M8.25 18.75h-1.5a.75.75 0 0 1-.75-.75V9a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 .75.75v.75m0 0h3.373a.75.75 0 0 1 .67.415l1.539 3.077a.75.75 0 0 1 .08.336V17.25a.75.75 0 0 1-.75.75h-1.5m-6.75 0H9m6.75 0v-9',
  fidelizacion: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 21.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z',
  reportes: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  sucursales: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  usuarios: 'M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  roles: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
  configuracion: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
};

function Icon({ name, className = 'w-5 h-5' }) {
  const d = ICONS[name];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
         className={className} aria-hidden="true">
      {d
        ? <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        : <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}

// ── Ítem de navegación ────────────────────────────────────────────────────
function MenuItem({ path, label, icono, onNavegar, badge }) {
  return (
    <NavLink
      to={path}
      end
      onClick={onNavegar}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
         transition-all duration-200 ${
          isActive
            ? 'bg-yellow-400 text-zinc-900 shadow-md shadow-yellow-400/20'
            : `text-zinc-500 dark:text-zinc-400
               hover:bg-zinc-100 dark:hover:bg-zinc-800
               hover:text-zinc-900 dark:hover:text-white`
        }`
      }
    >
      <Icon name={icono} className="w-5 h-5 shrink-0" />
      <span className="truncate flex-1">{label}</span>
      {!!badge && (
        <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full
                         bg-red-500 text-white text-[11px] font-bold
                         flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

// ── Grupo de navegación (con soporte de acordeón) ────────────────────────
function MenuGroup({ label, items, collapsible, onNavegar, badges }) {
  const location = useLocation();
  const contieneActivo = items.some((item) => location.pathname.startsWith(item.path));
  const [abierto, setAbierto] = useState(!collapsible || contieneActivo);

  useEffect(() => {
    if (collapsible && contieneActivo) setAbierto(true);
  }, [collapsible, contieneActivo]);

  if (items.length === 0) return null;

  return (
    <div className="mb-1">
      {collapsible ? (
        <button
          onClick={() => setAbierto((v) => !v)}
          className="w-full flex items-center justify-between px-3 mb-1
                     text-xs font-semibold uppercase tracking-widest
                     text-zinc-400 dark:text-zinc-600
                     hover:text-zinc-600 dark:hover:text-zinc-400
                     transition-colors"
        >
          {label}
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-widest
                      text-zinc-400 dark:text-zinc-600 px-3 mb-1">
          {label}
        </p>
      )}
      <div
        className={`space-y-0.5 overflow-hidden transition-all duration-200
                    ${collapsible && !abierto ? 'max-h-0' : 'max-h-[1000px]'}`}
      >
        {items.map((item) => (
          <MenuItem key={item.path} {...item} onNavegar={onNavegar} badge={badges?.[item.badgeKey]} />
        ))}
      </div>
    </div>
  );
}

// ── Contenido del sidebar (logo + navegación) ─────────────────────────────
// onCerrar: click en la X del encabezado. onNavegar: click en un enlace del
// menú — solo debe cerrar en el drawer móvil, nunca en el sidebar fijo de escritorio.
function SidebarContent({ onCerrar, onNavegar }) {
  const { puede } = usePermission();
  const { nombreEmpresa, logoUrl } = useConfiguracion();
  const [badges, setBadges] = useState({});

  const puedeVer = ({ action, subject, anyPermission }) => {
    if (anyPermission) return anyPermission.some(p => puede(p.action, p.subject));
    if (!action || !subject) return true;
    return puede(action, subject);
  };

  const gruposVisibles = MENU_GROUPS
    .map((grupo) => ({ ...grupo, items: grupo.items.filter(puedeVer) }))
    .filter((grupo) => grupo.items.length > 0);

  useEffect(() => {
    if (!puede('ver', 'cobros')) return;
    let activo = true;
    cobroService.listar()
      .then((res) => { if (activo) setBadges((b) => ({ ...b, cobros: res.data?.length ?? 0 })); })
      .catch(() => {});
    return () => { activo = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!puede('ver', 'cuentas_pagar')) return;
    let activo = true;
    cuentaPagarService.listar()
      .then((res) => { if (activo) setBadges((b) => ({ ...b, cuentas_pagar: res.data?.length ?? 0 })); })
      .catch(() => {});
    return () => { activo = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full
                    bg-white dark:bg-zinc-900
                    border-r border-zinc-200 dark:border-zinc-800
                    transition-colors duration-300">

      {/* ── LOGO + cerrar ─────────────────────────────────────────────── */}
      <div className="h-14 shrink-0 flex items-center gap-2 px-3
                      border-b border-zinc-200 dark:border-zinc-800">
        <img
          src={logoUrl}
          alt="Logo"
          className="w-8 h-8 object-contain shrink-0"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-900 dark:text-white truncate leading-tight">
            {nombreEmpresa}
          </p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate leading-tight">
            Sistema de Gestión
          </p>
        </div>
        <button
          onClick={onCerrar}
          aria-label="Cerrar menú"
          className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0
                     text-zinc-400 dark:text-zinc-500
                     hover:bg-zinc-100 dark:hover:bg-zinc-800
                     hover:text-zinc-900 dark:hover:text-white
                     transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor"
               strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── NAVEGACIÓN ───────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-3
                      [&::-webkit-scrollbar]:w-1.5
                      [&::-webkit-scrollbar-track]:bg-transparent
                      [&::-webkit-scrollbar-thumb]:rounded-full
                      [&::-webkit-scrollbar-thumb]:bg-zinc-200
                      dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
        {gruposVisibles.map((grupo) => (
          <MenuGroup key={grupo.label} {...grupo} onNavegar={onNavegar} badges={badges} />
        ))}
      </nav>
    </div>
  );
}

// ── Sidebar principal ─────────────────────────────────────────────────────
// oculto/drawerAbierto se controlan desde AppLayout (App.jsx) porque el
// Topbar, que vive fuera de este componente, también necesita ese estado
// para su botón de hamburguesa.
export default function Sidebar({ oculto, onCerrar, drawerAbierto, onCerrarDrawer }) {
  useEffect(() => {
    document.body.style.overflow = drawerAbierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerAbierto]);

  return (
    <>
      {/* DESKTOP — un clic en un enlace del menú NO debe ocultarlo, solo la X */}
      {!oculto && (
        <aside className="hidden lg:flex w-64 shrink-0 flex-col h-screen sticky top-0">
          <SidebarContent onCerrar={onCerrar} />
        </aside>
      )}

      {/* MOBILE — overlay */}
      <div
        onClick={onCerrarDrawer}
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm
                    transition-opacity duration-300
                    ${drawerAbierto
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none'}`}
      />

      {/* MOBILE — drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50
                    shadow-2xl shadow-black/40
                    transform transition-transform duration-300 ease-in-out
                    ${drawerAbierto ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent onCerrar={onCerrarDrawer} onNavegar={onCerrarDrawer} />
      </div>
    </>
  );
}
