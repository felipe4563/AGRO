import { useState, useEffect, useCallback, useMemo } from 'react';
import PageWrapper from '../../components/PageWrapper';
import TablaLotes from './components/TablaLotes';
import TablaTraslados from './components/TablaTraslados';
import PanelAlertas from './components/PanelAlertas';
import DetalleLoteModal from './components/DetalleLoteModal';
import { ModalEntrada, ModalAjuste, ModalBaja, ModalTraslado } from './components/AlmacenModals';
import ModalImprimirEtiquetas from '../../components/ModalImprimirEtiquetas';
import almacenService from '../../services/almacen.service';
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

const TABS = ['inventario', 'traslados', 'alertas'];
const TAB_LABELS = { inventario: 'Inventario', traslados: 'Traslados', alertas: 'Alertas' };

export default function Almacen() {
  const { puede } = usePermission();

  const tabsVisibles = TABS.filter((t) => t !== 'traslados' || puede('ver', 'traslados'));

  const [tab, setTab] = useState('inventario');
  const [lotes, setLotes] = useState([]);
  const [traslados, setTraslados] = useState([]);
  const [alertas, setAlertas] = useState(null);
  const [cargandoLotes, setCargandoLotes] = useState(true);
  const [cargandoTraslados, setCargandoTraslados] = useState(false);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const [modalType, setModalType] = useState(null);
  const [loteActivo, setLoteActivo] = useState(null);
  const [detalleId, setDetalleId] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [filtroClasificacion, setFiltroClasificacion] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const sucursales = useMemo(() => [...new Set(lotes.map((l) => l.sucursal_nombre).filter(Boolean))].sort(), [lotes]);
  const clasificaciones = useMemo(() => [...new Set(lotes.map((l) => l.clasificacion_nombre).filter(Boolean))].sort(), [lotes]);
  const marcas = useMemo(() => [...new Set(lotes.map((l) => l.marca_nombre).filter(Boolean))].sort(), [lotes]);

  const estadoDelLote = (l) => {
    if (l.stock_minimo > 0 && l.stock_unidades < l.stock_minimo) return 'bajo';
    if (!l.fecha_vencimiento) return 'vigente';
    const dias = Math.ceil((new Date(l.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'por_vencer';
    return 'vigente';
  };

  const lotesFiltrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    return lotes.filter((l) => {
      if (b && !l.producto_nombre?.toLowerCase().includes(b) && !(l.numero_lote || '').toLowerCase().includes(b)) return false;
      if (filtroSucursal && l.sucursal_nombre !== filtroSucursal) return false;
      if (filtroClasificacion && l.clasificacion_nombre !== filtroClasificacion) return false;
      if (filtroMarca && l.marca_nombre !== filtroMarca) return false;
      if (filtroEstado && estadoDelLote(l) !== filtroEstado) return false;
      return true;
    });
  }, [lotes, busqueda, filtroSucursal, filtroClasificacion, filtroMarca, filtroEstado]);

  const hayFiltrosActivos = busqueda || filtroSucursal || filtroClasificacion || filtroMarca || filtroEstado;
  const limpiarFiltros = () => {
    setBusqueda(''); setFiltroSucursal(''); setFiltroClasificacion(''); setFiltroMarca(''); setFiltroEstado('');
  };

  const [busquedaTraslado, setBusquedaTraslado] = useState('');
  const [filtroSucOrigen, setFiltroSucOrigen] = useState('');
  const [filtroSucDestino, setFiltroSucDestino] = useState('');
  const [filtroEstadoTraslado, setFiltroEstadoTraslado] = useState('');

  const sucursalesOrigen = useMemo(() => [...new Set(traslados.map((t) => t.sucursal_origen).filter(Boolean))].sort(), [traslados]);
  const sucursalesDestino = useMemo(() => [...new Set(traslados.map((t) => t.sucursal_destino).filter(Boolean))].sort(), [traslados]);

  const trasladosFiltrados = useMemo(() => {
    const b = busquedaTraslado.trim().toLowerCase();
    return traslados.filter((t) => {
      if (b && !t.producto_nombre?.toLowerCase().includes(b) && !(t.numero_lote || '').toLowerCase().includes(b)) return false;
      if (filtroSucOrigen && t.sucursal_origen !== filtroSucOrigen) return false;
      if (filtroSucDestino && t.sucursal_destino !== filtroSucDestino) return false;
      if (filtroEstadoTraslado && t.estado !== filtroEstadoTraslado) return false;
      return true;
    });
  }, [traslados, busquedaTraslado, filtroSucOrigen, filtroSucDestino, filtroEstadoTraslado]);

  const hayFiltrosTrasladoActivos = busquedaTraslado || filtroSucOrigen || filtroSucDestino || filtroEstadoTraslado;
  const limpiarFiltrosTraslado = () => {
    setBusquedaTraslado(''); setFiltroSucOrigen(''); setFiltroSucDestino(''); setFiltroEstadoTraslado('');
  };

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarLotes = useCallback(async () => {
    setCargandoLotes(true);
    try {
      const res = await almacenService.listarLotes();
      setLotes(res.data);
    } catch {
      mostrarToast('error', 'Error al cargar el inventario');
    } finally {
      setCargandoLotes(false);
    }
  }, []);

  const cargarTraslados = useCallback(async () => {
    setCargandoTraslados(true);
    try {
      const res = await almacenService.listarTraslados();
      setTraslados(res.data);
    } catch {
      mostrarToast('error', 'Error al cargar traslados');
    } finally {
      setCargandoTraslados(false);
    }
  }, []);

  const cargarAlertas = useCallback(async () => {
    setCargandoAlertas(true);
    try {
      const res = await almacenService.listarAlertas();
      setAlertas(res.data);
    } catch {
      mostrarToast('error', 'Error al cargar alertas');
    } finally {
      setCargandoAlertas(false);
    }
  }, []);

  useEffect(() => { cargarLotes(); }, [cargarLotes]);

  useEffect(() => {
    if (tab === 'traslados' && traslados.length === 0) cargarTraslados();
    if (tab === 'alertas' && !alertas) cargarAlertas();
  }, [tab]);

  // ── Handlers: Lotes ────────────────────────────────────────────────────────
  const handleNuevaEntrada = async (formData) => {
    setGuardando(true);
    try {
      await almacenService.crearLote(formData);
      mostrarToast('ok', 'Lote ingresado correctamente');
      setModalType(null);
      await cargarLotes();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al ingresar lote');
    } finally {
      setGuardando(false);
    }
  };

  const handleAjustar = async (id, data) => {
    setGuardando(true);
    try {
      await almacenService.ajustarLote(id, data);
      mostrarToast('ok', 'Inventario ajustado correctamente');
      setModalType(null);
      await cargarLotes();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al ajustar inventario');
    } finally {
      setGuardando(false);
    }
  };

  const handleDarBaja = async (motivo) => {
    if (!loteActivo) return;
    setGuardando(true);
    try {
      await almacenService.darBajaLote(loteActivo.id_lote, { motivo });
      mostrarToast('ok', 'Lote dado de baja correctamente');
      setModalType(null);
      await cargarLotes();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al dar de baja');
    } finally {
      setGuardando(false);
    }
  };

  // ── Handlers: Traslados ────────────────────────────────────────────────────
  const handleCrearTraslado = async (data) => {
    setGuardando(true);
    try {
      await almacenService.crearTraslado(data);
      mostrarToast('ok', 'Traslado creado. Confirme en destino para mover el stock.');
      setModalType(null);
      await Promise.all([cargarLotes(), cargarTraslados()]);
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al crear traslado');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarTraslado = async (traslado) => {
    setGuardando(true);
    try {
      await almacenService.confirmarTraslado(traslado.id_traslado);
      mostrarToast('ok', 'Traslado confirmado y stock actualizado');
      await Promise.all([cargarLotes(), cargarTraslados()]);
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al confirmar traslado');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarTraslado = async (traslado) => {
    setGuardando(true);
    try {
      await almacenService.cancelarTraslado(traslado.id_traslado);
      mostrarToast('ok', 'Traslado cancelado');
      await cargarTraslados();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al cancelar traslado');
    } finally {
      setGuardando(false);
    }
  };

  const totalAlertas = alertas ? (alertas.bajo_stock?.length || 0) + (alertas.prox_vencer?.length || 0) : null;

  return (
    <PageWrapper>
      <Toast toast={toast} />

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            Almacén e Inventario
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gestión de lotes, movimientos, traslados y alertas de stock.
          </p>
        </div>
        {tab === 'inventario' && puede('ingresar', 'almacen') && (
          <button
            onClick={() => setModalType('entrada')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Entrada
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
        {tabsVisibles.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              tab === t
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {TAB_LABELS[t]}
            {t === 'alertas' && totalAlertas !== null && totalAlertas > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">
                {totalAlertas}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'inventario' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto o número de lote..."
              className="flex-1 min-w-[200px] px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filtroClasificacion}
              onChange={(e) => setFiltroClasificacion(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas las categorías</option>
              {clasificaciones.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filtroMarca}
              onChange={(e) => setFiltroMarca(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas las marcas</option>
              {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los estados</option>
              <option value="vigente">Vigente</option>
              <option value="por_vencer">Por vencer (≤30 d)</option>
              <option value="vencido">Vencido</option>
              <option value="bajo">Stock bajo</option>
            </select>
            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <TablaLotes
            lotes={lotesFiltrados}
            cargando={cargandoLotes}
            onVerMovimientos={(l) => setDetalleId(l.id_lote)}
            onAjustar={(l) => { setLoteActivo(l); setModalType('ajuste'); }}
            onNuevoTraslado={(l) => { setLoteActivo(l); setModalType('traslado'); }}
            onDarBaja={(l) => { setLoteActivo(l); setModalType('baja'); }}
            onImprimirEtiqueta={(l) => { setLoteActivo(l); setModalType('etiqueta'); }}
          />
        </>
      )}

      {tab === 'traslados' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="text"
              value={busquedaTraslado}
              onChange={(e) => setBusquedaTraslado(e.target.value)}
              placeholder="Buscar producto o número de lote..."
              className="flex-1 min-w-[200px] px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={filtroSucOrigen}
              onChange={(e) => setFiltroSucOrigen(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los orígenes</option>
              {sucursalesOrigen.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filtroSucDestino}
              onChange={(e) => setFiltroSucDestino(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los destinos</option>
              {sucursalesDestino.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filtroEstadoTraslado}
              onChange={(e) => setFiltroEstadoTraslado(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            {hayFiltrosTrasladoActivos && (
              <button
                onClick={limpiarFiltrosTraslado}
                className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <TablaTraslados
            traslados={trasladosFiltrados}
            cargando={cargandoTraslados}
            onConfirmar={handleConfirmarTraslado}
            onCancelar={handleCancelarTraslado}
          />
        </>
      )}

      {tab === 'alertas' && (
        <PanelAlertas alertas={alertas} cargando={cargandoAlertas} />
      )}

      {/* Modals */}
      {modalType === 'entrada' && (
        <ModalEntrada
          onConfirm={handleNuevaEntrada}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'etiqueta' && loteActivo && (
        <ModalImprimirEtiquetas
          items={[{
            id_lote: loteActivo.id_lote,
            nombre: loteActivo.producto_nombre,
            codigo_barras: loteActivo.codigo_barras,
            cantidad: loteActivo.stock_cajas || 1,
          }]}
          onClose={() => setModalType(null)}
        />
      )}

      {modalType === 'ajuste' && (
        <ModalAjuste
          lote={loteActivo}
          onConfirm={handleAjustar}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'baja' && (
        <ModalBaja
          lote={loteActivo}
          onConfirm={handleDarBaja}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {modalType === 'traslado' && (
        <ModalTraslado
          lote={loteActivo}
          onConfirm={handleCrearTraslado}
          onClose={() => setModalType(null)}
          guardando={guardando}
        />
      )}

      {detalleId && (
        <DetalleLoteModal
          loteId={detalleId}
          onClose={() => setDetalleId(null)}
        />
      )}
    </PageWrapper>
  );
}
