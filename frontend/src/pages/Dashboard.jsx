import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }       from '../contexts/AuthContext';
import { usePermission } from '../hooks/usePermission';
import reporteService    from '../services/reporte.service';
import almacenService    from '../services/almacen.service';
import PageWrapper       from '../components/PageWrapper';

// ── Íconos de línea (inline SVG, sin emojis) ────────────────────────────────
const ICON_PATHS = {
  ventas: 'M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.876-4.79 2.182-7.407.055-.468-.311-.868-.782-.868H5.106M7.5 14.25 5.106 5.272M6 18.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z',
  compras: 'M8.25 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18.75 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z M3.75 3h1.386c.51 0 .955.343 1.087.836l.383 1.437m0 0L8.25 13.5h8.25L18.75 6H5.606m-.383-1.437L5.25 6m0 0h13.5',
  caja: 'M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm2.25-4.5h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5V13.5Zm0 2.25h.008v.008H10.5v-.008Zm2.25-4.5h.008v.008H12.75v-.008Zm0 2.25h.008v.008H12.75V13.5Zm0 2.25h.008v.008H12.75v-.008ZM15 9.75V18M6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75Zm7.5 3.75h3v3h-3v-3Z',
  productos: 'M21 7.5l-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9',
  almacen: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375C2.754 3.75 2.25 4.254 2.25 4.875v1.5c0 .621.504 1.125 1.125 1.125Z',
  clientes: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  proveedores: 'M8.25 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18.75 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z M8.25 18.75h-1.5a.75.75 0 0 1-.75-.75V9a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 .75.75v.75m0 0h3.373a.75.75 0 0 1 .67.415l1.539 3.077a.75.75 0 0 1 .08.336V17.25a.75.75 0 0 1-.75.75h-1.5m-6.75 0H9m6.75 0v-9',
  reportes: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  usuarios: 'M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  sucursales: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  banknotes: 'M2.25 8.25c0-1.036.84-1.875 1.875-1.875h15.75c1.035 0 1.875.84 1.875 1.875v7.5A1.875 1.875 0 0 1 19.875 17.625H4.125A1.875 1.875 0 0 1 2.25 15.75v-7.5ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  trendUp: 'M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941',
  trophy: 'M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.29 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.502-3.032-1.502-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  checkCircle: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  clipboardList: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.006 8.25 4.97 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z',
  folder: 'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0v6a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25v-6m-19.5 0V6a2.25 2.25 0 0 1 2.25-2.25h5.379a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H19.5A2.25 2.25 0 0 1 21.75 9v3.75',
  sparkles: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z',
  bolt: 'M3.75 13.5 10.5 3l-1.5 6.75h6.75L9 21l1.5-7.5H3.75Z',
};

function Ic({ name, className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
         className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[name]} />
    </svg>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtBs  = (n) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n || 0));
const fmtInt = (n) =>
  new Intl.NumberFormat('es-BO').format(parseInt(n || 0));

