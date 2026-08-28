import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import TablaUsuarios from './components/TablaUsuarios';
import { ModalCrearEditar, ModalEliminar, ModalResetClave, ModalCambiarSucursal } from './components/UsuarioModals';
import usuarioService from '../../services/usuario.service';
import rolService from '../../services/rol.service';
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

export default function Usuarios() {
  const { puede } = usePermission();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]); 

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  // Modales
  const [modalType, setModalType] = useState(null); // 'crear', 'editar', 'eliminar', 'reset', 'sucursal', null
  const [usuarioActivo, setUsuarioActivo] = useState(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resUsuarios, resRoles, resSucursales] = await Promise.all([
        usuarioService.listar(),
        rolService.listar(),
        sucursalService.listar()
      ]);
      setUsuarios(resUsuarios.data);
      setRoles(resRoles.data);
      setSucursales(resSucursales.data);
    } catch (err) {
      mostrarToast('error', 'Error al cargar los datos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrear = () => {
    setUsuarioActivo(null);
    setModalType('crear');
  };

  const handleEditar = (u) => {
    setUsuarioActivo(u);
    setModalType('editar');
  };

  const handleEliminar = (u) => {
    setUsuarioActivo(u);
    setModalType('eliminar');
  };

  const handleResetClave = (u) => {
    setUsuarioActivo(u);
    setModalType('reset');
  };

  const handleCambiarSucursal = (u) => {
    setUsuarioActivo(u);
    setModalType('sucursal');
  };

  const handleGuardarUsuario = async (formData) => {
    setGuardando(true);
    try {
      if (modalType === 'crear') {
        await usuarioService.crear(formData);
        mostrarToast('ok', 'Usuario creado correctamente');
      } else {
        await usuarioService.editar(usuarioActivo.id_usuario, formData);
        mostrarToast('ok', 'Usuario actualizado correctamente');
      }
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar usuario');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!usuarioActivo) return;
    setGuardando(true);
    try {
      await usuarioService.eliminar(usuarioActivo.id_usuario);
      mostrarToast('ok', 'Usuario desactivado');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al desactivar');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarResetClave = async (nuevaClave) => {
    if (!usuarioActivo) return;
    setGuardando(true);
    try {
      await usuarioService.resetearClave(usuarioActivo.id_usuario, nuevaClave);
      mostrarToast('ok', 'Contraseña restablecida correctamente');
      setModalType(null);
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al resetear contraseña');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarCambiarSucursal = async (idSucursal) => {
    if (!usuarioActivo) return;
    setGuardando(true);
    try {
      await usuarioService.cambiarSucursal(usuarioActivo.id_usuario, idSucursal || null);
      mostrarToast('ok', 'Sucursal actualizada correctamente');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al cambiar sucursal');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (u) => {
    try {
      const nuevoEstado = u.activo ? 0 : 1;
      await usuarioService.toggleActivo(u.id_usuario, nuevoEstado);
      // Actualizar localmente para evitar parpadeos
      setUsuarios(prev => prev.map(user => 
        user.id_usuario === u.id_usuario ? { ...user, activo: nuevoEstado } : user
      ));
      mostrarToast('ok', `Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`);
    } catch (err) {
      mostrarToast('error', 'Error al cambiar estado');
      await cargarDatos(); // Recargar en caso de error
    }
  };

  return (
    <PageWrapper>
      <Toast toast={toast} />

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            👥 Gestión de Usuarios
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Administra los accesos y cuentas del personal.
          </p>
        </div>
        {puede('crear', 'usuarios') && (
          <button
            onClick={handleCrear}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
          </button>
        )}
      </div>

      <TablaUsuarios
        usuarios={usuarios}
        cargando={cargando}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
        onToggleActivo={handleToggleActivo}
        onResetClave={handleResetClave}
        onCambiarSucursal={handleCambiarSucursal}
      />

      {(modalType === 'crear' || modalType === 'editar') && (
        <ModalCrearEditar
          usuario={modalType === 'editar' ? usuarioActivo : null}
          roles={roles}
          sucursales={sucursales}
          onConfirm={handleGuardarUsuario}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'eliminar' && (
        <ModalEliminar
          usuario={usuarioActivo}
          onConfirm={handleConfirmarEliminar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'reset' && (
        <ModalResetClave
          usuario={usuarioActivo}
          onConfirm={handleConfirmarResetClave}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'sucursal' && (
        <ModalCambiarSucursal
          usuario={usuarioActivo}
          sucursales={sucursales}
          onConfirm={handleConfirmarCambiarSucursal}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}
    </PageWrapper>
  );
}
