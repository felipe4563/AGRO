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

      const pageWidth = doc.internal.pageSize.getWidth();
      const ACCENT = [16, 185, 129]; // mismo verde del header de tabla, para que todo el documento se lea como un solo sistema de diseño

      const encabezadoY = await dibujarEncabezadoEmpresa(doc, configuracion, { startY: 16 });
      let y = encabezadoY;

      doc.setFontSize(15);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(20);
      doc.text(titulo.replace(/_/g, ' '), 14, y);
      // Filete de color bajo el título — separa visualmente "qué es este documento"
      // del resto, en vez de una sola línea gris que mezclaba header y título.
      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.8);
      doc.line(14, y + 2, 14 + doc.getTextWidth(titulo.replace(/_/g, ' ')), y + 2);
      y += 8;

      // Metadatos en una sola línea compacta (antes eran 2-3 líneas sueltas) —
      // se lee como el pie de un documento formal, no como texto de depuración.
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(110);
      const partesMeta = [`Generado el ${new Date().toLocaleString()}`];
      if (usuario) {
        partesMeta.push(`por ${usuario.nombre} ${usuario.apellido || ''}${usuario.sucursal_nombre ? ` (${usuario.sucursal_nombre})` : ''}`.trim());
      }
      doc.text(partesMeta.join('  ·  '), 14, y);
      y += 5;

      if (subtitulo) {
        const splitSub = doc.splitTextToSize(subtitulo, pageWidth - 28);
        doc.text(splitSub, 14, y);
        y += (splitSub.length * 4) + 2;
      }
      y += 2;
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
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.2, lineColor: [225, 227, 230], lineWidth: 0.1 },
        headStyles: { fillColor: ACCENT, textColor: [255, 255, 255], fontStyle: 'bold', lineColor: ACCENT },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: columnStyles,
      });

      y = doc.lastAutoTable.finalY + 10;

      // Renderizar resumen si existe — como tarjetas (igual que los contadores
      // de la pantalla de reportes), no como una lista de "etiqueta: valor"
      // suelta, que se veía como una nota de depuración.
      if (resumen && Object.keys(resumen).length > 0) {
        const labels = {
          total_registros: 'Total Registros',
          suma_total: 'Valor Total (Bs)',
          unidades_total: 'Total Unidades',
          total_ingresos: 'Ingresos Totales (Bs)',
          costo_total: 'Costo Total (Bs)',
          ganancia_total: 'Ganancia Bruta (Bs)',
          valor_total: 'Valor Total Estimado (Bs)',
          total_global: 'Total Global (Bs)',
          total_diferencia: 'Diferencia Total (Bs)',
          arqueos_con_diferencia: 'Arqueos c/Diferencia',
          lotes_en_perdida: 'Lotes Vendiendo a Pérdida'
        };
        // Claves cuyo valor es una señal negativa cuando es > 0 (p. ej. "lotes en
        // pérdida"): se resaltan en rojo en vez del verde neutro del resto.
        const CLAVES_ALERTA = ['lotes_en_perdida', 'arqueos_con_diferencia', 'total_diferencia'];

        const entradas = Object.entries(resumen);
        const ANCHO_TARJETA = 42;
        const ALTO_TARJETA = 18;
        const GAP = 4;
        const porFila = Math.max(1, Math.floor((pageWidth - 28 + GAP) / (ANCHO_TARJETA + GAP)));
        const altoBloque = Math.ceil(entradas.length / porFila) * (ALTO_TARJETA + GAP);

        if (y + altoBloque > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30);
        doc.text('Resumen', 14, y);
        y += 5;

        entradas.forEach(([key, val], i) => {
          const col = i % porFila;
          const fila = Math.floor(i / porFila);
          const x = 14 + col * (ANCHO_TARJETA + GAP);
          const yTarjeta = y + fila * (ALTO_TARJETA + GAP);

          let displayVal = val;
          if (typeof val === 'number') {
            displayVal = Number.isInteger(val) ? val.toString() : val.toLocaleString('en-US', { minimumFractionDigits: 2 });
          }
          const esAlerta = CLAVES_ALERTA.includes(key) && parseFloat(val) > 0;

          doc.setDrawColor(225, 227, 230);
          doc.setLineWidth(0.2);
          doc.setFillColor(250, 250, 251);
          doc.roundedRect(x, yTarjeta, ANCHO_TARJETA, ALTO_TARJETA, 1.5, 1.5, 'FD');

          doc.setFont(undefined, 'normal');
          doc.setFontSize(7);
          doc.setTextColor(120);
          const label = labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          doc.text(doc.splitTextToSize(label, ANCHO_TARJETA - 4), x + 2, yTarjeta + 5);

          doc.setFont(undefined, 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...(esAlerta ? [220, 38, 38] : [17, 24, 39]));
          doc.text(String(displayVal), x + 2, yTarjeta + 14);
        });

        y += altoBloque;
      }

      // Pie de página con numeración — en todas las páginas, al final para
      // saber el total de páginas antes de escribir "Página X de Y".
      const totalPaginas = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPaginas; p++) {
        doc.setPage(p);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(150);
        doc.text(`Página ${p} de ${totalPaginas}`, pageWidth - 14, doc.internal.pageSize.height - 8, { align: 'right' });
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
