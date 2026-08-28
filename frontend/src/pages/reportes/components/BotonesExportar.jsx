import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConfiguracion } from '../../../contexts/ConfiguracionContext';
import { dibujarEncabezadoEmpresa } from '../../../utils/pdfEmpresa';

export default function BotonesExportar({ datos, columnas, titulo, orientacion = 'portrait' }) {
  const configuracion = useConfiguracion();
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  const exportarExcel = () => {
    if (!datos || datos.length === 0) return alert('No hay datos para exportar');
    setExportandoExcel(true);
    try {
      // Mapear datos a nombres de columnas legibles
      const datosMapeados = datos.map(fila => {
        let nuevaFila = {};
        columnas.forEach(col => {
          if (col.key) {
            nuevaFila[col.header] = typeof col.render === 'function' ? col.render(fila[col.key], fila) : fila[col.key];
            // Limpiar HTML si la función render devuelve jsx. Para Excel necesitamos texto plano.
            // Una mejor aproximación es que col tenga un extractor de valor para Excel si renderiza JSX.
            if (col.excelValue) {
               nuevaFila[col.header] = col.excelValue(fila);
            }
          }
        });
        return nuevaFila;
      });

      const hoja = XLSX.utils.json_to_sheet(datosMapeados);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Reporte");
      XLSX.writeFile(libro, `${titulo}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Error exportando a Excel');
    } finally {
      setExportandoExcel(false);
    }
  };

  const exportarPDF = async () => {
    if (!datos || datos.length === 0) return alert('No hay datos para exportar');
    setExportandoPDF(true);
    try {
      const doc = new jsPDF(orientacion, 'mm', 'a4');

      const encabezadoY = await dibujarEncabezadoEmpresa(doc, configuracion, { startY: 16 });

      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text(titulo, 14, encabezadoY);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, encabezadoY + 5);
      doc.setTextColor(0);

      const head = [columnas.map(c => c.header)];
      const body = datos.map(fila =>
        columnas.map(col => col.excelValue ? col.excelValue(fila) : fila[col.key] || '')
      );

      autoTable(doc, {
        head: head,
        body: body,
        startY: encabezadoY + 9,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
      });

      doc.save(`${titulo}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error exportando a PDF');
    } finally {
      setExportandoPDF(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportarExcel}
        disabled={exportandoExcel || exportandoPDF || datos.length === 0}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-lg transition-colors border border-green-200 dark:border-green-800 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        {exportandoExcel ? 'Generando...' : 'Excel'}
      </button>

      <button
        onClick={exportarPDF}
        disabled={exportandoExcel || exportandoPDF || datos.length === 0}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors border border-red-200 dark:border-red-800 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
        {exportandoPDF ? 'Generando...' : 'PDF'}
      </button>
    </div>
  );
}
