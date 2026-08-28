import { useState } from 'react';
import reporteService from '../../../services/reporte.service';
import FiltrosAvanzados from '../components/FiltrosAvanzados';
import TablaReporte from '../components/TablaReporte';
import BotonesExportar from '../components/BotonesExportar';

function DiferenciaBadge({ valor }) {
  const num = parseFloat(valor || 0);
  if (num === 0) return <span className="px-2 py-0.5 text-xs font-bold rounded bg-zinc-100 text-zinc-600">Exacto</span>;
  if (num > 0)   return <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-700">+{num.toFixed(2)}</span>;
  return             <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-700">{num.toFixed(2)}</span>;
}

const COLUMNAS = [
  { key: 'caja_nombre', header: 'Caja' },
  { key: 'cajero_nombre', header: 'Cajero', render: (_, r) => `${r.cajero_nombre} ${r.cajero_apellido}`, excelValue: r => `${r.cajero_nombre} ${r.cajero_apellido}` },
  { key: 'fecha_apertura', header: 'Apertura', excelValue: r => new Date(r.fecha_apertura).toLocaleString() },
  { key: 'fecha_cierre', header: 'Cierre', render: v => v ? new Date(v).toLocaleString() : '—', excelValue: r => r.fecha_cierre ? new Date(r.fecha_cierre).toLocaleString() : 'Abierto' },
  { key: 'monto_inicial', header: 'Inicial (Bs)', align: 'right', render: v => parseFloat(v).toFixed(2), excelValue: r => parseFloat(r.monto_inicial) },
  { key: 'monto_esperado', header: 'Esperado (Bs)', align: 'right', render: v => v != null ? parseFloat(v).toFixed(2) : '—', excelValue: r => r.monto_esperado != null ? parseFloat(r.monto_esperado) : '' },
  { key: 'monto_final', header: 'Contado (Bs)', align: 'right', render: v => v != null ? parseFloat(v).toFixed(2) : '—', excelValue: r => r.monto_final != null ? parseFloat(r.monto_final) : '' },
  { key: 'diferencia', header: 'Diferencia', align: 'center', render: v => <DiferenciaBadge valor={v} />, excelValue: r => parseFloat(r.diferencia || 0) },
  { key: 'estado', header: 'Estado', align: 'center', render: v => (
    <span className={`px-2 py-0.5 text-xs font-bold rounded border ${v === 'ABIERTA' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-zinc-100 text-zinc-600 border-zinc-300'}`}>{v}</span>
  ), excelValue: r => r.estado }
];

export default function VistaCaja() {
  const [datos, setDatos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [filtros, setFiltros] = useState({});
  const [cargando, setCargando] = useState(false);

  const buscarDatos = async () => {
    setCargando(true);
    try {
      const res = await reporteService.caja(filtros);
      setDatos(res.data.data || []);
      setResumen(res.data.resumen || {});
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      <FiltrosAvanzados
        filtros={filtros}
        setFiltros={setFiltros}
        onBuscar={buscarDatos}
        cargando={cargando}
        opciones={{ fechas: true }}
        catalogos={{}}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Arqueos</p>
            <p className="text-xl font-black text-zinc-900 dark:text-white">{resumen?.total_registros || 0}</p>
          </div>
          {resumen?.arqueos_con_diferencia !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Con Diferencia</p>
              <p className={`text-xl font-black ${resumen.arqueos_con_diferencia > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {resumen.arqueos_con_diferencia}
              </p>
            </div>
          )}
          {resumen?.total_diferencia !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Diferencia Neta</p>
              <p className={`text-xl font-black ${parseFloat(resumen.total_diferencia) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                Bs {parseFloat(resumen.total_diferencia).toFixed(2)}
              </p>
            </div>
          )}
        </div>
        <BotonesExportar datos={datos} columnas={COLUMNAS} titulo="Reporte_Arqueos_Caja" />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <TablaReporte columnas={COLUMNAS} datos={datos} cargando={cargando} />
      </div>
    </div>
  );
}
