import { Can } from '../../../contexts/AbilityContext';

function RolCard({ rol, activo, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border
                  transition-all duration-200 group
                  ${activo
                    ? 'bg-yellow-400 border-yellow-400 shadow-md shadow-yellow-400/20'
                    : `bg-white dark:bg-zinc-800/60
                       border-zinc-200 dark:border-zinc-700
                       hover:border-yellow-400/60
                       hover:bg-zinc-50 dark:hover:bg-zinc-800`
                  }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-bold truncate
                         ${activo ? 'text-zinc-900' : 'text-zinc-900 dark:text-white'}`}>
            {rol.nombre}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`text-xs ${activo
              ? 'text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'}`}>
              🔑 {rol.total_permisos} permisos
            </span>
            <span className={`text-xs ${activo
              ? 'text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'}`}>
              👥 {rol.total_usuarios} usuarios
            </span>
          </div>
        </div>
        <span className={`shrink-0 text-lg transition-transform duration-200
                          ${activo
                            ? 'text-zinc-900'
                            : 'text-zinc-400 group-hover:translate-x-0.5'}`}>
          ›
        </span>
      </div>
    </button>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <span className="w-6 h-6 rounded-full border-2
                       border-zinc-300 dark:border-zinc-600
                       border-t-yellow-400 animate-spin" />
    </div>
  );
}

export default function ListaRoles({
  roles, cargando, rolActivo,
  onSeleccionar, onCrear
}) {
  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest
                      text-zinc-400 dark:text-zinc-600">
          Roles ({roles.length})
        </p>
        <Can I="crear" a="roles">
          <button
            onClick={onCrear}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg
                       bg-yellow-400 hover:bg-yellow-500 text-zinc-900
                       text-xs font-bold transition-colors shadow-sm
                       shadow-yellow-400/20"
          >
            ＋ Nuevo
          </button>
        </Can>
      </div>

      {/* Lista */}
      {cargando ? (
        <Spinner />
      ) : roles.length === 0 ? (
        <div className="text-center py-10 text-sm
                        text-zinc-400 dark:text-zinc-600">
          No hay roles creados
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map(rol => (
            <RolCard
              key={rol.id_rol}
              rol={rol}
              activo={rolActivo?.id_rol === rol.id_rol}
              onClick={() => onSeleccionar(rol)}
            />
          ))}
        </div>
      )}
    </div>
  );
}