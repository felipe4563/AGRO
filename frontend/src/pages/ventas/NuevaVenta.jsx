import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import ventaService from '../../services/venta.service';
import clienteService from '../../services/cliente.service';
import comboService from '../../services/combo.service';
import fidelizacionService from '../../services/fidelizacion.service';
import cajaService from '../../services/caja.service';
import { usePermission } from '../../hooks/usePermission';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'QR_BANCO', label: 'QR Banco' },
  { value: 'QR_MANUAL', label: 'QR Manual' },
  { value: 'TRANSFERENCIA', label: 'Transf.' },
  { value: 'CREDITO', label: 'Crédito' },
  { value: 'OTRO', label: 'Otro' },
];

function EscanerCamaraModal({ onDetectado, onClose }) {
  const [error, setError] = useState('');
  // Ref para siempre llamar la versión más reciente del callback sin
  // reiniciar la cámara cada vez que el componente padre re-renderiza.
  const onDetectadoRef = useRef(onDetectado);
  onDetectadoRef.current = onDetectado;

  useEffect(() => {
    const html5QrCode = new Html5Qrcode('lector-camara-venta');
    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (codigoDetectado) => onDetectadoRef.current(codigoDetectado),
        () => {} // errores de frames sin código: ignorar, son normales
      )
      .catch(() => {
        setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
      });

    return () => {
      html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-zinc-900 dark:text-white">📷 Escanear código de barras</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <div id="lector-camara-venta" className="rounded-xl overflow-hidden" />
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
          Apunta la cámara al código de barras del producto.
        </p>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-xs sm:max-w-sm ${
      toast.tipo === 'ok'
        ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
    }`}>
      <span className="shrink-0">{toast.tipo === 'ok' ? '✅' : '⚠️'}</span>
      <span className="break-words">{toast.msg}</span>
    </div>
  );
}

export default function NuevaVenta() {
  const navigate = useNavigate();
  const { puede } = usePermission();

  const [clientes, setClientes] = useState([]);
  const [productosStock, setProductosStock] = useState([]);
  const [combos, setCombos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);
  const [ventaCompletadaId, setVentaCompletadaId] = useState(null);
  const [turnoActivo, setTurnoActivo] = useState(undefined); // undefined = cargando, null = sin turno, obj = turno abierto

  const [vistaMovil, setVistaMovil] = useState('catalogo'); // 'catalogo' | 'carrito' — solo aplica < md
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [soloPromociones, setSoloPromociones] = useState(false);
  const busquedaRef = useRef(null);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [carrito, setCarrito] = useState([]);
  const [idCliente, setIdCliente] = useState('');
  const [tipoVenta, setTipoVenta] = useState('MENOR');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [qrManualConfirmado, setQrManualConfirmado] = useState(false);
  const [modalQrBanco, setModalQrBanco] = useState(null); // { qrId, qrImage } | null
  const [verificandoQrBanco, setVerificandoQrBanco] = useState(false);
  const [errorQrBanco, setErrorQrBanco] = useState('');
  const [generandoQrBanco, setGenerandoQrBanco] = useState(false);
  const pollingQrBancoRef = useRef(null);
  const [montoPagado, setMontoPagado] = useState('');
  const [nroFactura, setNroFactura] = useState('');
  const [descuentoValor, setDescuentoValor] = useState('');
  const [tipoDescuento, setTipoDescuento] = useState('PCT'); // 'PCT' | 'BS'

  const [recompensas, setRecompensas] = useState([]);
  const [clientePuntos, setClientePuntos] = useState(null);
  const [recompensaAplicada, setRecompensaAplicada] = useState(null);
  const [mostrarRecompensas, setMostrarRecompensas] = useState(false);

  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarBusquedaCliente, setMostrarBusquedaCliente] = useState(false);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ ci_nit: '', nombre: '', apellido: '', telefono: '', direccion: '', tipo_cliente: 'MINORISTA' });
  const [buscandoPersonaVenta, setBuscandoPersonaVenta] = useState(false);
  const [mensajeBusquedaVenta, setMensajeBusquedaVenta] = useState(null);
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    cargarDatos();
    busquedaRef.current?.focus();
  }, []);

  // Recalcular precios del carrito cuando cambia el tipo de venta
  useEffect(() => {
    if (carrito.length === 0 || productosStock.length === 0) return;
    setCarrito(prev => prev.map(item => {
      // Los items de combo/recompensa tienen precio propio, no siguen el precio_menor/mayor del producto
      if (item.id_combo || item.id_recompensa) return item;
      const prod = productosStock.find(p => p.id_producto === item.id_producto);
      if (!prod) return item;
      const nuevoPrecioBase = tipoVenta === 'MAYOR' ? prod.precio_mayor : prod.precio_menor;
      const nuevoPrecio = item.tipo_cantidad === 'CAJA'
        ? Math.round((nuevoPrecioBase || 0) * (item.unidades_por_caja || 1) * 100) / 100
        : (nuevoPrecioBase || 0);
      const cant = parseFloat(item.cantidad) || 0;
      return { ...item, precio_base_unidad: nuevoPrecioBase || 0, precio_unitario: nuevoPrecio, subtotal: cant * nuevoPrecio };
    }));
  }, [tipoVenta]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navegar a la página ticket cuando se completa una venta
  useEffect(() => {
    if (ventaCompletadaId) {
      navigate(`/ventas/${ventaCompletadaId}/ticket`);
    }
  }, [ventaCompletadaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar de cliente: refrescar sus puntos y descartar cualquier recompensa aplicada
  useEffect(() => {
    setCarrito(prev => prev.filter(item => !item.id_recompensa));
    setRecompensaAplicada(null);
    setMostrarRecompensas(false);
    if (!idCliente) { setClientePuntos(null); return; }
    fidelizacionService.obtenerCliente(idCliente)
      .then(r => setClientePuntos(r.data.puntos_fidelidad))
      .catch(() => setClientePuntos(null));
  }, [idCliente]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarDatos = async () => {
    try {
      const [cliRes, posRes, combosRes, recompensasRes, turnoRes] = await Promise.all([
        clienteService.listar(),
        ventaService.listarProductosPOS(),
        comboService.listarPOS(),
        fidelizacionService.listarRecompensas(),
        cajaService.obtenerTurnoActivo(),
      ]);
      setTurnoActivo(turnoRes.data);
      setClientes(cliRes.data.filter(c => c.activo === 1));
      setProductosStock(posRes.data.map(p => ({
        ...p,
        precio_menor: parseFloat(p.precio_menor) || 0,
        precio_mayor: parseFloat(p.precio_mayor) || 0,
        descuento_menor: parseFloat(p.descuento_menor) || 0,
        descuento_mayor: parseFloat(p.descuento_mayor) || 0,
        stock_unidades_total: parseInt(p.stock_unidades_total) || 0,
        precio_menor_original: p.precio_menor_original != null ? parseFloat(p.precio_menor_original) : null,
        precio_mayor_original: p.precio_mayor_original != null ? parseFloat(p.precio_mayor_original) : null,
      })));
      setCombos(combosRes.data.map(c => ({ ...c, precio_combo: parseFloat(c.precio_combo) || 0 })));
      setRecompensas(recompensasRes.data.filter(r => r.activo));
    } catch {
      mostrarToast('error', 'Error al cargar datos del POS');
    } finally {
      setCargando(false);
    }
  };

  const categorias = useMemo(() => {
    const mapa = new Map();
    productosStock.forEach(p => {
      if (p.id_clasificacion && !mapa.has(p.id_clasificacion)) {
        mapa.set(p.id_clasificacion, p.clasificacion_nombre || 'Sin categoría');
      }
    });
    return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productosStock]);

  const marcas = useMemo(() => {
    const mapa = new Map();
    productosStock.forEach(p => {
      if (p.id_marca && !mapa.has(p.id_marca)) {
        mapa.set(p.id_marca, p.marca_nombre || 'Sin marca');
      }
    });
    return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productosStock]);

  const productosFiltrados = useMemo(() => {
    const b = busqueda.toLowerCase();
    return productosStock.filter(p => {
      if (busqueda && !(
        p.nombre.toLowerCase().includes(b) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(b))
      )) return false;
      if (filtroCategoria && String(p.id_clasificacion) !== filtroCategoria) return false;
      if (filtroMarca && String(p.id_marca) !== filtroMarca) return false;
      if (soloPromociones && !p.en_promocion) return false;
      return true;
    });
  }, [busqueda, productosStock, filtroCategoria, filtroMarca, soloPromociones]);

  // Los combos siempre se muestran (como en la referencia, no dependen de los
  // filtros de marca/clasificación, que no aplican a un paquete de productos).
  const combosFiltrados = useMemo(() => {
    if (soloPromociones) return [];
    if (!busqueda) return combos;
    const b = busqueda.toLowerCase();
    return combos.filter(c => c.nombre.toLowerCase().includes(b));
  }, [busqueda, combos, soloPromociones]);

  const agregarAlCarrito = (prod) => {
    const index = carrito.findIndex(item => item.id_producto === prod.id_producto);
    const precioBase = tipoVenta === 'MAYOR' ? prod.precio_mayor : prod.precio_menor;
    if (index >= 0) {
      const nuevoCar = [...carrito];
      if (nuevoCar[index].cantidad + 1 > prod.stock_unidades_total) {
        mostrarToast('error', 'No hay suficiente stock disponible');
        return;
      }
      nuevoCar[index].cantidad += 1;
      nuevoCar[index].subtotal = nuevoCar[index].cantidad * nuevoCar[index].precio_unitario;
      setCarrito(nuevoCar);
    } else {
      setCarrito([...carrito, {
        id_producto: prod.id_producto,
        nombre: prod.nombre,
        tipo_cantidad: 'UNIDAD',
        cantidad: 1,
        precio_unitario: precioBase || 0,
        precio_base_unidad: precioBase || 0,
        unidades_por_caja: prod.unidades_por_caja,
        stock_maximo: prod.stock_unidades_total,
        subtotal: precioBase || 0,
      }]);
    }
  };

  const agregarComboAlCarrito = (combo) => {
    const sumaNormal = combo.productos.reduce((acc, p) => acc + p.precio_menor * p.cantidad, 0);
    let restante = combo.precio_combo;
    const nuevosItems = combo.productos.map((p, idx) => {
      const proporcion = sumaNormal > 0 ? (p.precio_menor * p.cantidad) / sumaNormal : 1 / combo.productos.length;
      const esUltimo = idx === combo.productos.length - 1;
      const precioAsignado = esUltimo ? restante : Math.round(combo.precio_combo * proporcion * 100) / 100;
      restante -= precioAsignado;
      return {
        id_producto: p.id_producto,
        id_combo: combo.id_combo,
        nombre: `${p.producto_nombre}  🎁 ${combo.nombre}`,
        tipo_cantidad: 'UNIDAD',
        cantidad: p.cantidad,
        precio_unitario: Math.round((precioAsignado / p.cantidad) * 100) / 100,
        unidades_por_caja: 1,
        stock_maximo: p.stock_producto,
        subtotal: precioAsignado,
      };
    });
    setCarrito((prev) => [...prev, ...nuevosItems]);
    mostrarToast('ok', `Combo "${combo.nombre}" agregado`);
  };

  const recompensasElegibles = useMemo(() => {
    if (clientePuntos == null) return [];
    return recompensas.filter((r) => r.costo_puntos <= clientePuntos);
  }, [recompensas, clientePuntos]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => String(c.id_cliente) === String(idCliente)) || null,
    [clientes, idCliente]
  );

  const resultadosCliente = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q) return [];
    return clientes.filter((c) =>
      (c.ci_nit && c.ci_nit.toLowerCase().includes(q)) ||
      c.nombre.toLowerCase().includes(q) ||
      (c.apellido && c.apellido.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [busquedaCliente, clientes]);

  const seleccionarCliente = (c) => {
    setIdCliente(String(c.id_cliente));
    setBusquedaCliente('');
    setMostrarBusquedaCliente(false);
  };

  const quitarCliente = () => {
    setIdCliente('');
    setBusquedaCliente('');
    setMetodoPago((m) => (m === 'CREDITO' ? 'EFECTIVO' : m));
  };

  const abrirFormNuevoCliente = () => {
    const texto = busquedaCliente.trim();
    const esNumerico = /^\d+$/.test(texto);
    setNuevoCliente({
      ci_nit: esNumerico ? texto : '',
      nombre: esNumerico ? '' : texto,
      apellido: '',
      telefono: '',
      direccion: '',
      tipo_cliente: 'MINORISTA',
    });
    setMostrarFormCliente(true);
    setMostrarBusquedaCliente(false);
  };

  const buscarPersonaVenta = async () => {
    const codigo = nuevoCliente.ci_nit.trim();
    if (!codigo) return;
    setMensajeBusquedaVenta(null);
    setBuscandoPersonaVenta(true);
    try {
      const res = await clienteService.buscarPersona(codigo);
      const tieneDatos = nuevoCliente.nombre.trim() || nuevoCliente.apellido.trim();
      if (tieneDatos && !window.confirm('Ya hay nombre/apellido escritos. ¿Reemplazarlos con los datos encontrados?')) {
        return;
      }
      setNuevoCliente((prev) => ({
        ...prev,
        nombre: res.data.nombre || prev.nombre,
        apellido: res.data.apellido || prev.apellido,
      }));
      setMensajeBusquedaVenta({ tipo: 'ok', texto: 'Persona encontrada, datos completados' });
    } catch (err) {
      if (err.response?.status === 404) {
        setMensajeBusquedaVenta({ tipo: 'error', texto: 'No se encontró ninguna persona con ese CI' });
      } else {
        setMensajeBusquedaVenta({ tipo: 'error', texto: 'Error al consultar la API de personas' });
      }
    } finally {
      setBuscandoPersonaVenta(false);
    }
  };

  const crearClienteRapido = async () => {
    if (!nuevoCliente.nombre.trim()) { mostrarToast('error', 'El nombre es obligatorio'); return; }
    setGuardandoCliente(true);
    try {
      const res = await clienteService.crear({
        ci_nit: nuevoCliente.ci_nit.trim() || null,
        nombre: nuevoCliente.nombre.trim(),
        apellido: nuevoCliente.apellido.trim() || null,
        telefono: nuevoCliente.telefono.trim() || null,
        direccion: nuevoCliente.direccion.trim() || null,
        tipo_cliente: nuevoCliente.tipo_cliente,
      });
      const nuevo = {
        id_cliente: res.data.id_cliente,
        ci_nit: nuevoCliente.ci_nit.trim() || null,
        nombre: nuevoCliente.nombre.trim(),
        apellido: nuevoCliente.apellido.trim() || null,
        empresa: null,
        activo: 1,
      };
      setClientes((prev) => [nuevo, ...prev]);
      setIdCliente(String(nuevo.id_cliente));
      setMostrarFormCliente(false);
      setBusquedaCliente('');
      mostrarToast('ok', 'Cliente registrado y seleccionado');
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al registrar cliente');
    } finally {
      setGuardandoCliente(false);
    }
  };

  const quitarRecompensa = () => {
    setCarrito((prev) => prev.filter((item) => !item.id_recompensa));
    setRecompensaAplicada(null);
  };

  const aplicarRecompensa = (r) => {
    if (recompensaAplicada) quitarRecompensa();

    if (r.tipo === 'PRODUCTO') {
      if (r.id_producto) {
        const prod = productosStock.find((p) => p.id_producto === r.id_producto);
        setCarrito((prev) => [...prev, {
          id_producto: r.id_producto,
          id_recompensa: r.id_recompensa,
          nombre: `🎁 ${prod?.nombre || r.producto_nombre} (recompensa)`,
          tipo_cantidad: 'UNIDAD',
          cantidad: 1,
          precio_unitario: 0,
          unidades_por_caja: prod?.unidades_por_caja || 1,
          stock_maximo: prod?.stock_unidades_total || 1,
          subtotal: 0,
        }]);
      } else if (r.id_combo) {
        const combo = combos.find((c) => c.id_combo === r.id_combo);
        if (combo) {
          const nuevosItems = combo.productos.map((p) => ({
            id_producto: p.id_producto,
            id_recompensa: r.id_recompensa,
            nombre: `🎁 ${p.producto_nombre} (recompensa: ${combo.nombre})`,
            tipo_cantidad: 'UNIDAD',
            cantidad: p.cantidad,
            precio_unitario: 0,
            unidades_por_caja: 1,
            stock_maximo: p.stock_producto,
            subtotal: 0,
          }));
          setCarrito((prev) => [...prev, ...nuevosItems]);
        }
      }
    }

    setRecompensaAplicada(r);
    setMostrarRecompensas(false);
    mostrarToast('ok', `Recompensa "${r.nombre}" aplicada`);
  };

  const actualizarItem = (index, campo, valor) => {
    const nuevoCar = [...carrito];
    nuevoCar[index][campo] = valor;

    // Al alternar Unidad/Caja se recalcula el precio a partir del precio por unidad
    // (precio_base_unidad) × unidades_por_caja — así una caja no queda cobrándose al precio de una sola unidad.
    if (campo === 'tipo_cantidad' && nuevoCar[index].precio_base_unidad != null) {
      const base = nuevoCar[index].precio_base_unidad;
      const porCaja = nuevoCar[index].unidades_por_caja || 1;
      nuevoCar[index].precio_unitario = valor === 'CAJA'
        ? Math.round(base * porCaja * 100) / 100
        : base;
    }

    if (campo === 'cantidad' || campo === 'precio_unitario' || campo === 'tipo_cantidad') {
      const cant = Math.max(0, parseFloat(nuevoCar[index].cantidad) || 0);
      const precio = Math.max(0, parseFloat(nuevoCar[index].precio_unitario) || 0);
      nuevoCar[index].cantidad = cant;
      nuevoCar[index].precio_unitario = precio;
      let unidadesReq = cant;
      if (nuevoCar[index].tipo_cantidad === 'CAJA') {
        unidadesReq = cant * nuevoCar[index].unidades_por_caja;
      }
      if (unidadesReq > nuevoCar[index].stock_maximo) {
        mostrarToast('error', `Stock disponible: ${nuevoCar[index].stock_maximo} unidades`);
        nuevoCar[index].cantidad = 1;
        nuevoCar[index].subtotal = precio;
      } else {
        nuevoCar[index].subtotal = cant * precio;
      }
    }
    setCarrito(nuevoCar);
  };

  const eliminarDelCarrito = (index) => {
    const item = carrito[index];
    if (item?.id_recompensa) {
      setCarrito(carrito.filter((it) => it.id_recompensa !== item.id_recompensa));
      setRecompensaAplicada(null);
      return;
    }
    setCarrito(carrito.filter((_, i) => i !== index));
  };

  // Busca un producto por código de barras exacto y lo agrega al carrito.
  // Devuelve true si encontró coincidencia. Compartida por el lector físico
  // (Enter en el buscador) y el escáner por cámara.
  const buscarYAgregarPorCodigo = (codigo) => {
    const texto = codigo.trim().toLowerCase();
    if (!texto) return false;
    const porCodigo = productosStock.find(
      p => p.codigo_barras && p.codigo_barras.toLowerCase() === texto
    );
    if (porCodigo) {
      agregarAlCarrito(porCodigo);
      return true;
    }
    return false;
  };

  // Un código detectado por la cámara: si hay coincidencia, agrega y cierra
  // el modal; si no, avisa y deja la cámara abierta para reintentar.
  const handleCodigoEscaneado = (codigo) => {
    if (buscarYAgregarPorCodigo(codigo)) {
      mostrarToast('ok', `Producto agregado (código ${codigo})`);
      setMostrarEscaner(false);
    } else {
      mostrarToast('error', `Sin coincidencia para el código ${codigo}`);
    }
  };

  // Soporte de lector de código de barras: Enter agrega el producto si hay coincidencia exacta
  const handleBusquedaKeyDown = (e) => {
    if (e.key !== 'Enter' || !busqueda.trim()) return;
    if (buscarYAgregarPorCodigo(busqueda)) {
      setBusqueda('');
      return;
    }
    if (productosFiltrados.length === 1) {
      agregarAlCarrito(productosFiltrados[0]);
      setBusqueda('');
    }
  };

  const totales = useMemo(() => {
    const subtotal = carrito.reduce((acc, item) => acc + (parseFloat(item.subtotal) || 0), 0);
    const valor = parseFloat(descuentoValor) || 0;
    // El backend solo entiende descuento en %, así que un descuento en Bs se traduce
    // al % equivalente sobre el subtotal antes de calcular todo lo demás.
    const pctEfectivo = tipoDescuento === 'BS'
      ? (subtotal > 0 ? Math.min(100, (valor / subtotal) * 100) : 0)
      : Math.min(100, valor);
    const descuento_total = subtotal * (pctEfectivo / 100);
    let total = Math.max(0, subtotal - descuento_total);

    let descuento_recompensa = 0;
    if (recompensaAplicada?.tipo === 'DESCUENTO') {
      descuento_recompensa = recompensaAplicada.tipo_descuento === 'PCT'
        ? total * (parseFloat(recompensaAplicada.valor_descuento) / 100)
        : parseFloat(recompensaAplicada.valor_descuento);
      total = Math.max(0, total - descuento_recompensa);
    }

    const pagado = parseFloat(montoPagado) || 0;
    const cambio = pagado > 0 ? pagado - total : 0;
    return { subtotal, pctEfectivo, descuento_total, descuento_recompensa, total, cambio };
  }, [carrito, montoPagado, descuentoValor, tipoDescuento, recompensaAplicada]);

  const puedeDescuento = puede('aplicar_descuento', 'ventas');
  const puedeDescuentoLibre = puede('descuento_libre', 'ventas');
  const puedeCambiarPrecio = puede('cambiar_precio', 'ventas');

  const procesarVenta = async (extra = {}) => {
    if (carrito.length === 0) { mostrarToast('error', 'El carrito está vacío'); return; }
    if (totales.total <= 0) { mostrarToast('error', 'El total debe ser mayor a 0'); return; }
    if (metodoPago === 'CREDITO' && !idCliente) { mostrarToast('error', 'Seleccione un cliente para venta a crédito'); return; }
    if (metodoPago !== 'CREDITO' && parseFloat(montoPagado) > 0 && totales.cambio < 0) { mostrarToast('error', 'El monto pagado es insuficiente'); return; }
    if (metodoPago === 'QR_MANUAL' && !qrManualConfirmado) { mostrarToast('error', 'Confirma que verificaste el pago antes de continuar'); return; }
    const sinPrecio = carrito.find(c => !c.id_recompensa && parseFloat(c.precio_unitario) <= 0);
    if (sinPrecio) { mostrarToast('error', `Establezca precio para: ${sinPrecio.nombre}`); return; }
    const sinCantidad = carrito.find(c => !(parseFloat(c.cantidad) > 0));
    if (sinCantidad) { mostrarToast('error', `Cantidad inválida para: ${sinCantidad.nombre}`); return; }

    setGuardando(true);
    try {
      // En crédito, lo "pagado" es el abono (0 si no se especifica); en otros métodos, si no se indica se asume pago completo.
      const montoPagadoFinal = metodoPago === 'CREDITO'
        ? (parseFloat(montoPagado) || 0)
        : (parseFloat(montoPagado) || totales.total);

      const metodoPagoReal = (metodoPago === 'QR_MANUAL' || metodoPago === 'QR_BANCO') ? 'QR' : metodoPago;

      const payload = {
        id_cliente: idCliente || null,
        nro_factura: nroFactura || null,
        tipo_venta: tipoVenta,
        subtotal: totales.subtotal,
        descuento_total: totales.descuento_total,
        total: totales.total,
        monto_pagado: montoPagadoFinal,
        cambio: totales.cambio > 0 ? totales.cambio : 0,
        metodo_pago: metodoPagoReal,
        ...extra,
        canje_recompensa: recompensaAplicada ? { id_recompensa: recompensaAplicada.id_recompensa } : null,
        detalles: carrito.map(c => ({
          id_producto: c.id_producto,
          id_combo: c.id_combo || null,
          id_recompensa: c.id_recompensa || null,
          tipo_cantidad: c.tipo_cantidad,
          cantidad: parseFloat(c.cantidad),
          precio_unitario: parseFloat(c.precio_unitario),
          unidades_por_caja: c.unidades_por_caja,
          descuento_pct: totales.pctEfectivo,
          descuento_monto: (parseFloat(c.subtotal) * (totales.pctEfectivo / 100)),
          subtotal: parseFloat(c.subtotal) * (1 - totales.pctEfectivo / 100),
        }))
      };
      const res = await ventaService.crear(payload);
      mostrarToast('ok', 'Venta registrada correctamente');
      setVentaCompletadaId(res.data.id_venta);
      setCarrito([]);
      setMontoPagado('');
      setNroFactura('');
      setDescuentoValor('');
      setRecompensaAplicada(null);
      setQrManualConfirmado(false);
      setModalQrBanco(null);
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al procesar la venta');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarCobroQrBanco = async () => {
    if (carrito.length === 0) { mostrarToast('error', 'El carrito está vacío'); return; }
    if (totales.total <= 0) { mostrarToast('error', 'El total debe ser mayor a 0'); return; }

    setErrorQrBanco('');
    setGenerandoQrBanco(true);
    try {
      const res = await ventaService.generarQrBanco({ monto: totales.total });
      setModalQrBanco({ qrId: res.data.qrId, qrImage: res.data.qrImage });

      pollingQrBancoRef.current = setInterval(async () => {
        try {
          const estado = await ventaService.estadoQrBanco(res.data.qrId);
          if (estado.data.pagado) {
            clearInterval(pollingQrBancoRef.current);
            pollingQrBancoRef.current = null;
            setVerificandoQrBanco(true);
            await procesarVenta({ qr_tipo: 'BANCO', qr_referencia: res.data.qrId });
            setVerificandoQrBanco(false);
          }
        } catch {
          // fallo transitorio de un ciclo de polling: se reintenta en el siguiente
        }
      }, 4000);
    } catch (err) {
      setErrorQrBanco(err.response?.data?.error || 'No se pudo generar el QR, intenta de nuevo o usa QR Manual');
    } finally {
      setGenerandoQrBanco(false);
    }
  };

  const cerrarModalQrBanco = () => {
    if (pollingQrBancoRef.current) {
      clearInterval(pollingQrBancoRef.current);
      pollingQrBancoRef.current = null;
    }
    if (modalQrBanco?.qrId) {
      ventaService.anularQrBanco(modalQrBanco.qrId).catch(() => {});
    }
    setModalQrBanco(null);
    setErrorQrBanco('');
  };

  useEffect(() => {
    return () => {
      if (pollingQrBancoRef.current) clearInterval(pollingQrBancoRef.current);
    };
  }, []);

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
      <p className="text-zinc-500">Cargando POS...</p>
    </div>
  );

  if (!turnoActivo) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4">
      <div className="max-w-sm w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 text-center">
        <p className="text-4xl mb-3">🔒</p>
        <h2 className="font-bold text-zinc-900 dark:text-white mb-1">Caja cerrada</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
          No hay un turno de caja abierto en esta sucursal. Abre un turno antes de vender.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/ventas')}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Volver
          </button>
          <button
            onClick={() => navigate('/caja')}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold"
          >
            Ir a Caja
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col md:flex-row overflow-hidden">
      <Toast toast={toast} />

      {mostrarEscaner && (
        <EscanerCamaraModal
          onDetectado={handleCodigoEscaneado}
          onClose={() => setMostrarEscaner(false)}
        />
      )}

      {/* Tabs móviles: alternar entre Catálogo y Carrito */}
      <div className="md:hidden shrink-0 grid grid-cols-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setVistaMovil('catalogo')}
          className={`py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            vistaMovil === 'catalogo'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-400'
          }`}
        >
          📦 Catálogo
        </button>
        <button
          onClick={() => setVistaMovil('carrito')}
          className={`py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            vistaMovil === 'carrito'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-400'
          }`}
        >
          🧾 Carrito
          {carrito.length > 0 && (
            <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">
              {carrito.length}
            </span>
          )}
        </button>
      </div>

      {/* Panel Izquierdo: Catálogo */}
      <div className={`${vistaMovil === 'catalogo' ? 'flex' : 'hidden'} md:flex w-full flex-col flex-1 min-w-0 min-h-0 md:h-screen border-r border-zinc-200 dark:border-zinc-800`}>
        <div className="p-4 bg-white dark:bg-zinc-900 shadow-sm z-10 flex gap-4 items-center shrink-0">
          <button onClick={() => navigate('/ventas')} className="p-2 text-zinc-500 hover:text-zinc-800 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="relative flex-1">
            <input
              ref={busquedaRef}
              type="text"
              placeholder="Buscar por nombre, código o escanear barras (Enter)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={handleBusquedaKeyDown}
              className="w-full pl-10 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <svg className="w-5 h-5 absolute left-3 top-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setMostrarEscaner(true)}
            title="Escanear con cámara"
            className="p-3 text-zinc-500 hover:text-emerald-600 bg-zinc-100 dark:bg-zinc-800 rounded-xl shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V7a2 2 0 012-2h2M3 15v2a2 2 0 002 2h2m10-14h2a2 2 0 012 2v2m-4 10h2a2 2 0 002-2v-2M8 12h8" />
            </svg>
          </button>
        </div>

        {(categorias.length > 0 || marcas.length > 0 || productosStock.some(p => p.en_promocion)) && (
          <div className="bg-white dark:bg-zinc-900 shrink-0 px-4 pb-3 flex gap-2 items-end">
            {productosStock.some(p => p.en_promocion) && (
              <button
                type="button"
                onClick={() => setSoloPromociones((v) => !v)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  soloPromociones
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                🔥 Promociones
              </button>
            )}
            {marcas.length > 0 && (
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Marca</label>
                <select
                  value={filtroMarca}
                  onChange={(e) => setFiltroMarca(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todas las marcas</option>
                  {marcas.map(m => (
                    <option key={m.id} value={String(m.id)}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            {categorias.length > 0 && (
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Clasificación</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todas las clasificaciones</option>
                  {categorias.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto sin-scrollbar p-4 bg-zinc-50 dark:bg-zinc-950">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {combosFiltrados.map(c => (
              <div
                key={`combo-${c.id_combo}`}
                onClick={() => agregarComboAlCarrito(c)}
                className="min-w-0 bg-blue-50 dark:bg-blue-900/20 rounded-2xl overflow-hidden shadow-sm border-2 border-blue-300 dark:border-blue-700 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative w-full min-w-0 aspect-square bg-blue-100 dark:bg-blue-900/40 shrink-0 overflow-hidden">
                  {c.imagen ? (
                    <img
                      src={`${API_BASE}/uploads/${c.imagen}`}
                      alt={c.nombre}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-300 dark:text-blue-700">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375C2.754 3.75 2.25 4.254 2.25 4.875v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full">
                    🎁 Combo
                  </span>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-zinc-900 dark:text-white leading-tight mb-1 text-sm line-clamp-2">{c.nombre}</h3>
                  <p className="text-[10px] text-zinc-500 leading-tight line-clamp-2 break-words">
                    {c.productos.map(p => `${p.cantidad}x ${p.producto_nombre}`).join(' + ')}
                  </p>
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Precio combo</p>
                      <p className="font-bold text-blue-600 dark:text-blue-400 text-sm">Bs {c.precio_combo.toFixed(2)}</p>
                      <p className="text-[10px] text-zinc-400">{c.disponible} disp.</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {productosFiltrados.map(p => (
              <div
                key={p.id_producto}
                onClick={() => agregarAlCarrito(p)}
                className="min-w-0 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative w-full min-w-0 aspect-square bg-zinc-100 dark:bg-zinc-800 shrink-0 overflow-hidden">
                  {p.imagen ? (
                    <img
                      src={`${API_BASE}/uploads/${p.imagen}`}
                      alt={p.nombre}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V7.5a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5zM3 16l5-5a2 2 0 012.8 0l1.7 1.7M14 12l1.6-1.6a2 2 0 012.8 0L21 13" />
                        <circle cx="8" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
                      </svg>
                    </div>
                  )}
                  {p.en_promocion && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded-full">
                      -{p.descuento_promocion_pct}%
                    </span>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                <h3 className="font-bold text-zinc-900 dark:text-white leading-tight mb-1 text-sm line-clamp-2">{p.nombre}</h3>
                <p className="text-xs text-zinc-500 font-mono">{p.codigo_barras || 'S/C'}</p>
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                      {tipoVenta === 'MAYOR' ? 'Precio Mayor' : 'Precio Menor'}
                    </p>
                    {p.en_promocion && (
                      <p className="text-[10px] text-zinc-400 line-through">
                        Bs {(tipoVenta === 'MAYOR' ? p.precio_mayor_original : p.precio_menor_original).toFixed(2)}
                      </p>
                    )}
                    <p className={`font-bold text-sm ${p.en_promocion ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      Bs {(tipoVenta === 'MAYOR' ? p.precio_mayor : p.precio_menor).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-zinc-400">{p.stock_unidades_total} u</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
          {productosFiltrados.length === 0 && (
            <div className="text-center mt-12 text-zinc-400">No se encontraron productos con stock.</div>
          )}
        </div>
      </div>

      {/* Panel Derecho: Carrito y Cobro */}
      <div className={`${vistaMovil === 'carrito' ? 'flex' : 'hidden'} md:flex w-full md:w-[360px] lg:w-[380px] shrink-0 bg-white dark:bg-zinc-900 flex-col min-h-0 md:h-screen shadow-2xl z-20`}>

        {/* Cabecera */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              {clienteSeleccionado ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-white leading-tight">
                      {clienteSeleccionado.nombre} {clienteSeleccionado.apellido || clienteSeleccionado.empresa || ''}
                    </p>
                    {clienteSeleccionado.ci_nit && (
                      <p className="text-[10px] text-zinc-400 leading-tight">CI/NIT: {clienteSeleccionado.ci_nit}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={quitarCliente}
                    title="Cambiar cliente"
                    className="shrink-0 text-zinc-400 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Cliente Casual — buscar por CI o nombre"
                    value={busquedaCliente}
                    onChange={(e) => { setBusquedaCliente(e.target.value); setMostrarBusquedaCliente(true); }}
                    onFocus={() => setMostrarBusquedaCliente(true)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {mostrarBusquedaCliente && busquedaCliente.trim() && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setMostrarBusquedaCliente(false)} />
                      <div className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-56 overflow-y-auto sin-scrollbar">
                        {resultadosCliente.length > 0 ? resultadosCliente.map((c) => (
                          <button
                            key={c.id_cliente}
                            type="button"
                            onClick={() => seleccionarCliente(c)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
                          >
                            <span className="font-medium">{c.nombre} {c.apellido || c.empresa || ''}</span>
                            {c.ci_nit && <span className="block text-xs text-zinc-400">CI/NIT: {c.ci_nit}</span>}
                          </button>
                        )) : (
                          <button
                            type="button"
                            onClick={abrirFormNuevoCliente}
                            className="w-full text-left px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            No se encontró — registrar cliente nuevo
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <select
              value={tipoVenta}
              onChange={(e) => setTipoVenta(e.target.value)}
              className="w-1/3 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="MENOR">Menor</option>
              <option value="MAYOR">Mayor</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="N° Factura (opcional)"
            value={nroFactura}
            onChange={e => setNroFactura(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {idCliente && clientePuntos != null && (
            <div className="relative">
              <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">⭐ {clientePuntos} puntos</span>
                {recompensaAplicada ? (
                  <button onClick={quitarRecompensa} className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline">
                    Quitar "{recompensaAplicada.nombre}"
                  </button>
                ) : (
                  <button
                    onClick={() => setMostrarRecompensas((v) => !v)}
                    disabled={recompensasElegibles.length === 0}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Canjear recompensa
                  </button>
                )}
              </div>
              {mostrarRecompensas && !recompensaAplicada && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-56 overflow-y-auto sin-scrollbar">
                  {recompensasElegibles.map((r) => (
                    <button
                      key={r.id_recompensa}
                      onClick={() => aplicarRecompensa(r)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-between gap-2"
                    >
                      <span className="truncate">
                        {r.tipo === 'PRODUCTO' ? '🎁' : '💸'} {r.nombre}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">⭐{r.costo_puntos}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto sin-scrollbar p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <p className="text-sm">El carrito está vacío</p>
            </div>
          ) : (
            carrito.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-white leading-tight line-clamp-2">{item.nombre}</h4>
                  <button onClick={() => eliminarDelCarrito(idx)} className="shrink-0 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => actualizarItem(idx, 'cantidad', Math.max(1, (parseFloat(item.cantidad) || 1) - 1))}
                      className="w-6 h-6 shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold hover:bg-zinc-200 dark:hover:bg-zinc-600"
                    >−</button>
                    <input
                      type="number" min="1"
                      className="w-9 text-center text-sm font-semibold bg-transparent text-zinc-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                    />
                    <button
                      onClick={() => actualizarItem(idx, 'cantidad', (parseFloat(item.cantidad) || 0) + 1)}
                      className="w-6 h-6 shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold hover:bg-zinc-200 dark:hover:bg-zinc-600"
                    >+</button>
                    <select
                      className="ml-0.5 text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 border-none rounded-md px-1 py-1 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                      value={item.tipo_cantidad}
                      disabled={!!(item.id_combo || item.id_recompensa)}
                      title={(item.id_combo || item.id_recompensa) ? 'No aplica caja para combos/recompensas' : undefined}
                      onChange={(e) => actualizarItem(idx, 'tipo_cantidad', e.target.value)}
                    >
                      <option value="UNIDAD">Un.</option>
                      <option value="CAJA">Caj.</option>
                    </select>
                  </div>
                  <div className="text-right shrink-0">
                    {puedeCambiarPrecio ? (
                      <input
                        type="number" step="0.5" placeholder="Precio"
                        className="w-16 text-right text-xs text-zinc-400 dark:text-zinc-500 bg-transparent outline-none border-b border-dashed border-zinc-300 dark:border-zinc-600 focus:border-emerald-500"
                        value={item.precio_unitario || ''}
                        onChange={(e) => actualizarItem(idx, 'precio_unitario', e.target.value)}
                      />
                    ) : (
                      <p className="text-xs text-zinc-400">Bs {(parseFloat(item.precio_unitario) || 0).toFixed(2)} c/u</p>
                    )}
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      Bs {(parseFloat(item.subtotal) || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y Cobro */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-3">
          <div className="flex justify-between text-zinc-500 text-sm">
            <span>Subtotal</span>
            <span>Bs {totales.subtotal.toFixed(2)}</span>
          </div>

          {/* Descuento global — solo con permiso */}
          {(puedeDescuento || puedeDescuentoLibre) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 shrink-0">Descuento</span>
              <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setTipoDescuento('PCT')}
                  className={`px-2 py-1 text-xs font-bold transition-colors ${
                    tipoDescuento === 'PCT'
                      ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setTipoDescuento('BS')}
                  className={`px-2 py-1 text-xs font-bold transition-colors ${
                    tipoDescuento === 'BS'
                      ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Bs
                </button>
              </div>
              <input
                type="number"
                min="0"
                max={tipoDescuento === 'BS'
                  ? (totales.subtotal * (puedeDescuentoLibre ? 1 : 0.5)).toFixed(2)
                  : (puedeDescuentoLibre ? 100 : 50)}
                step="0.5"
                value={descuentoValor}
                onChange={e => setDescuentoValor(e.target.value)}
                className="flex-1 px-2 py-1 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white outline-none text-right"
                placeholder="0"
              />
              {totales.descuento_total > 0 && (
                <span className="text-sm text-red-500 shrink-0">-Bs {totales.descuento_total.toFixed(2)}</span>
              )}
            </div>
          )}

          {recompensaAplicada?.tipo === 'DESCUENTO' && totales.descuento_recompensa > 0 && (
            <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
              <span>🎁 Recompensa "{recompensaAplicada.nombre}"</span>
              <span>-Bs {totales.descuento_recompensa.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-3xl font-black text-zinc-900 dark:text-white py-1">
            <span className="text-lg self-end font-bold">Total</span>
            <span>Bs {totales.total.toFixed(2)}</span>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Método</label>
            <div className="grid grid-cols-3 gap-1.5">
              {METODOS_PAGO.map(m => (
                <button
                  key={m.value}
                  type="button"
                  disabled={m.value === 'CREDITO' && !idCliente}
                  onClick={() => { setMetodoPago(m.value); setQrManualConfirmado(false); }}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    metodoPago === m.value
                      ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {!idCliente && (
              <p className="text-[10px] text-zinc-400 mt-1">Un cliente casual no puede comprar a crédito.</p>
            )}
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">
              {metodoPago === 'CREDITO' ? 'Abono inicial (Bs)' : 'Recibí (Bs)'}
            </label>
            <input
              type="number"
              placeholder={metodoPago === 'CREDITO' ? 'Ej. 0' : 'Ej. 100'}
              value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value)}
              className="w-full p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none text-sm font-medium text-right text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {metodoPago === 'CREDITO' ? (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl flex justify-between font-bold text-sm">
              <span>Saldo pendiente:</span>
              <span>Bs {Math.max(0, totales.total - (parseFloat(montoPagado) || 0)).toFixed(2)}</span>
            </div>
          ) : metodoPago === 'QR_MANUAL' ? (
            <label className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={qrManualConfirmado}
                onChange={(e) => setQrManualConfirmado(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              Confirmo que verifiqué el pago en el celular del cliente
            </label>
          ) : totales.cambio > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl flex justify-between font-bold text-sm">
              <span>Cambio:</span>
              <span>Bs {totales.cambio.toFixed(2)}</span>
            </div>
          )}

          <button
            onClick={() => {
              if (metodoPago === 'QR_BANCO') {
                iniciarCobroQrBanco();
              } else if (metodoPago === 'QR_MANUAL') {
                procesarVenta({ qr_tipo: 'MANUAL' });
              } else {
                procesarVenta();
              }
            }}
            disabled={guardando || generandoQrBanco || carrito.length === 0 || (metodoPago === 'QR_MANUAL' && !qrManualConfirmado)}
            className="w-full py-4 rounded-xl text-white font-black text-lg bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {guardando || generandoQrBanco ? 'Procesando...' : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                {metodoPago === 'QR_BANCO' ? 'GENERAR QR' : 'COBRAR'} Bs {totales.total.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal: registrar cliente nuevo sin salir del POS */}
      {mostrarFormCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-5">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Nuevo cliente</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              No encontramos a "{busquedaCliente}". Regístralo rápido y se selecciona para esta venta.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">CI / NIT</label>
                <div className="relative">
                  <input
                    type="text"
                    value={nuevoCliente.ci_nit}
                    onChange={(e) => setNuevoCliente((p) => ({ ...p, ci_nit: e.target.value }))}
                    onBlur={buscarPersonaVenta}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {buscandoPersonaVenta && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">Buscando...</span>
                  )}
                </div>
                {mensajeBusquedaVenta && (
                  <p className={`text-[11px] mt-1 ${mensajeBusquedaVenta.tipo === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                    {mensajeBusquedaVenta.texto}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Nombre *</label>
                  <input
                    type="text"
                    autoFocus
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Apellido</label>
                  <input
                    type="text"
                    value={nuevoCliente.apellido}
                    onChange={(e) => setNuevoCliente((p) => ({ ...p, apellido: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Teléfono</label>
                  <input
                    type="text"
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente((p) => ({ ...p, telefono: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Tipo</label>
                  <select
                    value={nuevoCliente.tipo_cliente}
                    onChange={(e) => setNuevoCliente((p) => ({ ...p, tipo_cliente: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="MINORISTA">Minorista</option>
                    <option value="MAYORISTA">Mayorista</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Dirección</label>
                <input
                  type="text"
                  value={nuevoCliente.direccion}
                  onChange={(e) => setNuevoCliente((p) => ({ ...p, direccion: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Dirección física o sucursal..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setMostrarFormCliente(false)}
                disabled={guardandoCliente}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={crearClienteRapido}
                disabled={guardandoCliente}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {guardandoCliente ? 'Guardando...' : 'Registrar y seleccionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: cobro con QR Banco (generación + verificación automática) */}
      {modalQrBanco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-5 text-center">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Cobro con QR Banco</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Bs {totales.total.toFixed(2)} — pide al cliente que escanee este código con su banca móvil.
            </p>
            <img
              src={`data:image/png;base64,${modalQrBanco.qrImage}`}
              alt="Código QR de cobro"
              className="w-56 h-56 mx-auto rounded-xl border border-zinc-200 dark:border-zinc-700"
            />
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-4 animate-pulse">
              {verificandoQrBanco ? 'Pago detectado, registrando venta...' : 'Esperando pago...'}
            </p>
            <button
              onClick={cerrarModalQrBanco}
              disabled={verificandoQrBanco}
              className="w-full mt-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Error al generar QR Banco */}
      {errorQrBanco && !modalQrBanco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-5 text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">{errorQrBanco}</p>
            <button
              onClick={() => setErrorQrBanco('')}
              className="w-full py-2.5 rounded-xl bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
