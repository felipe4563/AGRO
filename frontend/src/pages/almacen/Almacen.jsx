import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import TablaLotes from './components/TablaLotes';
import TablaTraslados from './components/TablaTraslados';
import PanelAlertas from './components/PanelAlertas';
import DetalleLoteModal from './components/DetalleLoteModal';
import { ModalEntrada, ModalAjuste, ModalBaja, ModalTraslado } from './components/AlmacenModals';
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
      <span className="shrink-0">{toast.tipo === 'ok' ? '✅' : '⚠️'}</span>
      <span className="break-words">{toast.msg}</span>
    </div>
  );
}

const TABS = ['inventario', 'traslados', 'alertas'];
const TAB_LABELS = { inventario: 'Inventario', traslados: 'Traslados', alertas: 'Alertas' };

export default function Almacen() {
  const { puede } = usePermission();

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
            🏭 Almacén e Inventario
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
        {TABS.map(t => (
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
        <TablaLotes
          lotes={lotes}
          cargando={cargandoLotes}
          onVerMovimientos={(l) => setDetalleId(l.id_lote)}
          onAjustar={(l) => { setLoteActivo(l); setModalType('ajuste'); }}
          onNuevoTraslado={(l) => { setLoteActivo(l); setModalType('traslado'); }}
          onDarBaja={(l) => { setLoteActivo(l); setModalType('baja'); }}
        />
      )}

      {tab === 'traslados' && (
        <TablaTraslados
          traslados={traslados}
          cargando={cargandoTraslados}
          onConfirmar={handleConfirmarTraslado}
          onCancelar={handleCancelarTraslado}
        />
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
