import { useState, useEffect } from 'react';
import PageWrapper from '../../components/PageWrapper';
import reporteService from '../../services/reporte.service';
import FiltrosAvanzados from './components/FiltrosAvanzados';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConfiguracion } from '../../contexts/ConfiguracionContext';
import { useAuth } from '../../contexts/AuthContext';
import { dibujarEncabezadoEmpresa } from '../../utils/pdfEmpresa';

export default function DashboardReportes() {
  const configuracion = useConfiguracion();
  const { usuario } = useAuth();
  const [financiero, setFinanciero] = useState(null);
  const [topProductos, setTopProductos] = useState([]);
  const [vencimientos, setVencimientos] = useState([]);
  const [ventasDiarias, setVentasDiarias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [filtros, setFiltros] = useState({});
  // Recharts mide el contenedor del gráfico en el mismo tick del montaje,
  // antes de que el navegador termine de calcular su tamaño real (por eso
  // el warning "width(-1) height(-1)" en consola). Esperar un frame antes
  // de montar el <ResponsiveContainer> evita esa medición prematura.
  const [listoParaGrafico, setListoParaGrafico] = useState(false);

  useEffect(() => {
    cargarReportes();
    const frame = requestAnimationFrame(() => setListoParaGrafico(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarReportes = async () => {
    setCargando(true);
    try {
      const params = filtros.fechaInicio && filtros.fechaFin
        ? { fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin }
        : undefined;
      // El reporte 'diarias' no tiene un default de "mes actual" como financiero/topProductos:
      // sin rango explícito traería el historial completo. Se fija siempre un rango acotado.
      const hoy = new Date();
      const paramsDiarias = params || {
        fechaInicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10),
        fechaFin: hoy.toISOString().slice(0, 10)
      };
      const [finRes, topRes, venRes, diariasRes] = await Promise.all([
        reporteService.financiero(params),
        reporteService.topProductos(params),
        reporteService.vencimientos(),
        reporteService.ventas('diarias', paramsDiarias)
      ]);
      setFinanciero(finRes.data);
      setTopProductos(topRes.data);
      setVencimientos(venRes.data);
      setVentasDiarias((diariasRes.data.data || diariasRes.data || []).slice().reverse());
    } catch (err) {
      console.error(err);
      alert('Error al cargar datos del dashboard');
    } finally {
      setCargando(false);
    }
  };

  const rangoTexto = filtros.fechaInicio && filtros.fechaFin
    ? `Del ${filtros.fechaInicio} al ${filtros.fechaFin}`
    : 'Mes actual';

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      let y = await dibujarEncabezadoEmpresa(pdf, configuracion, { startY: 18 });
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('Reporte Gerencial', 14, y + 4);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(120);
      pdf.text(`Período: ${rangoTexto}`, 14, y + 11);
      pdf.text(`Generado el: ${new Date().toLocaleString()}`, 14, y + 16);
      if (usuario) {
        pdf.text(`Generado por: ${usuario.nombre} ${usuario.apellido || ''} ${usuario.sucursal_nombre ? `(${usuario.sucursal_nombre})` : ''}`, 14, y + 21);
        y += 29;
      } else {
        y += 24;
      }
      pdf.setTextColor(0);

      if (financiero) {
        autoTable(pdf, {
          startY: y,
          head: [['Indicador', 'Valor']],
          body: [
            ['Ventas del período', `Bs ${parseFloat(financiero.ingresos_mes).toLocaleString()}`],
            ['Compras del período', `Bs ${parseFloat(financiero.egresos_mes).toLocaleString()}`],
            ['Flujo bruto (Ventas - Compras)', `Bs ${parseFloat(financiero.utilidad_bruta_mes).toLocaleString()}`],
            ['Ticket promedio', `Bs ${parseFloat(financiero.ticket_promedio).toLocaleString()} (${financiero.cantidad_ventas || 0} ventas)`],
            ['Cuentas por cobrar', `Bs ${parseFloat(financiero.total_por_cobrar).toLocaleString()}`],
            ['Cuentas por pagar', `Bs ${parseFloat(financiero.total_por_pagar).toLocaleString()}`],
            ['Productos con stock bajo', `${financiero.productos_stock_bajo || 0}`],
            ['Ventas de hoy', `${financiero.ventas_hoy_cantidad} (Bs ${parseFloat(financiero.ingresos_hoy).toLocaleString()})`],
          ],
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129] },
          margin: { left: 14, right: 14 },
        });
        y = pdf.lastAutoTable.finalY + 10;
      }

      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Productos Más Vendidos', 14, y);
      y += 4;

      if (topProductos.length > 0) {
        autoTable(pdf, {
          startY: y,
          head: [['Producto', 'Código', 'Unidades Vendidas', 'Ingresos Generados']],
          body: topProductos.map((p) => [
            p.nombre,
            p.codigo_barras || '-',
            p.unidades_vendidas,
            `Bs ${parseFloat(p.ingresos_generados).toLocaleString()}`,
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [16, 185, 129] },
          margin: { left: 14, right: 14 },
        });
        y = pdf.lastAutoTable.finalY + 10;
      } else {
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        pdf.text('No hay datos de ventas suficientes.', 14, y + 5);
        y += 12;
      }

      if (y > pdf.internal.pageSize.getHeight() - 40) {
        pdf.addPage();
        y = 18;
      }

      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Alertas de Vencimiento (Próximos 30 días)', 14, y);
      y += 4;

      if (vencimientos.length > 0) {
        autoTable(pdf, {
          startY: y,
          head: [['Producto', 'Lote', 'Stock', 'Vencimiento', 'Estado']],
          body: vencimientos.map((v) => [
            v.producto_nombre,
            v.numero_lote || v.id_lote,
            `${v.stock_unidades} u`,
            new Date(v.fecha_vencimiento).toLocaleDateString(),
            v.dias_restantes < 0 ? `Vencido hace ${Math.abs(v.dias_restantes)}d` : `En ${v.dias_restantes} días`,
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [239, 68, 68] },
          margin: { left: 14, right: 14 },
        });
      } else {
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        pdf.text('Todo el inventario está vigente.', 14, y + 5);
      }

      pdf.save(`Reporte_Gerencial_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Hubo un error al generar el PDF: ' + error.message);
    } finally {
      setExportando(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const fmtBs = (v) => `Bs ${parseFloat(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  function TendenciaBadge({ valor, invertirColor = false }) {
    if (valor === undefined || valor === null) return null;
    const num = parseFloat(valor);
    const subio = num >= 0;
    const esBueno = invertirColor ? !subio : subio;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-md ${
        esBueno ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30'
                : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      }`}>
        <svg className={`w-3 h-3 ${subio ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.56L5.03 9.78a.75.75 0 01-1.06-1.06l5.5-5.5a.75.75 0 011.06 0l5.5 5.5a.75.75 0 11-1.06 1.06L10.75 5.56v10.69A.75.75 0 0110 17z" clipRule="evenodd" />
        </svg>
        {Math.abs(num).toFixed(1)}%
      </span>
    );
  }

  function TarjetaKPI({ titulo, valor, subtitulo, colorValor, tendencia, tendenciaInvertida, icono }) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{titulo}</p>
          {icono}
        </div>
        <h3 className={`text-2xl font-black ${colorValor}`}>{valor}</h3>
        <div className="flex items-center gap-2 mt-2">
          {tendencia !== undefined && <TendenciaBadge valor={tendencia} invertirColor={tendenciaInvertida} />}
          {subtitulo && <p className="text-xs text-zinc-400">{subtitulo}</p>}
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2.5">
            <svg className="w-6 h-6 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8m0 0h-5m5 0v5" />
            </svg>
            Dashboard Gerencial
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Resumen en tiempo real de las operaciones y estado del almacén.
          </p>
        </div>
        <button
          onClick={exportarPDF}
          disabled={exportando || cargando}
          className="bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {exportando ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          )}
          {exportando ? 'Generando PDF...' : 'Descargar PDF'}
        </button>
      </div>

      <FiltrosAvanzados
        filtros={filtros}
        setFiltros={setFiltros}
        onBuscar={cargarReportes}
        cargando={cargando}
        opciones={{ fechas: true }}
      />

      {cargando ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
          <svg className="animate-spin h-8 w-8 mb-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Cargando métricas...
        </div>
      ) : (
      <div className="space-y-6">

        {/* Tarjetas KPI (Financiero) */}
        {financiero && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <TarjetaKPI
              titulo="Ventas del Período"
              valor={fmtBs(financiero.ingresos_mes)}
              colorValor="text-emerald-600 dark:text-emerald-400"
              tendencia={financiero.variacion_ventas}
              subtitulo={`Hoy: ${fmtBs(financiero.ingresos_hoy)}`}
              icono={<svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>}
            />
            <TarjetaKPI
              titulo="Compras del Período"
              valor={fmtBs(financiero.egresos_mes)}
              colorValor="text-red-600 dark:text-red-400"
              tendencia={financiero.variacion_compras}
              tendenciaInvertida
              subtitulo="Gastos en inventario"
              icono={<svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 13H5v-2h14v2z"/></svg>}
            />
            <TarjetaKPI
              titulo="Flujo Bruto"
              valor={fmtBs(financiero.utilidad_bruta_mes)}
              colorValor={financiero.utilidad_bruta_mes >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}
              subtitulo="Ventas - Compras"
              icono={<svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>}
            />
            <TarjetaKPI
              titulo="Ticket Promedio"
              valor={fmtBs(financiero.ticket_promedio)}
              colorValor="text-purple-600 dark:text-purple-400"
              subtitulo={`${financiero.cantidad_ventas || 0} ventas`}
              icono={<svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>}
            />
            <TarjetaKPI
              titulo="Por Cobrar"
              valor={fmtBs(financiero.total_por_cobrar)}
              colorValor="text-amber-600 dark:text-amber-400"
              subtitulo="Créditos a clientes"
              icono={<svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>}
            />
            <TarjetaKPI
              titulo="Por Pagar"
              valor={fmtBs(financiero.total_por_pagar)}
              colorValor="text-orange-600 dark:text-orange-400"
              subtitulo={financiero.productos_stock_bajo > 0 ? `${financiero.productos_stock_bajo} prod. con stock bajo` : 'A proveedores'}
              icono={<svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" /></svg>}
            />
          </div>
        )}

        {/* Tendencia de ventas diarias */}
        {ventasDiarias.length > 1 && listoParaGrafico && (
          <div className="min-w-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              Evolución de Ventas del Período
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="99%" height={224}>
                <AreaChart data={ventasDiarias} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                  <XAxis dataKey="fecha" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    formatter={(value) => [fmtBs(value), 'Ventas']}
                  />
                  <Area type="monotone" dataKey="total_ingresos" stroke="#10b981" strokeWidth={2} fill="url(#colorVentas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* min-w-0: sin esto, el gráfico dentro de la celda del grid mide un
              ancho inválido (-1) en el primer render y Recharts se queja. */}
          {/* Gráfico Top 5 */}
          <div className="min-w-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
              Top 5 Productos Más Vendidos
            </h3>

            {topProductos.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-zinc-400">No hay datos de ventas suficientes</div>
            ) : !listoParaGrafico ? (
              <div className="h-72" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="99%" height={280}>
                  <BarChart data={topProductos.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3f3f46" opacity={0.2} />
                    <XAxis type="number" tick={{fill: '#71717a', fontSize: 12}} />
                    <YAxis dataKey="nombre" type="category" width={100} tick={{fill: '#71717a', fontSize: 12}} />
                    <Tooltip
                      cursor={{fill: 'rgba(16, 185, 129, 0.1)'}}
                      contentStyle={{backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff'}}
                      formatter={(value) => [`${value} unidades`, 'Vendido']}
                    />
                    <Bar dataKey="unidades_vendidas" radius={[0, 4, 4, 0]}>
                      {topProductos.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Alertas de Vencimiento */}
          <div className="min-w-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <h3 className="font-bold text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Alertas de Vencimiento (Próximos 30 días)
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Lotes que requieren acción inmediata para evitar mermas.</p>
            </div>

            <div className="overflow-y-auto flex-1 max-h-[300px]">
              {vencimientos.length === 0 ? (
                <div className="h-full flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium py-8">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Todo el inventario está vigente.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0">
                    <tr className="text-zinc-500 dark:text-zinc-400">
                      <th className="px-4 py-3 font-medium">Producto / Lote</th>
                      <th className="px-4 py-3 font-medium text-center">Stock</th>
                      <th className="px-4 py-3 font-medium text-right">Caducidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {vencimientos.map((v) => (
                      <tr key={v.id_lote} className={v.dias_restantes < 0 ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{v.producto_nombre}</p>
                          <p className="text-[10px] text-zinc-500">Lote: {v.numero_lote || v.id_lote}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-zinc-700 dark:text-zinc-300">
                          {v.stock_unidades} u
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${
                            v.dias_restantes < 0
                              ? 'text-red-700 bg-red-100 border-red-300'
                              : 'text-amber-700 bg-amber-100 border-amber-300'
                          }`}>
                            {v.dias_restantes < 0 ? `Vencido hace ${Math.abs(v.dias_restantes)}d` : `En ${v.dias_restantes} días`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </PageWrapper>
  );
}
