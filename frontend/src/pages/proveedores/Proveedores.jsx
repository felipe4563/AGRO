import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import TablaProveedores from './components/TablaProveedores';
import { ModalCrearEditar, ModalEliminar } from './components/ProveedorModals';
import proveedorService from '../../services/proveedor.service';
import { usePermission } from '../../hooks/usePermission';

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all duration-300 max-w-xs sm:max-w-sm ${
      toast.tipo === 'ok'
        ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
    }`}>
      <span className="shrink-0">{toast.tipo === 'ok' ? '✅' : '⚠️'}</span>
      <span className="break-words">{toast.msg}</span>
    </div>
  );
}

export default function Proveedores() {
  const { puede } = usePermission();

  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const [modalType, setModalType] = useState(null); // 'crear', 'editar', 'eliminar', null
  const [proveedorActivo, setProveedorActivo] = useState(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await proveedorService.listar();
      setProveedores(res.data);
    } catch (err) {
      mostrarToast('error', 'Error al cargar los proveedores');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrear = () => {
    setProveedorActivo(null);
    setModalType('crear');
  };

  const handleEditar = (proveedor) => {
    setProveedorActivo(proveedor);
    setModalType('editar');
  };

  const handleEliminar = (proveedor) => {
    setProveedorActivo(proveedor);
    setModalType('eliminar');
  };

  const handleGuardar = async (formData) => {
    setGuardando(true);
    try {
      if (modalType === 'crear') {
        await proveedorService.crear(formData);
        mostrarToast('ok', 'Proveedor registrado correctamente');
      } else {
        await proveedorService.editar(proveedorActivo.id_proveedor, formData);
        mostrarToast('ok', 'Proveedor actualizado correctamente');
      }
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar proveedor');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!proveedorActivo) return;
    setGuardando(true);
    try {
      await proveedorService.eliminar(proveedorActivo.id_proveedor);
      mostrarToast('ok', 'Proveedor desactivado correctamente');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al desactivar proveedor');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (proveedor) => {
    try {
      const nuevoEstado = proveedor.activo ? 0 : 1;
      await proveedorService.toggleActivo(proveedor.id_proveedor, nuevoEstado);
      mostrarToast('ok', `Proveedor ${nuevoEstado ? 'activado' : 'desactivado'}`);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', 'Error al cambiar estado');
      await cargarDatos();
    }
  };

  return (
    <PageWrapper>
      <Toast toast={toast} />

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            🤝 Directorio de Proveedores
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Administra los proveedores a los que compras mercadería.
          </p>
        </div>
        {puede('crear', 'proveedores') && (
          <button
            onClick={handleCrear}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Nuevo Proveedor
          </button>
        )}
      </div>

      <TablaProveedores
        proveedores={proveedores}
        cargando={cargando}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
        onToggleActivo={handleToggleActivo}
      />

      {(modalType === 'crear' || modalType === 'editar') && (
        <ModalCrearEditar
          proveedor={modalType === 'editar' ? proveedorActivo : null}
          onConfirm={handleGuardar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'eliminar' && (
        <ModalEliminar
          proveedor={proveedorActivo}
          onConfirm={handleConfirmarEliminar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}
    </PageWrapper>
  );
}
