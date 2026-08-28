import { Can } from '../../../contexts/AbilityContext';
import ModuloSeccion from './ModuloSeccion';

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <span className="w-6 h-6 rounded-full border-2
                       border-zinc-300 dark:border-zinc-600
                       border-t-yellow-400 animate-spin" />
    </div>
  );
}

export default function GestionPermisos({
  rolActivo,
  permisosPorMod,
  seleccionados,
  setSeleccionados,
  hayCambios,
  cargandoDetalle,
  guardando,
  onGuardar,
  onEditar,
  onEliminar,
}) {
  // ── Estado vacío ────────────────────────────────────────────────────────
  if (!rolActivo) {
    return (
      <div className="flex flex-col items-center justify-center
                      h-48 sm:h-64 rounded-2xl border-2 border-dashed
                      border-zinc-200 dark:border-zinc-700
                      text-zinc-400 dark:text-zinc-600 px-4">
        <span className="text-3xl sm:text-4xl mb-3">🔐</span>
        <p className="text-sm font-medium text-center">
          Selecciona un rol para gestionar sus permisos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Header del rol seleccionado ─────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/60
                      border border-zinc-200 dark:border-zinc-700">

        {/* Fila superior: nombre + badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            {rolActivo.nombre}
          </h2>

          {/* Badge permisos */}
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                           bg-yellow-100 dark:bg-yellow-400/20
                           text-yellow-700 dark:text-yellow-400">
            🔑 {seleccionados.size} permisos
          </span>

          {/* Badge sin guardar */}
          {hayCambios && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                             bg-red-100 dark:bg-red-400/20
                             text-red-700 dark:text-red-400 animate-pulse">
              ● Sin guardar
            </span>
          )}
        </div>

        {/* Usuarios con este rol */}
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
          👥 {rolActivo.total_usuarios} usuario(s) con este rol
        </p>

        {/* ── Botones — en móvil ocupan todo el ancho ─────────────── */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">

          <Can I="editar" a="roles">
            <button
              onClick={onEditar}
              className="flex items-center justify-center gap-1.5
                         px-3 py-2 rounded-xl text-xs font-semibold
                         transition-colors
                         bg-zinc-100 dark:bg-zinc-700
                         text-zinc-700 dark:text-zinc-300
                         hover:bg-zinc-200 dark:hover:bg-zinc-600"
            >
              ✏️ Renombrar
            </button>
          </Can>

          <Can I="eliminar" a="roles">
            <button
              onClick={onEliminar}
              className="flex items-center justify-center gap-1.5
                         px-3 py-2 rounded-xl text-xs font-semibold
                         transition-colors
                         bg-red-50 dark:bg-red-500/10
                         text-red-600 dark:text-red-400
                         hover:bg-red-100 dark:hover:bg-red-500/20
                         border border-red-200 dark:border-red-500/20"
            >
              🗑 Eliminar
            </button>
          </Can>

          <Can I="gestionar_permisos" a="roles">
            {/* En móvil ocupa las 2 columnas */}
            <button
              onClick={onGuardar}
              disabled={guardando || !hayCambios}
              className="col-span-2 sm:col-span-1
                         flex items-center justify-center gap-1.5
                         px-4 py-2 rounded-xl text-xs font-bold
                         transition-all
                         bg-yellow-400 hover:bg-yellow-500
                         disabled:bg-zinc-200 dark:disabled:bg-zinc-700
                         disabled:text-zinc-400 disabled:cursor-not-allowed
                         text-zinc-900 shadow-sm shadow-yellow-400/20"
            >
              {guardando ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-zinc-600
                                   border-t-transparent rounded-full
                                   animate-spin shrink-0" />
                  Guardando...
                </>
              ) : (
                '💾 Guardar cambios'
              )}
            </button>
          </Can>

        </div>
      </div>

      {/* ── Módulos con checkboxes ──────────────────────────────────── */}
      {cargandoDetalle ? (
        <Spinner />
      ) : Object.keys(permisosPorMod).length === 0 ? (
        <div className="text-center py-10 text-sm
                        text-zinc-400 dark:text-zinc-600">
          No hay permisos disponibles
        </div>
      ) : (
        <div className="space-y-3
                        max-h-[50vh] sm:max-h-[55vh] lg:max-h-[calc(100vh-340px)]
                        overflow-y-auto pr-1 pb-2">
          {Object.entries(permisosPorMod).map(([modulo, permisos]) => (
            <ModuloSeccion
              key={modulo}
              modulo={modulo}
              permisos={permisos}
              seleccionados={seleccionados}
              onChange={setSeleccionados}
            />
          ))}
        </div>
      )}

    </div>
  );
}