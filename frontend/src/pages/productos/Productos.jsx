import { useState, useEffect, useCallback, useMemo } from 'react';
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

  const [busqueda, setBusqueda] = useState('');
  const [filtroClasificacion, setFiltroClasificacion] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [pagina, setPagina] = useState(1);
  const PRODUCTOS_POR_PAGINA = 10;

  const productosFiltrados = useMemo(() => {
    const busquedaNorm = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (filtroClasificacion && String(p.id_clasificacion) !== filtroClasificacion) return false;
      if (filtroMarca && String(p.id_marca) !== filtroMarca) return false;
      if (filtroUnidad && String(p.id_unidad) !== filtroUnidad) return false;
      if (busquedaNorm) {
        const coincide = p.nombre?.toLowerCase().includes(busquedaNorm)
          || p.codigo_barras?.toLowerCase().includes(busquedaNorm);
        if (!coincide) return false;
      }
      return true;
    });
  }, [productos, busqueda, filtroClasificacion, filtroMarca, filtroUnidad]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroClasificacion, filtroMarca, filtroUnidad]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA));
  const productosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * PRODUCTOS_POR_PAGINA;
    return productosFiltrados.slice(inicio, inicio + PRODUCTOS_POR_PAGINA);
  }, [productosFiltrados, pagina]);

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

  const handleCrearClasificacion = async (datos) => {
    const { data } = await catalogoService.crearClasificacion(datos);
    setClasificaciones((prev) => [...prev, { id_clasificacion: data.id, nombre: datos.nombre.trim() }]);
    return data.id;
  };

  const handleCrearMarca = async (datos) => {
    const { data } = await catalogoService.crearMarca(datos);
    setMarcas((prev) => [...prev, { id_marca: data.id, nombre: datos.nombre.trim() }]);
    return data.id;
  };

  const handleCrearUnidad = async (datos) => {
    const { data } = await catalogoService.crearUnidad(datos);
    setUnidades((prev) => [...prev, { id_unidad: data.id, nombre: datos.nombre.trim(), abreviatura: datos.abreviatura.trim() }]);
    return data.id;
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
            Gestión de Productos
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

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código de barras..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filtroClasificacion}
          onChange={(e) => setFiltroClasificacion(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas las categorías</option>
          {clasificaciones.map((c) => (
            <option key={c.id_clasificacion} value={c.id_clasificacion}>{c.nombre}</option>
          ))}
        </select>
        <select
          value={filtroMarca}
          onChange={(e) => setFiltroMarca(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
          ))}
        </select>
        <select
          value={filtroUnidad}
          onChange={(e) => setFiltroUnidad(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas las medidas</option>
          {unidades.map((u) => (
            <option key={u.id_unidad} value={u.id_unidad}>{u.nombre}</option>
          ))}
        </select>
        {(busqueda || filtroClasificacion || filtroMarca || filtroUnidad) && (
          <button
            onClick={() => { setBusqueda(''); setFiltroClasificacion(''); setFiltroMarca(''); setFiltroUnidad(''); }}
            className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <TablaProductos
        productos={productosPaginados}
        cargando={cargando}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
        onToggleActivo={handleToggleActivo}
        onGestionarImagen={handleGestionarImagen}
        onImprimirEtiqueta={handleImprimirEtiqueta}
      />

      {!cargando && productosFiltrados.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          <p>
            Mostrando {(pagina - 1) * PRODUCTOS_POR_PAGINA + 1}-{Math.min(pagina * PRODUCTOS_POR_PAGINA, productosFiltrados.length)} de {productosFiltrados.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Anterior
            </button>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Página {pagina} de {totalPaginas}</span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {(modalType === 'crear' || modalType === 'editar') && (
        <ModalCrearEditar
          producto={modalType === 'editar' ? productoActivo : null}
          clasificaciones={clasificaciones}
          marcas={marcas}
          unidades={unidades}
          onCrearClasificacion={handleCrearClasificacion}
          onCrearMarca={handleCrearMarca}
          onCrearUnidad={handleCrearUnidad}
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
