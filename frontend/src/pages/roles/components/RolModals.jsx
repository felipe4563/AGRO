import { useEffect } from 'react';

// ── Modal genérico ────────────────────────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div onClick={onClose}
           className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900
                      rounded-2xl shadow-2xl border border-zinc-200
                      dark:border-zinc-700 p-6 transition-colors duration-300">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            {titulo}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-zinc-400 hover:text-zinc-700 dark:hover:text-white
                       hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Input reutilizable ────────────────────────────────────────────────────
function InputNombre({ value, onChange, onEnter, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider
                        text-zinc-500 dark:text-zinc-400 mb-1.5">
        Nombre del rol
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder ?? 'Ej: SUPERVISOR'}
        autoFocus
        className="w-full bg-zinc-50 dark:bg-zinc-800 border
                   border-zinc-200 dark:border-zinc-700 rounded-xl
                   px-4 py-2.5 text-sm text-zinc-900 dark:text-white
                   placeholder:text-zinc-400 dark:placeholder:text-zinc-600
                   focus:outline-none focus:border-yellow-400
                   focus:ring-1 focus:ring-yellow-400 transition-all"
      />
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
        Se guardará en mayúsculas automáticamente
      </p>
    </div>
  );
}

// ── Botones de acción ─────────────────────────────────────────────────────
function BotonesAccion({ onCancel, onConfirm, guardando,
                         labelConfirm, danger = false }) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onCancel}
        className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                   bg-zinc-100 dark:bg-zinc-800
                   text-zinc-600 dark:text-zinc-400
                   hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm}
        disabled={guardando}
        className={`flex-1 flex items-center justify-center gap-2
                    py-2.5 rounded-xl text-sm font-bold transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${danger
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-yellow-400 hover:bg-yellow-500 text-zinc-900'
                    }`}
      >
        {guardando
          ? <><span className="w-4 h-4 border-2 border-current border-t-transparent
                               rounded-full animate-spin" /> Procesando...</>
          : labelConfirm
        }
      </button>
    </div>
  );
}

// ── Modal Crear ───────────────────────────────────────────────────────────
export function ModalCrear({ nombre, setNombre, onConfirm, onClose, guardando }) {
  return (
    <Modal titulo="➕ Nuevo Rol" onClose={onClose}>
      <div className="space-y-4">
        <InputNombre
          value={nombre}
          onChange={setNombre}
          onEnter={onConfirm}
          placeholder="Ej: SUPERVISOR"
        />
        <BotonesAccion
          onCancel={onClose}
          onConfirm={onConfirm}
          guardando={guardando}
          labelConfirm="Crear Rol"
        />
      </div>
    </Modal>
  );
}

// ── Modal Editar ──────────────────────────────────────────────────────────
export function ModalEditar({ nombre, setNombre, onConfirm, onClose, guardando }) {
  return (
    <Modal titulo="✏️ Renombrar Rol" onClose={onClose}>
      <div className="space-y-4">
        <InputNombre
          value={nombre}
          onChange={setNombre}
          onEnter={onConfirm}
        />
        <BotonesAccion
          onCancel={onClose}
          onConfirm={onConfirm}
          guardando={guardando}
          labelConfirm="Guardar"
        />
      </div>
    </Modal>
  );
}

// ── Modal Eliminar ────────────────────────────────────────────────────────
export function ModalEliminar({ rol, onConfirm, onClose, guardando }) {
  return (
    <Modal titulo="🗑 Eliminar Rol" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl
                        bg-red-50 dark:bg-red-500/10
                        border border-red-200 dark:border-red-500/20">
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              ¿Eliminar el rol "{rol?.nombre}"?
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
              Esta acción no se puede deshacer. Solo es posible si
              el rol no tiene usuarios asignados.
            </p>
          </div>
        </div>
        <BotonesAccion
          onCancel={onClose}
          onConfirm={onConfirm}
          guardando={guardando}
          labelConfirm="🗑 Eliminar"
          danger
        />
      </div>
    </Modal>
  );
}