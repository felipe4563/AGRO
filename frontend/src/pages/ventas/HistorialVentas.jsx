import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import TablaVentas from './components/TablaVentas';
import ventaService from '../../services/venta.service';
import { usePermission } from '../../hooks/usePermission';

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all max-w-xs sm:max-w-sm ${
      toast.tipo === 'ok'
        ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
    }`}>
      <span className="break-words">{toast.msg}</span>
    </div>
  );
}

export default function HistorialVentas() {
  const { puede } = usePermission();
  const navigate = useNavigate();

  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [toast, setToast] = useState(null);

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
      const res = await ventaService.listar();
      setVentas(res.data);
    } catch {
      mostrarToast('error', 'Error al cargar el historial de ventas');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const ventasFiltradas = useMemo(() => {
    let lista = ventas;
    if (filtroEstado) {
      lista = lista.filter(v => v.estado === filtroEstado);
    }
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      lista = lista.filter(v => new Date(v.fecha_venta) >= desde);
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59);
      lista = lista.filter(v => new Date(v.fecha_venta) <= hasta);
    }
    if (busqueda.trim()) {
      const b = busqueda.toLowerCase();
      lista = lista.filter(v => {
        const cliente = `${v.cliente_nombre || ''} ${v.cliente_apellido || ''}`.toLowerCase();
        const vendedor = `${v.usuario_nombre || ''} ${v.usuario_apellido || ''}`.toLowerCase();
        const factura = (v.nro_factura || '').toLowerCase();
        const id = String(v.id_venta);
        return cliente.includes(b) || vendedor.includes(b) || factura.includes(b) || id.includes(b);
      });
    }
    return lista;
  }, [ventas, busqueda, filtroEstado, fechaDesde, fechaHasta]);

  const handleAnular = async (venta) => {
    if (!window.confirm(`¿Anular la venta #${venta.id_venta}? Se devolverá el stock al inventario.`)) return;
    try {
      await ventaService.anular(venta.id_venta);
      mostrarToast('ok', 'Venta anulada. Stock retornado.');
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al anular la venta');
    }
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const hayFiltros = busqueda || filtroEstado || fechaDesde || fechaHasta;

  return (
    <PageWrapper>
      <Toast toast={toast} />

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            Registro de Ventas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Historial de todas las transacciones realizadas.
          </p>
        </div>
        {puede('crear', 'ventas') && (
          <button
            onClick={() => navigate('/ventas/nueva')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Punto de Venta (POS)
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[180px]">
          <input
            type="text"
            placeholder="Buscar cliente, vendedor, factura..."
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
          <option value="COMPLETADA">Completada</option>
          <option value="ANULADA">Anulada</option>
          <option value="PENDIENTE">Pendiente</option>
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
          Mostrando {ventasFiltradas.length} de {ventas.length} ventas
        </p>
      )}

      <TablaVentas
        ventas={ventasFiltradas}
        cargando={cargando}
        onVerDetalle={(v) => navigate(`/ventas/${v.id_venta}/ticket`)}
        onAnular={handleAnular}
      />
    </PageWrapper>
  );
}
