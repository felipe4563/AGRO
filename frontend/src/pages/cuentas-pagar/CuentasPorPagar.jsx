import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import cuentaPagarService from '../../services/cuentaPagar.service';

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-xs sm:max-w-sm ${
      toast.tipo === 'ok'
        ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
    }`}>
      <span className="break-words">{toast.msg}</span>
    </div>
  );
}

function ModalPago({ compra, onClose, onPagado }) {
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const saldo = parseFloat(compra.saldo_pendiente);

  const registrar = async () => {
    setError('');
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) { setError('Ingrese un monto válido'); return; }
    if (montoNum > saldo + 0.01) { setError(`El abono no puede superar el saldo pendiente (Bs ${saldo.toFixed(2)})`); return; }

    setEnviando(true);
    try {
      const res = await cuentaPagarService.registrarPago(compra.id_compra, { monto: montoNum, metodo_pago: metodoPago, observaciones });
      onPagado(res.data.id_pago_proveedor);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar el abono');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5">
        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Registrar abono</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Compra #{compra.id_compra.toString().padStart(5, '0')} — Saldo pendiente: <span className="font-semibold text-orange-600 dark:text-orange-400">Bs {saldo.toFixed(2)}</span>
        </p>

        <label className="text-xs text-zinc-500 mb-1 block">Monto del abono (Bs)</label>
        <input
          type="number"
          step="0.5"
          autoFocus
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder={`Máx. ${saldo.toFixed(2)}`}
          className="w-full px-3 py-2 mb-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <label className="text-xs text-zinc-500 mb-1 block">Método de pago</label>
        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value)}
          className="w-full px-3 py-2 mb-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="EFECTIVO">Efectivo</option>
          <option value="QR">QR</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="OTRO">Otro</option>
        </select>

        <label className="text-xs text-zinc-500 mb-1 block">Observaciones (opcional)</label>
        <input
          type="text"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full px-3 py-2 mb-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}

        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={registrar}
            disabled={enviando}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : 'Registrar abono'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CuentasPorPagar() {
  const navigate = useNavigate();
  const [vista, setVista] = useState('pendientes'); // 'pendientes' | 'historial'
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [historialCargado, setHistorialCargado] = useState(false);
  const [toast, setToast] = useState(null);
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await cuentaPagarService.listar();
      setCuentas(res.data);
    } catch {
      mostrarToast('error', 'Error al cargar cuentas por pagar');
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const res = await cuentaPagarService.listarHistorial();
      setHistorial(res.data);
      setHistorialCargado(true);
    } catch {
      mostrarToast('error', 'Error al cargar el historial de abonos');
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  useEffect(() => {
    if (vista === 'historial' && !historialCargado) cargarHistorial();
  }, [vista, historialCargado, cargarHistorial]);

  const coincide = (empresa, nit, texto) => {
    const b = texto.trim().toLowerCase();
    if (!b) return true;
    return (empresa || '').toLowerCase().includes(b) || (nit || '').toLowerCase().includes(b);
  };

  const cuentasFiltradas = useMemo(
    () => cuentas.filter(c => coincide(c.proveedor_nombre, c.nit, busqueda)),
    [cuentas, busqueda]
  );

  const historialFiltrado = useMemo(
    () => historial.filter(p => coincide(p.proveedor_nombre, null, busqueda)),
    [historial, busqueda]
  );

  const totalPendiente = cuentasFiltradas.reduce((acc, c) => acc + parseFloat(c.saldo_pendiente), 0);

  const handlePagado = (idPago) => {
    setCompraSeleccionada(null);
    setHistorialCargado(false); // refrescar historial la próxima vez que se abra
    navigate(`/cuentas-pagar/pagos/${idPago}/ticket`);
  };

  return (
    <PageWrapper>
      <Toast toast={toast} />
      {compraSeleccionada && (
        <ModalPago
          compra={compraSeleccionada}
          onClose={() => setCompraSeleccionada(null)}
          onPagado={handlePagado}
        />
      )}

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            Cuentas por Pagar
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Compras a crédito con saldo pendiente a proveedores.
          </p>
        </div>
        {!cargando && cuentasFiltradas.length > 0 && (
          <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl font-bold text-sm">
            Total pendiente: Bs {totalPendiente.toFixed(2)}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1">
        <button
          onClick={() => setVista('pendientes')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            vista === 'pendientes'
              ? 'bg-emerald-600 text-white'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setVista('historial')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            vista === 'historial'
              ? 'bg-emerald-600 text-white'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Historial de abonos
        </button>
      </div>

      {/* Buscador de proveedor */}
      <div className="relative mb-4 max-w-sm">
        <input
          type="text"
          placeholder="Buscar por empresa o NIT..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <svg className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>

      {vista === 'historial' ? (
        cargandoHistorial ? (
          <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
            <p>Cargando historial de abonos...</p>
          </div>
        ) : historialFiltrado.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-lg">{busqueda ? 'No se encontraron abonos para esa búsqueda.' : 'Aún no se registraron abonos.'}</p>
          </div>
        ) : (
          <>
            {/* ── Vista tabla (desktop) ─────────────────────────────── */}
            <div className="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      <th className="px-4 py-3 font-medium">Comprobante</th>
                      <th className="px-4 py-3 font-medium">Compra</th>
                      <th className="px-4 py-3 font-medium">Proveedor</th>
                      <th className="px-4 py-3 font-medium text-right">Abono (Bs)</th>
                      <th className="px-4 py-3 font-medium text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {historialFiltrado.map((p) => (
                      <tr key={p.id_pago_proveedor} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-zinc-900 dark:text-white"># {p.id_pago_proveedor.toString().padStart(5, '0')}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(p.fecha_pago).toLocaleDateString()} {new Date(p.fecha_pago).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          # {p.id_compra.toString().padStart(5, '0')}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                          {p.proveedor_nombre || <span className="italic text-zinc-500">Sin proveedor</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {parseFloat(p.monto).toFixed(2)}
                          <p className="text-[10px] text-zinc-500 uppercase font-normal">{p.metodo_pago}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/cuentas-pagar/pagos/${p.id_pago_proveedor}/ticket`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Ver / Reimprimir comprobante"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Vista tarjetas (móvil) ────────────────────────────── */}
            <div className="sm:hidden space-y-3">
              {historialFiltrado.map((p) => (
                <div key={p.id_pago_proveedor} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white"># {p.id_pago_proveedor.toString().padStart(5, '0')}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(p.fecha_pago).toLocaleDateString()} {new Date(p.fecha_pago).toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      Bs {parseFloat(p.monto).toFixed(2)}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100">
                    <p>Compra # {p.id_compra.toString().padStart(5, '0')}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {p.proveedor_nombre || 'Sin proveedor'} · {p.metodo_pago}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/cuentas-pagar/pagos/${p.id_pago_proveedor}/ticket`)}
                    className="w-full mt-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                  >
                    Ver / Reimprimir comprobante
                  </button>
                </div>
              ))}
            </div>
          </>
        )
      ) : cargando ? (
        <div className="p-8 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
          <p>Cargando cuentas por pagar...</p>
        </div>
      ) : cuentasFiltradas.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-lg">{busqueda ? 'No se encontraron cuentas para esa búsqueda.' : 'No hay cuentas pendientes.'}</p>
          {!busqueda && <p className="text-sm mt-1">Todas las compras a crédito están saldadas.</p>}
        </div>
      ) : (
        <>
          {/* ── Vista tabla (desktop) ─────────────────────────────────── */}
          <div className="hidden sm:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <th className="px-4 py-3 font-medium">Compra</th>
                    <th className="px-4 py-3 font-medium">Proveedor</th>
                    <th className="px-4 py-3 font-medium text-right">Total (Bs)</th>
                    <th className="px-4 py-3 font-medium text-right">Saldo pendiente (Bs)</th>
                    <th className="px-4 py-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {cuentasFiltradas.map((c) => (
                    <tr key={c.id_compra} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white"># {c.id_compra.toString().padStart(5, '0')}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(c.fecha_compra).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                        {c.proveedor_nombre ? (
                          <>
                            <p className="font-semibold">{c.proveedor_nombre}</p>
                            <p className="text-xs text-zinc-500">NIT: {c.nit || 'S/N'}</p>
                          </>
                        ) : (
                          <span className="italic text-zinc-500">Sin proveedor</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-700 dark:text-zinc-300">{parseFloat(c.total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-orange-600 dark:text-orange-400">{parseFloat(c.saldo_pendiente).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setCompraSeleccionada(c)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                        >
                          Registrar abono
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Vista tarjetas (móvil) ────────────────────────────────── */}
          <div className="sm:hidden space-y-3">
            {cuentasFiltradas.map((c) => (
              <div key={c.id_compra} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white"># {c.id_compra.toString().padStart(5, '0')}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(c.fecha_compra).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    Bs {parseFloat(c.saldo_pendiente).toFixed(2)}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100">
                  {c.proveedor_nombre ? (
                    <>
                      <p className="font-semibold">{c.proveedor_nombre}</p>
                      <p className="text-xs text-zinc-500">NIT: {c.nit || 'S/N'}</p>
                    </>
                  ) : (
                    <span className="italic text-zinc-500">Sin proveedor</span>
                  )}
                  <p className="text-xs text-zinc-500 mt-1">Total compra: Bs {parseFloat(c.total).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setCompraSeleccionada(c)}
                  className="w-full mt-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold"
                >
                  Registrar abono
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </PageWrapper>
  );
}
