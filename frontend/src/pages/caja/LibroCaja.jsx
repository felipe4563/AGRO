import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import cajaService from '../../services/caja.service';
import sucursalService from '../../services/sucursal.service';
import { usePermission } from '../../hooks/usePermission';
import { ModalGasto } from './components/CajaModals';

const hoyISO = () => new Date().toISOString().split('T')[0];
const haceUnMesISO = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
};

const ORIGEN_LABEL = {
  VENTA: 'Venta',
  ANULACION: 'Anulación de venta',
  ABONO: 'Abono crédito',
  GASTO: 'Gasto',
  COMPRA: 'Compra',
};

export default function LibroCaja() {
  const { puede } = usePermission();
  const puedeVerTodas = puede('ver_todas', 'caja');
  const puedeRegistrarGasto = puede('registrar_gasto', 'caja');

  const [desde, setDesde] = useState(haceUnMesISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [metodoPago, setMetodoPago] = useState('');
  const [tipo, setTipo] = useState('');
  const [idSucursal, setIdSucursal] = useState('');
  const [sucursales, setSucursales] = useState([]);

  const [datos, setDatos] = useState({ movimientos: [], total_ingresos: 0, total_egresos: 0, saldo_neto: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [modalGastoAbierto, setModalGastoAbierto] = useState(false);
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  useEffect(() => {
    if (puedeVerTodas) {
      sucursalService.listar().then(res => setSucursales(res.data)).catch(() => {});
    }
  }, [puedeVerTodas]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = { desde, hasta };
      if (metodoPago) params.metodo_pago = metodoPago;
      if (tipo) params.tipo = tipo;
      if (puedeVerTodas && idSucursal) params.id_sucursal = idSucursal;
      const res = await cajaService.obtenerLibroCaja(params);
      setDatos(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar el libro de caja');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, metodoPago, tipo, idSucursal, puedeVerTodas]);

  useEffect(() => { cargar(); }, [cargar]);

  const { movimientos, total_ingresos, total_egresos, saldo_neto } = datos;

  const handleRegistrarGasto = async (data) => {
    setGuardandoGasto(true);
    try {
      await cajaService.registrarGasto(data);
      setModalGastoAbierto(false);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al registrar el gasto');
    } finally {
      setGuardandoGasto(false);
    }
  };

  return (
    <PageWrapper>
      {modalGastoAbierto && (
        <ModalGasto
          guardando={guardandoGasto}
          onClose={() => setModalGastoAbierto(false)}
          onConfirm={handleRegistrarGasto}
        />
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            Libro de Caja
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Ingresos y egresos de la sucursal, con saldo acumulado.
          </p>
        </div>
        {puedeRegistrarGasto && (
          <button
            onClick={() => setModalGastoAbierto(true)}
            className="w-full sm:w-auto shrink-0 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Registrar gasto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
        <div className={`grid grid-cols-2 gap-3 ${puedeVerTodas ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Método de pago</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Todos</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="QR">QR</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Todos</option>
              <option value="INGRESO">Solo ingresos</option>
              <option value="EGRESO">Solo egresos</option>
            </select>
          </div>
          {puedeVerTodas && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Sucursal</label>
              <select
                value={idSucursal}
                onChange={(e) => setIdSucursal(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Todas</option>
                {sucursales.map(s => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>
      )}

      {/* Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Total ingresos</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">Bs {total_ingresos.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase">Total egresos</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">Bs {total_egresos.toFixed(2)}</p>
        </div>
        <div className={`rounded-2xl p-4 border ${saldo_neto >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
          <p className={`text-xs font-semibold uppercase ${saldo_neto >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>Saldo neto</p>
          <p className={`text-2xl font-bold ${saldo_neto >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>Bs {saldo_neto.toFixed(2)}</p>
        </div>
      </div>

      {cargando ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">Cargando movimientos...</div>
      ) : movimientos.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-lg">No hay movimientos para el rango y filtros seleccionados.</p>
        </div>
      ) : (
        <>
          {/* ── Vista tabla (desktop) ─────────────────────────────── */}
          <div className="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Concepto</th>
                    <th className="px-4 py-3 font-medium">Método</th>
                    <th className="px-4 py-3 font-medium text-right">Monto (Bs)</th>
                    <th className="px-4 py-3 font-medium text-right">Saldo (Bs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {movimientos.map((m, idx) => {
                    const esVentaAnulada = m.origen === 'VENTA' && m.concepto.includes('(anulada)');
                    return (
                    <tr key={idx} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${esVentaAnulada ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {new Date(m.fecha).toLocaleDateString()} <span className="text-xs text-zinc-400">{new Date(m.fecha).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                          {m.tipo === 'INGRESO' ? '↑ Ingreso' : '↓ Egreso'}
                        </span>
                        {m.origen === 'ANULACION' && (
                          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">Anulación</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-zinc-900 dark:text-zinc-100 ${esVentaAnulada ? 'line-through' : ''}`}>
                        {m.concepto}
                        <p className="text-[10px] text-zinc-500 uppercase font-normal no-underline">{ORIGEN_LABEL[m.origen] || m.origen}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{m.metodo_pago}</td>
                      <td className={`px-4 py-3 text-right font-bold ${m.tipo === 'INGRESO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {m.tipo === 'INGRESO' ? '+' : '-'}{m.monto.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">{m.saldo_acumulado.toFixed(2)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Vista tarjetas (móvil) ────────────────────────────── */}
          <div className="sm:hidden space-y-3">
            {movimientos.map((m, idx) => {
              const esVentaAnulada = m.origen === 'VENTA' && m.concepto.includes('(anulada)');
              return (
              <div key={idx} className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 ${esVentaAnulada ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className={`text-sm font-bold text-zinc-900 dark:text-white ${esVentaAnulada ? 'line-through' : ''}`}>{m.concepto}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">{ORIGEN_LABEL[m.origen] || m.origen}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${m.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                    {m.tipo === 'INGRESO' ? '↑' : '↓'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  {new Date(m.fecha).toLocaleDateString()} {new Date(m.fecha).toLocaleTimeString()} · {m.metodo_pago}
                </p>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className={`text-sm font-bold ${m.tipo === 'INGRESO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {m.tipo === 'INGRESO' ? '+' : '-'}Bs {m.monto.toFixed(2)}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Saldo: Bs {m.saldo_acumulado.toFixed(2)}</span>
                </div>
              </div>
              );
            })}
          </div>
        </>
      )}
    </PageWrapper>
  );
}
