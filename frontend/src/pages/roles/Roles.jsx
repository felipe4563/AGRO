import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import ListaRoles      from './components/ListaRoles';
import GestionPermisos from './components/GestionPermisos';
import { ModalCrear, ModalEditar, ModalEliminar } from './components/RolModals';
import rolService from '../../services/rol.service';

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3
                     px-4 py-3 rounded-xl shadow-xl border text-sm font-medium
                     transition-all duration-300 max-w-xs sm:max-w-sm
                     ${toast.tipo === 'ok'
                       ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
                       : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
                     }`}>
      <span className="shrink-0">{toast.tipo === 'ok' ? '✅' : '⚠️'}</span>
      <span className="break-words">{toast.msg}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
export default function Roles() {
  // ── Datos ────────────────────────────────────────────────────────────
  const [roles,          setRoles]          = useState([]);
  const [rolActivo,      setRolActivo]      = useState(null);
  const [permisosPorMod, setPermisosPorMod] = useState({});
  const [seleccionados,  setSeleccionados]  = useState(new Set());
  const [original,       setOriginal]       = useState(new Set());

  // ── Carga ────────────────────────────────────────────────────────────
  const [cargandoRoles,   setCargandoRoles]   = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardando,       setGuardando]       = useState(false);

  // ── Vista móvil: 'lista' | 'permisos' ────────────────────────────────
  const [vistaMovil, setVistaMovil] = useState('lista');

  // ── Modales ──────────────────────────────────────────────────────────
  const [modal,       setModal]       = useState(null);
  const [nombreInput, setNombreInput] = useState('');

  // ── Toast ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Detectar cambios ──────────────────────────────────────────────────
  const hayCambios = (() => {
    if (seleccionados.size !== original.size) return true;
    for (const id of seleccionados) {
      if (!original.has(id)) return true;
    }
    return false;
  })();

  // ── Cargar roles ──────────────────────────────────────────────────────
  const cargarRoles = useCallback(async () => {
    setCargandoRoles(true);
    try {
      const { data } = await rolService.listar();
      setRoles(data);
    } catch {
      mostrarToast('error', 'Error al cargar roles');
    } finally {
      setCargandoRoles(false);
    }
  }, []);

  useEffect(() => { cargarRoles(); }, [cargarRoles]);

  // ── Cargar permisos agrupados (una sola vez) ──────────────────────────
  useEffect(() => {
    rolService.listarPermisos()
      .then(({ data }) => setPermisosPorMod(data.modulos ?? {}))
      .catch(() => mostrarToast('error', 'Error al cargar permisos'));
  }, []);

  // ── Seleccionar rol ───────────────────────────────────────────────────
  const seleccionarRol = async (rol) => {
    if (rolActivo?.id_rol === rol.id_rol) {
      // En móvil permite volver a ver los permisos
      setVistaMovil('permisos');
      return;
    }
    setRolActivo(rol);
    setSeleccionados(new Set());
    setOriginal(new Set());
    setCargandoDetalle(true);
    setVistaMovil('permisos'); // ← en móvil navega a permisos

    try {
      const { data } = await rolService.obtener(rol.id_rol);
      const ids = new Set(
        Object.values(data.permisos_por_modulo ?? {})
          .flat()
          .filter(p => p.asignado)
          .map(p => p.id_permiso)
      );
      setSeleccionados(new Set(ids));
      setOriginal(new Set(ids));
    } catch {
      mostrarToast('error', 'Error al cargar permisos del rol');
    } finally {
      setCargandoDetalle(false);
    }
  };

  // ── Volver a lista en móvil ───────────────────────────────────────────
  const volverALista = () => {
    setVistaMovil('lista');
  };

  // ── Guardar permisos ──────────────────────────────────────────────────
  const guardarPermisos = async () => {
    if (!rolActivo) return;
    setGuardando(true);
    try {
      await rolService.actualizarPermisos(
        rolActivo.id_rol,
        Array.from(seleccionados)
      );
      setOriginal(new Set(seleccionados));
      setRoles(prev => prev.map(r =>
        r.id_rol === rolActivo.id_rol
          ? { ...r, total_permisos: seleccionados.size }
          : r
      ));
      mostrarToast('ok', 'Permisos guardados correctamente');
    } catch {
      mostrarToast('error', 'Error al guardar permisos');
    } finally {
      setGuardando(false);
    }
  };

  // ── Crear ─────────────────────────────────────────────────────────────
  const crearRol = async () => {
    if (!nombreInput.trim()) return;
    setGuardando(true);
    try {
      await rolService.crear({ nombre: nombreInput.trim() });
      setModal(null);
      setNombreInput('');
      await cargarRoles();
      mostrarToast('ok', 'Rol creado correctamente');
    } catch (err) {
      mostrarToast('error', err.response?.data?.error ?? 'Error al crear rol');
    } finally {
      setGuardando(false);
    }
  };

  // ── Editar ────────────────────────────────────────────────────────────
  const editarRol = async () => {
    if (!nombreInput.trim() || !rolActivo) return;
    setGuardando(true);
    try {
      await rolService.editar(rolActivo.id_rol, { nombre: nombreInput.trim() });
      const nuevoNombre = nombreInput.trim().toUpperCase();
      setModal(null);
      setRolActivo(prev => ({ ...prev, nombre: nuevoNombre }));
      setRoles(prev => prev.map(r =>
        r.id_rol === rolActivo.id_rol ? { ...r, nombre: nuevoNombre } : r
      ));
      mostrarToast('ok', 'Rol actualizado');
    } catch (err) {
      mostrarToast('error', err.response?.data?.error ?? 'Error al editar');
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────
  const eliminarRol = async () => {
    if (!rolActivo) return;
    setGuardando(true);
    try {
      await rolService.eliminar(rolActivo.id_rol);
      setModal(null);
      setRolActivo(null);
      setSeleccionados(new Set());
      setVistaMovil('lista'); // ← volver a lista tras eliminar
      await cargarRoles();
      mostrarToast('ok', 'Rol eliminado');
    } catch (err) {
      mostrarToast('error', err.response?.data?.error ?? 'Error al eliminar');
    } finally {
      setGuardando(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════
  return (
    <PageWrapper>
      <Toast toast={toast} />

      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <div className="mb-4 sm:mb-6">

        {/* Breadcrumb móvil: muestra botón volver cuando está en permisos */}
        {vistaMovil === 'permisos' && rolActivo && (
          <button
            onClick={volverALista}
            className="lg:hidden flex items-center gap-1.5 text-sm
                       text-zinc-500 dark:text-zinc-400
                       hover:text-zinc-900 dark:hover:text-white
                       transition-colors mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor"
                 strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 19l-7-7 7-7" />
            </svg>
            Volver a roles
          </button>
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold
                           text-zinc-900 dark:text-white">
              🔐 Roles y Permisos
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500
                          dark:text-zinc-400 mt-0.5">
              {/* En móvil muestra el rol activo como sub-título */}
              {vistaMovil === 'permisos' && rolActivo
                ? <span className="lg:hidden">
                    Editando: <strong className="text-yellow-500">
                      {rolActivo.nombre}
                    </strong>
                  </span>
                : 'Gestiona los roles y sus permisos de acceso'
              }
              <span className="hidden lg:inline">
                Gestiona los roles y sus permisos de acceso
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MÓVIL: una vista a la vez
          DESKTOP: dos columnas lado a lado
      ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Columna izquierda — Lista de roles ──────────────────────
            En móvil: visible solo cuando vistaMovil === 'lista'
            En desktop: siempre visible
        ─────────────────────────────────────────────────────────── */}
        <div className={`lg:col-span-1
                         ${vistaMovil === 'lista'
                           ? 'block'
                           : 'hidden lg:block'
                         }`}>
          <ListaRoles
            roles={roles}
            cargando={cargandoRoles}
            rolActivo={rolActivo}
            onSeleccionar={seleccionarRol}
            onCrear={() => { setNombreInput(''); setModal('crear'); }}
          />
        </div>

        {/* ── Columna derecha — Gestión de permisos ───────────────────
            En móvil: visible solo cuando vistaMovil === 'permisos'
            En desktop: siempre visible
        ─────────────────────────────────────────────────────────── */}
        <div className={`lg:col-span-2
                         ${vistaMovil === 'permisos'
                           ? 'block'
                           : 'hidden lg:block'
                         }`}>
          <GestionPermisos
            rolActivo={rolActivo}
            permisosPorMod={permisosPorMod}
            seleccionados={seleccionados}
            setSeleccionados={setSeleccionados}
            hayCambios={hayCambios}
            cargandoDetalle={cargandoDetalle}
            guardando={guardando}
            onGuardar={guardarPermisos}
            onEditar={() => {
              setNombreInput(rolActivo?.nombre ?? '');
              setModal('editar');
            }}
            onEliminar={() => setModal('eliminar')}
          />
        </div>
      </div>

      {/* ── Modales ────────────────────────────────────────────────── */}
      {modal === 'crear' && (
        <ModalCrear
          nombre={nombreInput}
          setNombre={setNombreInput}
          onConfirm={crearRol}
          onClose={() => setModal(null)}
          guardando={guardando}
        />
      )}

      {modal === 'editar' && (
        <ModalEditar
          nombre={nombreInput}
          setNombre={setNombreInput}
          onConfirm={editarRol}
          onClose={() => setModal(null)}
          guardando={guardando}
        />
      )}

      {modal === 'eliminar' && (
        <ModalEliminar
          rol={rolActivo}
          onConfirm={eliminarRol}
          onClose={() => setModal(null)}
          guardando={guardando}
        />
      )}

    </PageWrapper>
  );
}