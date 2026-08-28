import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import TablaClientes from './components/TablaClientes';
import { ModalCrearEditar, ModalEliminar, ModalHistorial } from './components/ClienteModals';
import clienteService from '../../services/cliente.service';
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

export default function Clientes() {
  const { puede } = usePermission();

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const [modalType, setModalType] = useState(null); // 'crear', 'editar', 'eliminar', 'historial', null
  const [clienteActivo, setClienteActivo] = useState(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await clienteService.listar();
      setClientes(res.data);
    } catch (err) {
      mostrarToast('error', 'Error al cargar los clientes');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrear = () => {
    setClienteActivo(null);
    setModalType('crear');
  };

  const handleEditar = (cliente) => {
    setClienteActivo(cliente);
    setModalType('editar');
  };

  const handleEliminar = (cliente) => {
    setClienteActivo(cliente);
    setModalType('eliminar');
  };

  const handleVerHistorial = (cliente) => {
    setClienteActivo(cliente);
    setModalType('historial');
  };

  const handleGuardar = async (formData) => {
    setGuardando(true);
    try {
      if (modalType === 'crear') {
        await clienteService.crear(formData);
        mostrarToast('ok', 'Cliente registrado correctamente');
      } else {
        await clienteService.editar(clienteActivo.id_cliente, formData);
        mostrarToast('ok', 'Cliente actualizado correctamente');
      }
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar cliente');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!clienteActivo) return;
    setGuardando(true);
    try {
      await clienteService.eliminar(clienteActivo.id_cliente);
      mostrarToast('ok', 'Cliente desactivado correctamente');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al desactivar cliente');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (cliente) => {
    try {
      const nuevoEstado = cliente.activo ? 0 : 1;
      await clienteService.toggleActivo(cliente.id_cliente, nuevoEstado);
      mostrarToast('ok', `Cliente ${nuevoEstado ? 'activado' : 'desactivado'}`);
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
            🧑‍🌾 Directorio de Clientes
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Administra tus clientes minoristas y mayoristas.
          </p>
        </div>
        {puede('crear', 'clientes') && (
          <button
            onClick={handleCrear}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Nuevo Cliente
          </button>
        )}
      </div>

      <TablaClientes
        clientes={clientes}
        cargando={cargando}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
        onToggleActivo={handleToggleActivo}
        onVerHistorial={handleVerHistorial}
      />

      {(modalType === 'crear' || modalType === 'editar') && (
        <ModalCrearEditar
          cliente={modalType === 'editar' ? clienteActivo : null}
          onConfirm={handleGuardar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'eliminar' && (
        <ModalEliminar
          cliente={clienteActivo}
          onConfirm={handleConfirmarEliminar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'historial' && (
        <ModalHistorial
          cliente={clienteActivo}
          onClose={() => setModalType(null)}
        />
      )}
    </PageWrapper>
  );
}
