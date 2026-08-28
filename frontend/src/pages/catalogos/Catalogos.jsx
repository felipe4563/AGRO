import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import TablaCatalogos from './components/TablaCatalogos';
import { ModalCrearEditar, ModalEliminar } from './components/CatalogoModals';
import catalogoService from '../../services/catalogo.service';
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

export default function Catalogos() {
  const { puede } = usePermission();

  const [activeTab, setActiveTab] = useState('clasificaciones'); // clasificaciones, marcas, unidades
  
  const [datos, setDatos] = useState({
    clasificaciones: [],
    marcas: [],
    unidades: []
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const [modalType, setModalType] = useState(null); // 'crear', 'editar', 'eliminar', null
  const [itemActivo, setItemActivo] = useState(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resClas, resMar, resUni] = await Promise.all([
        catalogoService.listarClasificaciones(),
        catalogoService.listarMarcas(),
        catalogoService.listarUnidades()
      ]);
      setDatos({
        clasificaciones: resClas.data,
        marcas: resMar.data,
        unidades: resUni.data
      });
    } catch (err) {
      mostrarToast('error', 'Error al cargar los catálogos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrear = () => {
    setItemActivo(null);
    setModalType('crear');
  };

  const handleEditar = (item) => {
    setItemActivo(item);
    setModalType('editar');
  };

  const handleEliminar = (item) => {
    setItemActivo(item);
    setModalType('eliminar');
  };

  const handleGuardar = async (formData) => {
    setGuardando(true);
    try {
      if (activeTab === 'clasificaciones') {
        if (modalType === 'crear') await catalogoService.crearClasificacion(formData);
        else await catalogoService.editarClasificacion(itemActivo.id_clasificacion, formData);
      } else if (activeTab === 'marcas') {
        if (modalType === 'crear') await catalogoService.crearMarca(formData);
        else await catalogoService.editarMarca(itemActivo.id_marca, formData);
      } else if (activeTab === 'unidades') {
        if (modalType === 'crear') await catalogoService.crearUnidad(formData);
        else await catalogoService.editarUnidad(itemActivo.id_unidad, formData);
      }
      mostrarToast('ok', 'Guardado correctamente');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!itemActivo) return;
    setGuardando(true);
    try {
      if (activeTab === 'clasificaciones') await catalogoService.eliminarClasificacion(itemActivo.id_clasificacion);
      else if (activeTab === 'marcas') await catalogoService.eliminarMarca(itemActivo.id_marca);
      else if (activeTab === 'unidades') await catalogoService.eliminarUnidad(itemActivo.id_unidad);
      
      mostrarToast('ok', activeTab === 'unidades' ? 'Eliminado correctamente' : 'Desactivado correctamente');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al eliminar');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (item) => {
    try {
      const nuevoEstado = item.activo ? 0 : 1;
      if (activeTab === 'clasificaciones') {
        await catalogoService.toggleActivoClasificacion(item.id_clasificacion, nuevoEstado);
      } else if (activeTab === 'marcas') {
        await catalogoService.toggleActivoMarca(item.id_marca, nuevoEstado);
      }
      mostrarToast('ok', `Estado actualizado`);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', 'Error al cambiar estado');
      await cargarDatos();
    }
  };

  // Permisos según el tab activo
  const puedeCrear = puede('crear', activeTab);

  return (
    <PageWrapper>
      <Toast toast={toast} />

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            🏷️ Gestión de Catálogos
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Administra las clasificaciones, marcas y unidades.
          </p>
        </div>
        {puedeCrear && (
          <button
            onClick={handleCrear}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Registro
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl mb-6 max-w-fit">
        <button
          onClick={() => setActiveTab('clasificaciones')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'clasificaciones' 
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Clasificaciones
        </button>
        <button
          onClick={() => setActiveTab('marcas')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'marcas' 
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Marcas
        </button>
        <button
          onClick={() => setActiveTab('unidades')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'unidades' 
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Unidades
        </button>
      </div>

      <TablaCatalogos
        activeTab={activeTab}
        datos={datos[activeTab]}
        cargando={cargando}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
        onToggleActivo={handleToggleActivo}
      />

      {(modalType === 'crear' || modalType === 'editar') && (
        <ModalCrearEditar
          activeTab={activeTab}
          item={modalType === 'editar' ? itemActivo : null}
          onConfirm={handleGuardar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'eliminar' && (
        <ModalEliminar
          activeTab={activeTab}
          item={itemActivo}
          onConfirm={handleConfirmarEliminar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}
    </PageWrapper>
  );
}
