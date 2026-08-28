import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import TablaSucursales from './components/TablaSucursales';
import { ModalCrearEditar, ModalEliminar } from './components/SucursalModals';
import sucursalService from '../../services/sucursal.service';
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

export default function Sucursales() {
  const { puede } = usePermission();
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  // Modales
  const [modalType, setModalType] = useState(null); // 'crear', 'editar', 'eliminar', null
  const [sucursalActiva, setSucursalActiva] = useState(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await sucursalService.listar();
      setSucursales(res.data);
    } catch (err) {
      mostrarToast('error', 'Error al cargar las sucursales');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrear = () => {
    setSucursalActiva(null);
    setModalType('crear');
  };

  const handleEditar = (s) => {
    setSucursalActiva(s);
    setModalType('editar');
  };

  const handleEliminar = (s) => {
    setSucursalActiva(s);
    setModalType('eliminar');
  };

  const handleGuardarSucursal = async (formData) => {
    setGuardando(true);
    try {
      if (modalType === 'crear') {
        await sucursalService.crear(formData);
        mostrarToast('ok', 'Sucursal creada correctamente');
      } else {
        await sucursalService.editar(sucursalActiva.id_sucursal, formData);
        mostrarToast('ok', 'Sucursal actualizada correctamente');
      }
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar sucursal');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!sucursalActiva) return;
    setGuardando(true);
    try {
      await sucursalService.eliminar(sucursalActiva.id_sucursal);
      mostrarToast('ok', 'Sucursal desactivada');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al desactivar');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (s) => {
    try {
      const nuevoEstado = s.activo ? 0 : 1;
      await sucursalService.toggleActivo(s.id_sucursal, nuevoEstado);
      setSucursales(prev => prev.map(suc => 
        suc.id_sucursal === s.id_sucursal ? { ...suc, activo: nuevoEstado } : suc
      ));
      mostrarToast('ok', `Sucursal ${nuevoEstado ? 'activada' : 'desactivada'}`);
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
            🏢 Gestión de Sucursales
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Administra los puntos de venta o almacenes.
          </p>
        </div>
        {puede('crear', 'sucursales') && (
          <button
            onClick={handleCrear}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Sucursal
          </button>
        )}
      </div>

      <TablaSucursales
        sucursales={sucursales}
        cargando={cargando}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
        onToggleActivo={handleToggleActivo}
      />

      {(modalType === 'crear' || modalType === 'editar') && (
        <ModalCrearEditar
          sucursal={modalType === 'editar' ? sucursalActiva : null}
          onConfirm={handleGuardarSucursal}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'eliminar' && (
        <ModalEliminar
          sucursal={sucursalActiva}
          onConfirm={handleConfirmarEliminar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}
    </PageWrapper>
  );
}
