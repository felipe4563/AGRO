import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import TablaProductos from './components/TablaProductos';
import { ModalCrearEditar, ModalEliminar, ModalImagen } from './components/ProductoModals';
import ModalImprimirEtiquetas from '../../components/ModalImprimirEtiquetas';
import productoService from '../../services/producto.service';
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

export default function Productos() {
  const { puede } = usePermission();
  
  const [productos, setProductos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const [modalType, setModalType] = useState(null);
  const [productoActivo, setProductoActivo] = useState(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resProd, resClas, resMar, resUni] = await Promise.all([
        productoService.listar(),
        catalogoService.listarClasificaciones(),
        catalogoService.listarMarcas(),
        catalogoService.listarUnidades()
      ]);
      setProductos(resProd.data);
      setClasificaciones(resClas.data);
      setMarcas(resMar.data);
      setUnidades(resUni.data);
    } catch (err) {
      mostrarToast('error', 'Error al cargar los datos. Verifica tu conexión.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrear = () => {
    setProductoActivo(null);
    setModalType('crear');
  };

  const handleEditar = (p) => {
    setProductoActivo(p);
    setModalType('editar');
  };

  const handleEliminar = (p) => {
    setProductoActivo(p);
    setModalType('eliminar');
  };

  const handleGestionarImagen = (p) => {
    setProductoActivo(p);
    setModalType('imagen');
  };

  const handleImprimirEtiqueta = (p) => {
    setProductoActivo(p);
    setModalType('etiqueta');
  };

  const handleGuardarProducto = async (formData) => {
    setGuardando(true);
    try {
      if (modalType === 'crear') {
        await productoService.crear(formData);
        mostrarToast('ok', 'Producto creado correctamente');
      } else {
        await productoService.editar(productoActivo.id_producto, formData);
        mostrarToast('ok', 'Producto actualizado correctamente');
      }
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar producto');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!productoActivo) return;
    setGuardando(true);
    try {
      await productoService.eliminar(productoActivo.id_producto);
      mostrarToast('ok', 'Producto desactivado');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al desactivar producto');
    } finally {
      setGuardando(false);
    }
  };

  const handleSubirImagen = async (formData) => {
    setGuardando(true);
    try {
      await productoService.subirImagen(productoActivo.id_producto, formData);
      mostrarToast('ok', 'Imagen actualizada correctamente');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al subir imagen');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarImagen = async () => {
    setGuardando(true);
    try {
      await productoService.eliminarImagen(productoActivo.id_producto);
      mostrarToast('ok', 'Imagen eliminada');
      setModalType(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al eliminar imagen');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (p) => {
    try {
      const nuevoEstado = p.activo ? 0 : 1;
      await productoService.toggleActivo(p.id_producto, nuevoEstado);
      setProductos(prev => prev.map(prod => 
        prod.id_producto === p.id_producto ? { ...prod, activo: nuevoEstado } : prod
      ));
      mostrarToast('ok', `Producto ${nuevoEstado ? 'activado' : 'desactivado'}`);
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
            📦 Gestión de Productos
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Administra el catálogo, precios y configuración de stock.
          </p>
        </div>
        {puede('crear', 'productos') && (
          <button
            onClick={handleCrear}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </button>
        )}
      </div>

      <TablaProductos
        productos={productos}
        cargando={cargando}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
        onToggleActivo={handleToggleActivo}
        onGestionarImagen={handleGestionarImagen}
        onImprimirEtiqueta={handleImprimirEtiqueta}
      />

      {(modalType === 'crear' || modalType === 'editar') && (
        <ModalCrearEditar
          producto={modalType === 'editar' ? productoActivo : null}
          clasificaciones={clasificaciones}
          marcas={marcas}
          unidades={unidades}
          onConfirm={handleGuardarProducto}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'eliminar' && (
        <ModalEliminar
          producto={productoActivo}
          onConfirm={handleConfirmarEliminar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'imagen' && (
        <ModalImagen
          producto={productoActivo}
          onSubir={handleSubirImagen}
          onEliminar={handleEliminarImagen}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'etiqueta' && productoActivo && (
        <ModalImprimirEtiquetas
          items={[{
            id_producto: productoActivo.id_producto,
            nombre: productoActivo.nombre,
            codigo_barras: productoActivo.codigo_barras,
            precio_menor: productoActivo.precio_menor,
            cantidad: 1,
          }]}
          onClose={() => { setModalType(null); cargarDatos(); }}
        />
      )}
    </PageWrapper>
  );
}
