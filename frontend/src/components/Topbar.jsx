import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth }           from '../contexts/AuthContext';
import { useAbilityUpdater } from '../contexts/AbilityContext';
import { useTheme }          from '../contexts/ThemeContext';

function Icon({ path, className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const HAMBURGUESA = 'M4 6h16M4 12h16M4 18h16';
const SOL   = 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z';
const LUNA  = 'M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z';
const SALIR = 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25';

export default function Topbar({ onAbrirMenu }) {
  const { usuario, logout } = useAuth();
  const { limpiar }         = useAbilityUpdater();
  const { tema, toggleTema } = useTheme();
  const navigate = useNavigate();
  const [confirmarSalir, setConfirmarSalir] = useState(false);
  const isDark = tema === 'dark';

  const handleLogout = () => {
    logout();
    limpiar();
    navigate('/login');
  };

  const iniciales = [usuario?.nombre?.[0], usuario?.apellido?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';

  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4
                       bg-white dark:bg-zinc-900
                       border-b border-zinc-200 dark:border-zinc-800
                       transition-colors duration-300">
      <button
        onClick={onAbrirMenu}
        aria-label="Mostrar u ocultar menú"
        title="Mostrar u ocultar menú"
        className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0
                   text-zinc-700 dark:text-zinc-300
                   hover:bg-zinc-100 dark:hover:bg-zinc-800
                   transition-colors"
      >
        <Icon path={HAMBURGUESA} />
      </button>

      <div className="flex-1" />

      <button
        onClick={toggleTema}
        aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
        title={isDark ? 'Modo claro' : 'Modo oscuro'}
        className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0
                   text-zinc-500 dark:text-zinc-400
                   hover:bg-zinc-100 dark:hover:bg-zinc-800
                   hover:text-zinc-900 dark:hover:text-white
                   transition-colors"
      >
        <Icon path={isDark ? SOL : LUNA} />
      </button>

      <div className="hidden sm:block w-px h-6 bg-zinc-200 dark:bg-zinc-700 shrink-0" />

      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-[10rem]">
          {usuario?.nombre} {usuario?.apellido}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[10rem]">
          {usuario?.rol_nombre ?? `Rol ${usuario?.rol}`}
        </span>
      </div>

      <Link
        to="/perfil"
        title="Mi perfil"
        className="w-9 h-9 rounded-full bg-yellow-400 text-zinc-900
                      flex items-center justify-center text-xs font-bold shrink-0 shadow-sm
                      overflow-hidden hover:opacity-90 transition-opacity"
      >
        {usuario?.foto ? (
          <img
            src={`${import.meta.env.VITE_API_URL.replace('/api', '')}/uploads/${usuario.foto}`}
            alt="Mi perfil"
            className="w-full h-full object-cover"
          />
        ) : (
          iniciales
        )}
      </Link>

      <div className="relative shrink-0">
        <button
          onClick={() => setConfirmarSalir((v) => !v)}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="w-9 h-9 flex items-center justify-center rounded-xl
                     text-zinc-500 dark:text-zinc-400
                     hover:bg-red-50 dark:hover:bg-red-500/10
                     hover:text-red-600 dark:hover:text-red-400
                     transition-colors"
        >
          <Icon path={SALIR} />
        </button>
        {confirmarSalir && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setConfirmarSalir(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl
                            bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                            shadow-lg overflow-hidden">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium
                           text-red-600 dark:text-red-400
                           hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <Icon path={SALIR} className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
