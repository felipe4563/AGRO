import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import TablaCompras from './components/TablaCompras';
import DetalleCompraModal from './components/DetalleCompraModal';
import ModalConfirmarRecepcion from './components/ModalConfirmarRecepcion';
import ModalImprimirEtiquetas from '../../components/ModalImprimirEtiquetas';
import compraService from '../../services/compra.service';
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

export default function Compras() {
  const { puede } = usePermission();
  const navigate = useNavigate();

  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [toast, setToast] = useState(null);

  const [detalleId, setDetalleId] = useState(null);
  const [confirmarId, setConfirmarId] = useState(null);
  const [lotesParaEtiquetas, setLotesParaEtiquetas] = useState(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await compraService.listar();
      setCompras(res.data);
    } catch (err) {
      mostrarToast('error', 'Error al cargar el historial de compras');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleVerDetalle = (compra) => {
    setDetalleId(compra.id_compra);
  };

  const handleConfirmar = (compra) => {
    setConfirmarId(compra.id_compra);
  };

  const handleConfirmado = async (data) => {
    setConfirmarId(null);
    mostrarToast('ok', 'Compra confirmada. Lotes ingresados al Almacén.');
    await cargarDatos();
    if (data.lotes && data.lotes.length > 0) {
      setLotesParaEtiquetas(data.lotes.map((l) => ({
        id_lote: l.id_lote,
        nombre: l.producto_nombre,
        codigo_barras: l.codigo_barras,
        cantidad: l.cantidad_cajas || 1,
      })));
    }
  };

  const comprasFiltradas = useMemo(() => {
    let lista = compras;
    if (filtroEstado) {
      lista = lista.filter(c => c.estado === filtroEstado);
    }
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      lista = lista.filter(c => new Date(c.fecha_compra) >= desde);
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59);
      lista = lista.filter(c => new Date(c.fecha_compra) <= hasta);
    }
    if (busqueda.trim()) {
      const b = busqueda.toLowerCase();
      lista = lista.filter(c => {
        const proveedor = (c.proveedor_nombre || '').toLowerCase();
        const factura = (c.nro_factura || '').toLowerCase();
        const id = String(c.id_compra);
        return proveedor.includes(b) || factura.includes(b) || id.includes(b);
      });
    }
    return lista;
  }, [compras, busqueda, filtroEstado, fechaDesde, fechaHasta]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const hayFiltros = busqueda || filtroEstado || fechaDesde || fechaHasta;

  const handleAnular = async (compra) => {
    if (!window.confirm('¿Anular esta compra PENDIENTE?')) return;

    try {
      await compraService.anular(compra.id_compra);
      mostrarToast('ok', 'Compra anulada.');
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al anular compra');
    }
  };

  return (
    <PageWrapper>
      <Toast toast={toast} />

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            Compras e Ingresos
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Historial de compras realizadas a proveedores.
          </p>
        </div>
        {puede('crear', 'compras') && (
          <button
            onClick={() => navigate('/compras/nueva')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Compra
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[180px]">
          <input
            type="text"
            placeholder="Buscar proveedor, factura, ID..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="RECIBIDO">Recibido</option>
          <option value="ANULADA">Anulada</option>
        </select>
        <div className="flex gap-3">
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="w-full sm:w-auto px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl"
          >
            Limpiar
          </button>
        )}
      </div>

      {hayFiltros && !cargando && (
        <p className="text-xs text-zinc-400 mb-3">
          Mostrando {comprasFiltradas.length} de {compras.length} compras
        </p>
      )}

      <TablaCompras
        compras={comprasFiltradas}
        cargando={cargando}
        onVerDetalle={handleVerDetalle}
        onConfirmar={handleConfirmar}
        onAnular={handleAnular}
      />

      {detalleId && (
        <DetalleCompraModal
          compraId={detalleId}
          onClose={() => setDetalleId(null)}
        />
      )}

      {confirmarId && (
        <ModalConfirmarRecepcion
          compraId={confirmarId}
          onClose={() => setConfirmarId(null)}
          onConfirmado={handleConfirmado}
        />
      )}

      {lotesParaEtiquetas && (
        <ModalImprimirEtiquetas
          items={lotesParaEtiquetas}
          onClose={() => setLotesParaEtiquetas(null)}
        />
      )}

    </PageWrapper>
  );
}