function saludoHora() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function fechaLarga() {
  return new Date().toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ className = '' }) {
  return <div className={`animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-lg ${className}`} />;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
const KPI_COLORS = {
  emerald : 'bg-emerald-500',
  yellow  : 'bg-yellow-400',
  sky     : 'bg-sky-500',
  orange  : 'bg-orange-400',
  red     : 'bg-red-500',
  violet  : 'bg-violet-500',
};

function KpiCard({ label, value, prefix = '', icon, colorKey = 'emerald', cargando, sub }) {
  const bar = KPI_COLORS[colorKey] ?? KPI_COLORS.emerald;
  return (
    <div className="relative overflow-hidden rounded-2xl border
                    border-zinc-200 dark:border-zinc-800
                    bg-white dark:bg-zinc-900
                    shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
      {/* color accent */}
      <div className={`absolute inset-x-0 top-0 h-1 ${bar}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest
                        text-zinc-400 dark:text-zinc-500 mb-1.5">
            {label}
          </p>
          {cargando ? (
            <Skel className="h-8 w-28 mt-1" />
          ) : (
            <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
              {prefix && (
                <span className="text-sm font-semibold text-zinc-400 mr-1">{prefix}</span>
              )}
              {value}
            </p>
          )}
          {!cargando && sub && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">{sub}</p>
          )}
        </div>
        {/* icon bubble */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                         text-xl shrink-0 bg-zinc-50 dark:bg-zinc-800`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Barra de producto ─────────────────────────────────────────────────────────
const BAR_COLORS = [
  'bg-yellow-400', 'bg-emerald-500', 'bg-sky-500',
  'bg-violet-500', 'bg-orange-400',  'bg-pink-500',
  'bg-teal-500',   'bg-rose-400',
];

function BarProducto({ nombre, valor, max, rank }) {
  const pct = max > 0 ? Math.max(4, (valor / max) * 100) : 4;
  const color = BAR_COLORS[rank % BAR_COLORS.length];
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-[11px] font-bold text-zinc-400 w-4 text-right shrink-0">
        {rank + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1 gap-2">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
            {nombre}
          </span>
          <span className="text-xs font-bold text-zinc-900 dark:text-white shrink-0">
            Bs {fmtBs(valor)}
          </span>
        </div>
        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 delay-75 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Alerta badge días ─────────────────────────────────────────────────────────
function DiasBadge({ dias }) {
  if (dias <= 0)
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full
                             bg-red-100 dark:bg-red-900/40
                             text-red-700 dark:text-red-300">Vencido</span>;
  if (dias <= 7)
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full
                             bg-red-100 dark:bg-red-900/40
                             text-red-700 dark:text-red-300">{dias}d</span>;
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full
                           bg-amber-100 dark:bg-amber-900/40
                           text-amber-700 dark:text-amber-300">{dias}d</span>;
}

// ── Fila de alerta (venc / stock) ─────────────────────────────────────────────
function AlertRow({ nombre, sub, badge }) {
  return (
    <div className="flex items-center justify-between gap-2
                    px-3 py-2 rounded-xl
                    bg-zinc-50 dark:bg-zinc-800/60
                    border border-zinc-100 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{nombre}</p>
        <p className="text-[11px] text-zinc-400">{sub}</p>
      </div>
      {badge}
    </div>
  );
}

// ── Panel contenedor ──────────────────────────────────────────────────────────
function Panel({ title, badge, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800
                     bg-white dark:bg-zinc-900 p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h2>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ── Estado vacío ──────────────────────────────────────────────────────────────
function Empty({ icon, msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <span className="text-3xl opacity-40">{icon}</span>
      <p className="text-xs text-zinc-400 text-center">{msg}</p>
    </div>
  );
}

// ── Acceso rápido ─────────────────────────────────────────────────────────────
function QuickBtn({ to, icon, label, desc, onClick }) {
  return (
    <button
      onClick={() => onClick(to)}
      className="flex items-center gap-3 p-3.5 rounded-xl text-left w-full
                 bg-zinc-50 dark:bg-zinc-800/50
                 border border-zinc-200 dark:border-zinc-700
                 hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-400/10
                 transition-all duration-200 group"
    >
      <span className="text-xl w-8 h-8 flex items-center justify-center shrink-0 rounded-lg
                       bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                       group-hover:border-yellow-400">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-zinc-800 dark:text-white
                      group-hover:text-yellow-600 dark:group-hover:text-yellow-400 truncate">
          {label}
        </p>
        <p className="text-[11px] text-zinc-400 truncate">{desc}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { usuario }  = useAuth();
  const { puede }    = usePermission();
  const navigate     = useNavigate();

  // ── Permisos relevantes ──────────────────────────────────────────────────
  const pFinanciero = puede('ganancias',     'reportes');
  const pTop        = puede('top_productos', 'reportes');
  const pVenc       = puede('vencimientos',  'reportes');
  // El widget de Stock bajo usa el mismo endpoint que la pestaña Alertas de
  // Almacén (por lote, todas las sucursales), así que el permiso que lo rige
  // es "almacen.ver", no "reportes.stock_bajo" (que da un total distinto).
  const pStockBajo  = puede('ver', 'almacen');

  // ── Estado ───────────────────────────────────────────────────────────────
  const [fin,      setFin]      = useState(null);
  const [top,      setTop]      = useState([]);
  const [venc,     setVenc]     = useState([]);
  const [stock,    setStock]    = useState([]);

  const [ldFin,    setLdFin]    = useState(false);
  const [ldTop,    setLdTop]    = useState(false);
  const [ldVenc,   setLdVenc]   = useState(false);
  const [ldStock,  setLdStock]  = useState(false);

  // ── Carga ─────────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    if (pFinanciero) {
      setLdFin(true);
      try   { const r = await reporteService.financiero();            setFin(r.data); }
      catch { /* silencioso */ }
      finally { setLdFin(false); }
    }
    if (pTop) {
      setLdTop(true);
      try   { const r = await reporteService.topProductos();         setTop(r.data.slice(0, 8)); }
      catch { /* silencioso */ }
      finally { setLdTop(false); }
    }
    if (pVenc) {
      setLdVenc(true);
      try   { const r = await reporteService.vencimientos();         setVenc(r.data.slice(0, 6)); }
      catch { /* silencioso */ }
      finally { setLdVenc(false); }
    }
    if (pStockBajo) {
      setLdStock(true);
      try   { const r = await almacenService.listarAlertas(); setStock((r.data.bajo_stock || []).slice(0, 6)); }
      catch { /* silencioso */ }
      finally { setLdStock(false); }
    }
  }, [pFinanciero, pTop, pVenc, pStockBajo]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Quick links (por permiso) ────────────────────────────────────────────
  const quickLinks = [
    { to: '/ventas/nueva',  icon: <Ic name="ventas" />,      label: 'Nueva Venta',      desc: 'Registrar POS',          show: puede('crear', 'ventas')     },
    { to: '/compras/nueva', icon: <Ic name="compras" />,     label: 'Nueva Compra',     desc: 'Registrar ingreso',      show: puede('crear', 'compras')    },
    { to: '/ventas',        icon: <Ic name="clipboardList" />, label: 'Historial Ventas', desc: 'Ver ventas',           show: puede('ver',   'ventas')     },
    { to: '/caja',          icon: <Ic name="caja" />,        label: 'Caja',             desc: 'Turnos de caja',         show: puede('ver',   'caja')       },
    { to: '/productos',     icon: <Ic name="productos" />,   label: 'Productos',        desc: 'Catálogo',               show: puede('ver',   'productos')  },
    { to: '/almacen',       icon: <Ic name="almacen" />,     label: 'Almacén',          desc: 'Stock e inventario',     show: puede('ver',   'almacen')    },
    { to: '/clientes',      icon: <Ic name="clientes" />,    label: 'Clientes',         desc: 'Gestión de clientes',    show: puede('ver',   'clientes')   },
    { to: '/compras',       icon: <Ic name="folder" />,      label: 'Compras',          desc: 'Historial compras',      show: puede('ver',   'compras')    },
    { to: '/proveedores',   icon: <Ic name="proveedores" />, label: 'Proveedores',      desc: 'Gestión de proveedores', show: puede('ver',   'proveedores')},
    { to: '/reportes',      icon: <Ic name="reportes" />,    label: 'Reportes',         desc: 'Estadísticas',           show: ['ventas_diarias','ganancias','inventario','top_productos','caja'].some(a => puede(a, 'reportes')) },
    { to: '/usuarios',      icon: <Ic name="usuarios" />,    label: 'Usuarios',         desc: 'Gestión de usuarios',    show: puede('ver',   'usuarios')   },
    { to: '/sucursales',    icon: <Ic name="sucursales" />,  label: 'Sucursales',       desc: 'Gestión sucursales',     show: puede('ver',   'sucursales') },
  ].filter(l => l.show);

  // ── Datos derivados ───────────────────────────────────────────────────────
  const maxTop = top.length > 0
    ? Math.max(...top.map(p => parseFloat(p.ingresos_generados || 0)))
    : 1;

  const iniciales = [usuario?.nombre?.[0], usuario?.apellido?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';

  const utilidadPositiva = parseFloat(fin?.utilidad_bruta_mes || 0) >= 0;

  // ── No hay ningún widget con datos → mostrar bienvenida simple ──────────
  const tieneAlgunWidget = pFinanciero || pTop || pVenc || pStockBajo;

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ═══ HEADER ════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800
                        bg-white dark:bg-zinc-900 shadow-sm px-6 py-5
                        flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest
                          text-zinc-400 dark:text-zinc-500 mb-0.5">
              {saludoHora()}
            </p>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white truncate">
              {usuario?.nombre} {usuario?.apellido}
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 capitalize mt-0.5">
              {fechaLarga()}
            </p>
          </div>

          {/* Info usuario */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide">Rol</span>
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {usuario?.rol_nombre ?? `Rol ${usuario?.rol}`}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-yellow-400 text-zinc-900
                            flex items-center justify-center text-sm font-black shrink-0
                            shadow-sm shadow-yellow-400/30">
              {iniciales}
            </div>
          </div>
        </div>

        {/* ═══ KPI CARDS (solo si tiene permiso de ganancias) ════════════════ */}
        {pFinanciero && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Ventas hoy"
              value={fmtInt(fin?.ventas_hoy_cantidad)}
              icon={<Ic name="ventas" />}
              colorKey="emerald"
              cargando={ldFin}
              sub={`Bs ${fmtBs(fin?.ingresos_hoy)} ingresos`}
            />
            <KpiCard
              label="Ingresos del mes"
              value={fmtBs(fin?.ingresos_mes)}
              prefix="Bs"
              icon={<Ic name="banknotes" />}
              colorKey="yellow"
              cargando={ldFin}
            />
            <KpiCard
              label="Utilidad bruta"
              value={fmtBs(fin?.utilidad_bruta_mes)}
              prefix="Bs"
              icon={<Ic name="trendUp" className={`w-5 h-5 ${utilidadPositiva ? '' : 'scale-y-[-1]'}`} />}
              colorKey={utilidadPositiva ? 'sky' : 'red'}
              cargando={ldFin}
              sub="mes actual"
            />
            <KpiCard
              label="Compras del mes"
              value={fmtBs(fin?.egresos_mes)}
              prefix="Bs"
              icon={<Ic name="compras" />}
              colorKey="orange"
              cargando={ldFin}
            />
          </div>
        )}

        {/* ═══ GRID CENTRAL ══════════════════════════════════════════════════ */}
        {tieneAlgunWidget && (
          <div className={`grid gap-4 ${
            pTop && (pVenc || pStockBajo)
              ? 'grid-cols-1 xl:grid-cols-3'
              : 'grid-cols-1'
          }`}>

            {/* ─ Top Productos ─────────────────────────────────────────── */}
            {pTop && (
              <Panel
                title={<span className="flex items-center gap-1.5"><Ic name="trophy" className="w-4 h-4" />Top Productos</span>}
                badge={<span className="text-xs text-zinc-400">ingresos totales</span>}
                className={pVenc || pStockBajo ? 'xl:col-span-2' : ''}
              >
                {ldTop ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skel key={i} className="h-8 w-full" />)}
                  </div>
                ) : top.length === 0 ? (
                  <Empty icon={<Ic name="productos" className="w-8 h-8" />} msg="Sin ventas registradas aún" />
                ) : (
                  <div className="space-y-3">
                    {top.map((p, i) => (
                      <BarProducto
                        key={p.id_producto}
                        nombre={p.nombre}
                        valor={parseFloat(p.ingresos_generados || 0)}
                        max={maxTop}
                        rank={i}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {/* ─ Columna alertas ───────────────────────────────────────── */}
            {(pVenc || pStockBajo) && (
              <div className="flex flex-col gap-4">

                {/* Vencimientos */}
                {pVenc && (
                  <Panel
                    title={<span className="flex items-center gap-1.5"><Ic name="clock" className="w-4 h-4" />Próximos a vencer</span>}
                    badge={
                      venc.length > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full
                                         bg-amber-100 dark:bg-amber-900/30
                                         text-amber-700 dark:text-amber-300">
                          {venc.length}
                        </span>
                      )
                    }
                    className="flex-1"
                  >
                    {ldVenc ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skel key={i} className="h-10 w-full" />)}
                      </div>
                    ) : venc.length === 0 ? (
                      <Empty icon={<Ic name="checkCircle" className="w-8 h-8" />} msg="Sin productos próximos a vencer" />
                    ) : (
                      <div className="space-y-2">
                        {venc.map(v => (
                          <AlertRow
                            key={v.id_lote}
                            nombre={v.producto_nombre}
                            sub={v.numero_lote ? `Lote: ${v.numero_lote}` : `Lote #${v.id_lote}`}
                            badge={<DiasBadge dias={v.dias_restantes} />}
                          />
                        ))}
                      </div>
                    )}
                  </Panel>
                )}

                {/* Stock bajo */}
                {pStockBajo && (
                  <Panel
                    title={<span className="flex items-center gap-1.5"><Ic name="warning" className="w-4 h-4" />Stock bajo</span>}
                    badge={
                      stock.length > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full
                                         bg-red-100 dark:bg-red-900/30
                                         text-red-700 dark:text-red-300">
                          {stock.length}
                        </span>
                      )
                    }
                    className="flex-1"
                  >
                    {ldStock ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skel key={i} className="h-10 w-full" />)}
                      </div>
                    ) : stock.length === 0 ? (
                      <Empty icon={<Ic name="checkCircle" className="w-8 h-8" />} msg="Todos los productos en stock normal" />
                    ) : (
                      <div className="space-y-2">
                        {stock.map(s => (
                          <AlertRow
                            key={s.id_lote}
                            nombre={s.producto_nombre}
                            sub={`${s.sucursal_nombre} · Lote: ${s.numero_lote} · mín: ${s.stock_minimo} uds`}
                            badge={
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full
                                               bg-red-100 dark:bg-red-900/40
                                               text-red-700 dark:text-red-300 shrink-0">
                                {s.stock_unidades} uds
                              </span>
                            }
                          />
                        ))}
                      </div>
                    )}
                  </Panel>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ BIENVENIDA (si no hay ningún widget de reportes) ══════════════ */}
        {!tieneAlgunWidget && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800
                          bg-white dark:bg-zinc-900 shadow-sm px-6 py-12
                          flex flex-col items-center justify-center text-center">
            <Ic name="sparkles" className="w-12 h-12 mb-4 text-yellow-400" />
            <h2 className="text-lg font-bold text-zinc-800 dark:text-white mb-1">
              Bienvenido a SIS-AGRO
            </h2>
            <p className="text-sm text-zinc-400 max-w-xs">
              Usa el menú lateral para acceder a los módulos disponibles para tu rol.
            </p>
          </div>
        )}

        {/* ═══ ACCESO RÁPIDO ════════════════════════════════════════════════ */}
        {quickLinks.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800
                          bg-white dark:bg-zinc-900 shadow-sm p-5">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Ic name="bolt" className="w-4 h-4" />
              Acceso rápido
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {quickLinks.map(l => (
                <QuickBtn key={l.to} {...l} onClick={navigate} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ FOOTER INFO ══════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-1 pb-2 text-[11px] text-zinc-300 dark:text-zinc-700">
          <span>SIS-AGRO v1.0.0</span>
          <span>Sucursal #{usuario?.id_sucursal} · {usuario?.rol_nombre}</span>
        </div>

      </div>
    </PageWrapper>
  );
}
