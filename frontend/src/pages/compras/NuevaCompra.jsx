import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import compraService from '../../services/compra.service';
import proveedorService from '../../services/proveedor.service';
import productoService from '../../services/producto.service';
import catalogoService from '../../services/catalogo.service';
import { ModalCrearEditar, ModalImagen } from '../productos/components/ProductoModals';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../hooks/usePermission';

export default function NuevaCompra() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { puede } = usePermission();

  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Alta rápida de producto nuevo sin salir de la compra
  const [modalNuevoProducto, setModalNuevoProducto] = useState(false);
  const [productoRecienCreado, setProductoRecienCreado] = useState(null);
  const [guardandoProducto, setGuardandoProducto] = useState(false);

  // Cabecera
  const [idProveedor, setIdProveedor] = useState('');
  const [idSucursalDestino, setIdSucursalDestino] = useState('');
  const [nroFactura, setNroFactura] = useState('');
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [montoPagado, setMontoPagado] = useState(0);

  // Detalle
  const [detalles, setDetalles] = useState([]);
  
  // Formulario temporal de nuevo item
  const [itemTemp, setItemTemp] = useState({
    id_producto: '',
    numero_lote_fab: '',
    fecha_produccion: '',
    fecha_vencimiento: '',
    cantidad_cajas: 1,
    unidades_por_caja: 1,
    precio_por_caja: 0
  });

  // Buscador de producto (autocompletado)
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [mostrarResultadosProducto, setMostrarResultadosProducto] = useState(false);

  const resultadosProducto = useMemo(() => {
    const q = busquedaProducto.trim().toLowerCase();
    if (!q) return [];
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(q) || (p.codigo_barras || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [busquedaProducto, productos]);

  const seleccionarProducto = (p) => {
    setItemTemp(prev => ({ ...prev, id_producto: p.id_producto.toString() }));
    setBusquedaProducto(`${p.nombre} (${p.codigo_barras || 'S/C'})`);
    setMostrarResultadosProducto(false);
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const [provRes, prodRes, sucRes, clasRes, marRes, uniRes] = await Promise.all([
        proveedorService.listar(),
        productoService.listar(),
        compraService.listarSucursalesDestino(),
        catalogoService.listarClasificaciones(),
        catalogoService.listarMarcas(),
        catalogoService.listarUnidades()
      ]);
      setProveedores(provRes.data.filter(p => p.activo === 1));
      setProductos(prodRes.data.filter(p => p.activo === 1));
      setSucursales(sucRes.data);
      setClasificaciones(clasRes.data);
      setMarcas(marRes.data);
      setUnidades(uniRes.data);
      setIdSucursalDestino(String(usuario?.id_sucursal || ''));
    } catch (err) {
      setError('Error al cargar catálogos. Intente recargar.');
    } finally {
      setCargando(false);
    }
  };

  // Crea el producto, lo agrega al catálogo local y lo deja preseleccionado
  // en el formulario de ítem; a continuación se ofrece subirle una imagen.
  const handleCrearProductoNuevo = async (formData) => {
    setGuardandoProducto(true);
    try {
      const res = await productoService.crear(formData);
      const nuevoProducto = { ...formData, id_producto: res.data.id_producto, activo: 1 };
      setProductos(prev => [...prev, nuevoProducto]);
      seleccionarProducto(nuevoProducto);
      setModalNuevoProducto(false);
      setProductoRecienCreado(nuevoProducto);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear el producto');
    } finally {
      setGuardandoProducto(false);
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

  const handleSubirImagenNuevoProducto = async (formDataImagen) => {
    if (!productoRecienCreado) return;
    setGuardandoProducto(true);
    try {
      await productoService.subirImagen(productoRecienCreado.id_producto, formDataImagen);
      setProductoRecienCreado(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al subir la imagen');
    } finally {
      setGuardandoProducto(false);
    }
  };

  const handleItemTempChange = (e) => {
    const { name, value } = e.target;
    setItemTemp(prev => ({ ...prev, [name]: value }));
  };

  const agregarItem = () => {
    if (!itemTemp.id_producto || itemTemp.cantidad_cajas <= 0 || itemTemp.precio_por_caja <= 0) {
      alert('Debe seleccionar un producto y especificar cantidad/precio válidos.');
      return;
    }

    const prodInfo = productos.find(p => p.id_producto.toString() === itemTemp.id_producto);
    const subtotal = parseFloat(itemTemp.cantidad_cajas) * parseFloat(itemTemp.precio_por_caja);

    setDetalles(prev => [...prev, {
      ...itemTemp,
      producto_nombre: prodInfo.nombre,
      subtotal
    }]);

    // Reset item temp
    setItemTemp({
      id_producto: '',
      numero_lote_fab: '',
      fecha_produccion: '',
      fecha_vencimiento: '',
      cantidad_cajas: 1,
      unidades_por_caja: 1,
      precio_por_caja: 0
    });
    setBusquedaProducto('');
  };

  const handleBusquedaProductoChange = (e) => {
    setBusquedaProducto(e.target.value);
    setMostrarResultadosProducto(true);
    setItemTemp(prev => ({ ...prev, id_producto: '' }));
  };

  const eliminarItem = (index) => {
    setDetalles(prev => prev.filter((_, i) => i !== index));
  };

  const calcSubtotalGeneral = () => {
    return detalles.reduce((acc, curr) => acc + curr.subtotal, 0);
  };

  const calcTotalGeneral = () => {
    return Math.max(0, calcSubtotalGeneral() - parseFloat(descuento || 0));
  };

  const guardarCompra = async () => {
    if (!idProveedor) return alert('Debe seleccionar un proveedor');
    if (detalles.length === 0) return alert('Debe agregar al menos un producto a la compra');
    
    setGuardando(true);
    try {
      const payload = {
        id_proveedor: idProveedor,
        id_sucursal: idSucursalDestino,
        nro_factura: nroFactura,
        fecha_compra: fechaCompra,
        metodo_pago: metodoPago,
        monto_pagado: metodoPago === 'CREDITO' ? parseFloat(montoPagado || 0) : calcTotalGeneral(),
        observaciones,
        subtotal: calcSubtotalGeneral(),
        descuento: parseFloat(descuento || 0),
        total: calcTotalGeneral(),
        detalles
      };

      await compraService.crear(payload);
      navigate('/compras', { state: { msg: 'Compra registrada exitosamente' } });
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar la compra');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <PageWrapper><div className="p-8 text-center text-zinc-500">Cargando módulos...</div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/compras')}
          className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Nueva Compra / Ingreso</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Registra una compra y agrégala a inventario</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Detalles de la Compra (Cabecera) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Datos del Documento
            </h3>
            
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Proveedor *</label>
              <select
                value={idProveedor}
                onChange={(e) => setIdProveedor(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 outline-none"
              >
                <option value="">-- Seleccione Proveedor --</option>
                {proveedores.map(p => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>{p.empresa}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Sucursal destino *</label>
              <select
                value={idSucursalDestino}
                onChange={(e) => setIdSucursalDestino(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 outline-none"
              >
                {sucursales.map(s => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
                ))}
              </select>
              <p className="text-xs text-zinc-400 mt-1">A dónde entra el stock (ej. almacén central antes de distribuir).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Fecha *</label>
              <input
                type="date"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Nro. Factura/Recibo</label>
              <input
                type="text"
                value={nroFactura}
                onChange={(e) => setNroFactura(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                placeholder="Ej. F-10293"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Método de pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 outline-none"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="QR">QR</option>
                <option value="CREDITO">Crédito (proveedor)</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            {metodoPago === 'CREDITO' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Anticipo pagado (Bs)</label>
                <input
                  type="number" min="0" step="0.5"
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                />
                <p className="text-xs text-zinc-400 mt-1">El saldo restante quedará en Cuentas por Pagar.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows="2"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Selector de Productos y Tabla */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="font-semibold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-4">
              Agregar Producto
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="sm:col-span-2 lg:col-span-4 relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Producto *</label>
                  {puede('crear', 'productos') && (
                    <button
                      type="button"
                      onClick={() => setModalNuevoProducto(true)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Nuevo producto
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o código de barras..."
                  value={busquedaProducto}
                  onChange={handleBusquedaProductoChange}
                  onFocus={() => setMostrarResultadosProducto(true)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                />
                {mostrarResultadosProducto && busquedaProducto.trim() && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMostrarResultadosProducto(false)} />
                    <div className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {resultadosProducto.length > 0 ? resultadosProducto.map(p => (
                        <button
                          key={p.id_producto}
                          type="button"
                          onClick={() => seleccionarProducto(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
                        >
                          <span className="font-medium">{p.nombre}</span>
                          <span className="block text-xs text-zinc-400">{p.codigo_barras || 'Sin código'}</span>
                        </button>
                      )) : (
                        <div className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                          No se encontraron productos para "{busquedaProducto}"
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Cajas compradas</label>
                <input
                  type="number" min="1" step="1" name="cantidad_cajas"
                  value={itemTemp.cantidad_cajas} onChange={handleItemTempChange}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">U. por Caja</label>
                <input
                  type="number" min="1" step="1" name="unidades_por_caja"
                  value={itemTemp.unidades_por_caja} onChange={handleItemTempChange}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Costo/Caja (Bs)</label>
                <input
                  type="number" min="0" step="0.01" name="precio_por_caja"
                  value={itemTemp.precio_por_caja} onChange={handleItemTempChange}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <button
                onClick={agregarItem}
                className="w-full bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>
            </div>

            {/* Opcionales del lote */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Lote Fábrica (Opcional)</label>
                <input
                  type="text" name="numero_lote_fab"
                  value={itemTemp.numero_lote_fab} onChange={handleItemTempChange}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Ej. L-2993"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">F. Producción</label>
                <input
                  type="date" name="fecha_produccion"
                  value={itemTemp.fecha_produccion} onChange={handleItemTempChange}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">F. Vencimiento</label>
                <input
                  type="date" name="fecha_vencimiento"
                  value={itemTemp.fecha_vencimiento} onChange={handleItemTempChange}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Tabla de Detalle */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            {detalles.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500">No hay productos en la lista</div>
            ) : (
              <>
                {/* ── Vista tabla (desktop) ─────────────────────────────── */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Producto</th>
                        <th className="px-4 py-3 font-medium text-center">Cajas</th>
                        <th className="px-4 py-3 font-medium text-center">U/C</th>
                        <th className="px-4 py-3 font-medium text-center">Costo Unit.</th>
                        <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {detalles.map((d, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                          <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{d.producto_nombre}</td>
                          <td className="px-4 py-3 text-center">{d.cantidad_cajas}</td>
                          <td className="px-4 py-3 text-center">{d.unidades_por_caja}</td>
                          <td className="px-4 py-3 text-center">Bs {parseFloat(d.precio_por_caja).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium">Bs {d.subtotal.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => eliminarItem(idx)} className="text-red-500 hover:text-red-700">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Vista tarjetas (móvil) ────────────────────────────── */}
                <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                  {detalles.map((d, idx) => (
                    <div key={idx} className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white truncate">{d.producto_nombre}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {d.cantidad_cajas} cajas × {d.unidades_por_caja} u/c · Bs {parseFloat(d.precio_por_caja).toFixed(2)}/caja
                        </p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">Bs {d.subtotal.toFixed(2)}</p>
                      </div>
                      <button onClick={() => eliminarItem(idx)} className="shrink-0 text-red-500 hover:text-red-700 p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Totales y Botón Guardar */}
            <div className="bg-zinc-50 dark:bg-zinc-800/80 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="w-full sm:w-64 space-y-2">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-sm">
                  <span>Subtotal:</span>
                  <span>Bs {calcSubtotalGeneral().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Descuento:</span>
                  <input
                    type="number" min="0" step="0.5"
                    value={descuento} onChange={(e) => setDescuento(e.target.value)}
                    className="w-24 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded outline-none text-right focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="flex justify-between text-lg font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span>Total Final:</span>
                  <span>Bs {calcTotalGeneral().toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={guardarCompra}
                disabled={guardando || detalles.length === 0}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {guardando ? 'Guardando...' : 'Finalizar Compra'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalNuevoProducto && (
        <ModalCrearEditar
          producto={null}
          clasificaciones={clasificaciones}
          marcas={marcas}
          unidades={unidades}
          onCrearClasificacion={handleCrearClasificacion}
          onCrearMarca={handleCrearMarca}
          onCrearUnidad={handleCrearUnidad}
          onConfirm={handleCrearProductoNuevo}
          onClose={() => setModalNuevoProducto(false)}
          guardando={guardandoProducto}
        />
      )}

      {productoRecienCreado && (
        <ModalImagen
          producto={productoRecienCreado}
          onSubir={handleSubirImagenNuevoProducto}
          onEliminar={() => {}}
          onClose={() => setProductoRecienCreado(null)}
          guardando={guardandoProducto}
        />
      )}
    </PageWrapper>
  );
}
