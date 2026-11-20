import { useState, useEffect, useCallback, Fragment } from 'react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePermission } from '../../../../hooks/usePermission';
import reporteService from '../../../../services/reporte.service';
import cajaService from '../../../../services/caja.service';
import { ModalAnotarMovimiento, ModalClasificarGastos } from './ModalesFlujoCaja';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const fmt = (v) => `Bs. ${parseFloat(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCorto = (v) => parseFloat(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function mesActualStr() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}
function sumarMes(mesStr, delta) {
  const [a, m] = mesStr.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function Tarjeta({ titulo, valor, color, efectivo, digital }) {
  const colores = { verde: 'text-emerald-600 dark:text-emerald-400', rojo: 'text-red-600 dark:text-red-400', blanco: 'text-zinc-900 dark:text-white' };
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm min-w-0">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 truncate">{titulo}</p>
      <p className={`text-xl font-black ${colores[color] || colores.blanco} truncate`}>{fmt(valor)}</p>
      <p className="text-[11px] text-zinc-400 mt-1 truncate">
        <span className="font-mono">Efec. {fmtCorto(efectivo)}</span> · <span className="font-mono">QR {fmtCorto(digital)}</span>
      </p>
    </div>
  );
}

export default function VistaFlujoCaja() {
  const { puede } = usePermission();
  const puedeAnotar = puede('registrar_gasto', 'caja');
  const puedeClasificar = puede('clasificar_gastos', 'caja');

  const [mes, setMes] = useState(mesActualStr());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState('total'); // total | efectivo | qr | efectivo_qr
  const [mostrarVacias, setMostrarVacias] = useState(false);
  const [gruposAbiertos, setGruposAbiertos] = useState({ ingresos: true, variable: true, fijo: false, otros: false, retiros: false });
  const [modal, setModal] = useState(null); // 'anotar' | 'clasificar'
  const [conceptos, setConceptos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await reporteService.flujoCaja(mes);
      setDatos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleGrupo = (id) => setGruposAbiertos((p) => ({ ...p, [id]: !p[id] }));

  const abrirAnotar = () => setModal('anotar');
  const abrirClasificar = async () => {
    try {
      const res = await cajaService.listarConceptosGasto();
      setConceptos(res.data);
      setModal('clasificar');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnotar = async (form) => {
    setGuardando(true);
    try {
      await cajaService.registrarGasto(form);
      setModal(null);
      await cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al registrar el movimiento');
    } finally {
      setGuardando(false);
    }
  };

  const handleReclasificar = async (concepto, categoria) => {
    await cajaService.reclasificarConcepto({ concepto, categoria });
    await cargar();
    const res = await cajaService.listarConceptosGasto();
    setConceptos(res.data);
  };

  // ── Valor de una celda según el modo de vista (total/efectivo/qr/ambos) ──
  const celda = (val) => {
    if (!val) return null;
    if (vista === 'efectivo') return val.efectivo;
    if (vista === 'qr') return val.digital;
    if (vista === 'efectivo_qr') return val; // objeto completo, se renderiza aparte
    return val.efectivo + val.digital;
  };

  const renderCelda = (val) => {
    if (!val || (val.efectivo === 0 && val.digital === 0)) return <span className="text-zinc-300 dark:text-zinc-700">—</span>;
    if (vista === 'efectivo_qr') {
      return (
        <span className="whitespace-nowrap">
          <span className="text-teal-600 dark:text-teal-400">{fmtCorto(val.efectivo)}</span>
          {' / '}
          <span className="text-blue-600 dark:text-blue-400">{fmtCorto(val.digital)}</span>
        </span>
      );
    }
    const n = celda(val);
    if (!n) return <span className="text-zinc-300 dark:text-zinc-700">—</span>;
    return fmtCorto(n);
  };

  const exportarExcel = () => {
    if (!datos) return;
    const filas = [['Concepto', ...datos.dias.map((f) => f.slice(8, 10)), 'Mes']];
    const valorFila = (fila) => {
      const dias = datos.dias.map((f) => {
        const v = fila.dias[f];
        return vista === 'efectivo' ? v.efectivo : vista === 'qr' ? v.digital : v.efectivo + v.digital;
      });
      const total = vista === 'efectivo' ? fila.mes.efectivo : vista === 'qr' ? fila.mes.digital : fila.mes.efectivo + fila.mes.digital;
      return [...dias, total];
    };
    filas.push(['Saldo al empezar el día', ...valorFila(datos.filas_saldo)]);
    datos.grupos.forEach((g) => {
      filas.push([g.label, ...valorFila(g)]);
      g.filas.forEach((f) => filas.push([`  ${f.label}${f.auto ? ' (auto)' : ''}`, ...valorFila(f)]));
    });
    const hoja = XLSX.utils.aoa_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Flujo de caja');
    XLSX.writeFile(libro, `Flujo_de_Caja_${datos.mes}.xlsx`);
  };

  if (!datos) {
    return <div className="p-12 text-center text-zinc-400">{cargando ? 'Cargando...' : 'Sin datos'}</div>;
  }

  const [anio, mesNum] = datos.mes.split('-').map(Number);
  const nombreMes = `${MESES[mesNum - 1]} ${anio}`;

  const chartData = datos.serie.map((s) => ({ dia: Number(s.fecha.slice(8, 10)), Efectivo: s.efectivo, QR: s.digital }));

  const gruposVisibles = mostrarVacias ? datos.grupos : datos.grupos.map((g) => ({ ...g, filas: g.filas.filter((f) => f.mes.efectivo !== 0 || f.mes.digital !== 0 || f.auto) }));

  return (
    <div className="space-y-4">
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
          Cuánta plata entra y sale cada día, en efectivo y QR. Las ventas, compras y gastos de caja se cargan solos.
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 16.5m0 0L16.5 12M12 16.5V3" /></svg>
            Excel
          </button>
          {puedeClasificar && (
            <button onClick={abrirClasificar} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /></svg>
              Clasificar gastos
            </button>
          )}
          {puedeAnotar && (
            <button onClick={abrirAnotar} className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Anotar movimiento
            </button>
          )}
        </div>
      </div>

      {/* Navegador de mes */}
      <div className="flex items-center gap-3">
        <button onClick={() => setMes((m) => sumarMes(m, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{nombreMes}</h2>
        <button onClick={() => setMes((m) => sumarMes(m, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Tarjeta titulo="Saldo al empezar" valor={datos.tarjetas.saldo_empezar.efectivo + datos.tarjetas.saldo_empezar.digital} color="blanco" efectivo={datos.tarjetas.saldo_empezar.efectivo} digital={datos.tarjetas.saldo_empezar.digital} />
        <Tarjeta titulo="Entró" valor={datos.tarjetas.entro.efectivo + datos.tarjetas.entro.digital} color="verde" efectivo={datos.tarjetas.entro.efectivo} digital={datos.tarjetas.entro.digital} />
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 truncate">Gastos de la operación</p>
          <p className="text-xl font-black text-zinc-900 dark:text-white truncate">{fmt(datos.tarjetas.gastos_operacion.efectivo + datos.tarjetas.gastos_operacion.digital)}</p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">
            <span className="font-mono">Efec. {fmtCorto(datos.tarjetas.gastos_operacion.efectivo)}</span> · <span className="font-mono">QR {fmtCorto(datos.tarjetas.gastos_operacion.digital)}</span>
          </p>
          {datos.tarjetas.gastos_operacion.mayor_concepto && (
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">El mayor: {datos.tarjetas.gastos_operacion.mayor_concepto}</p>
          )}
        </div>
        <Tarjeta titulo="Retiros y fuera del negocio" valor={datos.tarjetas.retiros.efectivo + datos.tarjetas.retiros.digital} color="blanco" efectivo={datos.tarjetas.retiros.efectivo} digital={datos.tarjetas.retiros.digital} />
        <Tarjeta titulo="Saldo hoy" valor={datos.tarjetas.saldo_hoy.efectivo + datos.tarjetas.saldo_hoy.digital} color="verde" efectivo={datos.tarjetas.saldo_hoy.efectivo} digital={datos.tarjetas.saldo_hoy.digital} />
      </div>

      {/* Gráfico */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Saldo al cerrar cada día</h3>
        <ResponsiveContainer width="99%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-200 dark:stroke-zinc-800" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend />
            <Line type="monotone" dataKey="Efectivo" stroke="#14b8a6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="QR" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Toggle de vista + checkbox */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm font-semibold">
          {[['total', 'Total'], ['efectivo', 'Efectivo'], ['qr', 'QR'], ['efectivo_qr', 'Efectivo y QR']].map(([v, label]) => (
            <button key={v} onClick={() => setVista(v)}
              className={`px-3 py-1.5 ${vista === v ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-zinc-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 cursor-pointer">
          <input type="checkbox" checked={mostrarVacias} onChange={(e) => setMostrarVacias(e.target.checked)} className="rounded" />
          Mostrar también las categorías sin movimiento
        </label>
      </div>

      {/* Tabla pivot: días en columnas */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto">
        <table className="text-xs md:text-sm w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <th className="text-left px-3 py-2.5 font-bold text-zinc-600 dark:text-zinc-300 sticky left-0 bg-zinc-50 dark:bg-zinc-800/50 min-w-[220px]">Concepto</th>
              {datos.dias.map((f) => {
                const fechaObj = new Date(`${f}T00:00:00Z`);
                return (
                  <th key={f} className="text-center px-2 py-2.5 font-semibold text-zinc-500 dark:text-zinc-400 min-w-[52px]">
                    <div>{DIAS_SEMANA[fechaObj.getUTCDay()]}</div>
                    <div>{Number(f.slice(8, 10))}</div>
                  </th>
                );
              })}
              <th className="text-right px-3 py-2.5 font-bold text-zinc-600 dark:text-zinc-300 min-w-[80px]">Mes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
              <td className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20">Saldo al empezar el día</td>
              {datos.dias.map((f) => <td key={f} className="text-center px-2 py-2 text-zinc-600 dark:text-zinc-300">{renderCelda(datos.filas_saldo.dias[f])}</td>)}
              <td className="text-right px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">{renderCelda(datos.filas_saldo.mes)}</td>
            </tr>

            {gruposVisibles.map((g) => (
              <Fragment key={g.id}>
                <tr className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30" onClick={() => toggleGrupo(g.id)}>
                  <td className="px-3 py-2 font-bold text-zinc-800 dark:text-white sticky left-0 bg-white dark:bg-zinc-900 flex items-center gap-1.5">
                    <svg className={`w-3.5 h-3.5 transition-transform ${gruposAbiertos[g.id] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    {g.label}
                  </td>
                  {datos.dias.map((f) => <td key={f} className="text-center px-2 py-2 font-semibold text-zinc-800 dark:text-zinc-100">{renderCelda(g.dias[f])}</td>)}
                  <td className="text-right px-3 py-2 font-bold text-zinc-800 dark:text-white">{renderCelda(g.mes)}</td>
                </tr>
                {gruposAbiertos[g.id] && g.filas.map((f) => (
                  <tr key={f.id} className="text-zinc-500 dark:text-zinc-400">
                    <td className="px-3 py-1.5 pl-9 sticky left-0 bg-white dark:bg-zinc-900 truncate max-w-[220px]">
                      {f.label} {f.auto && <span className="text-[10px] text-zinc-400">auto</span>}
                    </td>
                    {datos.dias.map((fecha) => <td key={fecha} className="text-center px-2 py-1.5">{renderCelda(f.dias[fecha])}</td>)}
                    <td className="text-right px-3 py-1.5">{renderCelda(f.mes)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'anotar' && (
        <ModalAnotarMovimiento onConfirm={handleAnotar} onClose={() => setModal(null)} guardando={guardando} />
      )}
      {modal === 'clasificar' && (
        <ModalClasificarGastos conceptos={conceptos} onReclasificar={handleReclasificar} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
