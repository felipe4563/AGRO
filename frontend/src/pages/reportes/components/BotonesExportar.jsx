import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConfiguracion } from '../../../contexts/ConfiguracionContext';
import { useAuth } from '../../../contexts/AuthContext';
import { dibujarEncabezadoEmpresa } from '../../../utils/pdfEmpresa';

export default function BotonesExportar({ datos, columnas, titulo, orientacion = 'portrait', resumen, subtitulo }) {
  const configuracion = useConfiguracion();
  const { usuario } = useAuth();
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
            const headerStr = col.exportHeader || (typeof col.header === 'string' ? col.header : col.key);
            nuevaFila[headerStr] = typeof col.render === 'function' ? col.render(fila[col.key], fila) : fila[col.key];
            if (col.excelValue) {
               nuevaFila[headerStr] = col.excelValue(fila);
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
      let y = encabezadoY;

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(titulo.replace(/_/g, ' '), 14, y);
      y += 5;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, y);
      y += 4;
      
      if (usuario) {
        doc.text(`Generado por: ${usuario.nombre} ${usuario.apellido || ''} ${usuario.sucursal_nombre ? `(${usuario.sucursal_nombre})` : ''}`, 14, y);
        y += 5;
      } else {
        y += 1;
      }

      if (subtitulo) {
        const splitSub = doc.splitTextToSize(subtitulo, doc.internal.pageSize.width - 28);
        doc.text(splitSub, 14, y);
        y += (splitSub.length * 4) + 2;
      }
      doc.setTextColor(0);

      const columnStyles = {};
      columnas.forEach((col, index) => {
        if (col.align) {
          columnStyles[index] = { halign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left' };
        }
      });

      const head = [columnas.map(c => c.exportHeader || (typeof c.header === 'string' ? c.header : c.key))];
      const body = datos.map(fila =>
        columnas.map(col => {
          if (col.pdfValue) return col.pdfValue(fila);
          if (col.excelValue) {
            const val = col.excelValue(fila);
            if (typeof val === 'number') {
               return Number.isInteger(val) ? val.toString() : val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
            return val !== null && val !== undefined ? String(val) : '';
          }
          return fila[col.key] !== null && fila[col.key] !== undefined ? String(fila[col.key]) : '';
        })
      );

      autoTable(doc, {
        head: head,
        body: body,
        startY: y,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] }, // Estilo cebra ligero
        columnStyles: columnStyles,
      });

      y = doc.lastAutoTable.finalY + 10;

      // Renderizar resumen si existe
      if (resumen && Object.keys(resumen).length > 0) {
        if (y > doc.internal.pageSize.height - 40) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30);
        doc.text('RESUMEN DEL REPORTE', 14, y);
        y += 6;

        doc.setFontSize(9);
        const labels = {
          total_registros: 'Total Registros:',
          suma_total: 'Valor Total (Bs):',
          unidades_total: 'Total Unidades:',
          total_ingresos: 'Ingresos Totales (Bs):',
          costo_total: 'Costo Total (Bs):',
          ganancia_total: 'Ganancia Bruta (Bs):',
          valor_total: 'Valor Total Estimado (Bs):',
          total_global: 'Total Global (Bs):',
          total_diferencia: 'Diferencia Total (Bs):',
          arqueos_con_diferencia: 'Arqueos c/Diferencia:'
        };

        const startX = 14;
        Object.entries(resumen).forEach(([key, val]) => {
          let label = labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ':';
          let displayVal = val;
          if (typeof val === 'number') {
             displayVal = Number.isInteger(val) ? val.toString() : val.toLocaleString('en-US', {minimumFractionDigits: 2});
          }
          
          doc.setFont(undefined, 'bold');
          doc.text(label, startX, y);
          doc.setFont(undefined, 'normal');
          doc.text(String(displayVal), startX + doc.getTextWidth(label) + 2, y);
          
          y += 5;
        });
      }

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
