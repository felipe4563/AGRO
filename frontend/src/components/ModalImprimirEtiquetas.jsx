import { useState } from 'react';
import productoService from '../services/producto.service';
import EtiquetaBarcode from './EtiquetaBarcode';

// Etiqueta física: 30x20mm cada una, 2 por fila (rollo de doble columna,
// confirmado por medición: ~60mm de ancho total). Al imprimir, elegir el
// tamaño de papel del driver DP23 más cercano a 60x20mm (ej. "F 60x30mm"
// si no hay uno exacto de 60x20).
const ETIQUETAS_POR_FILA = 2;
const LABEL_WIDTH_MM = 30;
const LABEL_HEIGHT_MM = 20;
// El ancho real de papel del driver es fijo (60mm, ej. "F 60x40mm") — pasarse
// de ese ancho hace que el navegador recorte directamente en la vista previa.
// No agregar margen extra que sume más de 60mm en total.
const COLUMN_GAP_MM = 0;
const PAGE_WIDTH_MM = LABEL_WIDTH_MM * ETIQUETAS_POR_FILA;
// El cabezal imprime la 2da columna ~4mm más a la derecha de donde
// arranca su casillero físico (medido con regla). La corremos 4mm a la
// derecha; como el ancho total no puede pasar de 60mm (si no, el
// navegador recorta), la 2da columna queda 4mm más angosta (26mm) para
// no salirse de la página.
const OFFSET_SEGUNDA_COLUMNA_MM = 3;
const ANCHO_SEGUNDA_COLUMNA_MM = LABEL_WIDTH_MM - OFFSET_SEGUNDA_COLUMNA_MM;

// items: [{ id_producto, nombre, codigo_barras, precio_menor, cantidad }]
export default function ModalImprimirEtiquetas({ items: itemsIniciales, onClose }) {
  const [items, setItems] = useState(
    itemsIniciales.map((it) => ({ ...it, cantidad: it.cantidad ?? 2 }))
  );
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [listoParaImprimir, setListoParaImprimir] = useState(
    itemsIniciales.every((it) => it.codigo_barras)
  );

  const actualizarCantidad = (idProducto, valor) => {
    const cant = Math.max(1, parseInt(valor, 10) || 1);
    setItems((prev) => prev.map((it) => (it.id_producto === idProducto ? { ...it, cantidad: cant } : it)));
  };

  const prepararEImprimir = async () => {
    setError('');
    setGenerando(true);
    try {
      const actualizados = await Promise.all(
        items.map(async (it) => {
          if (it.codigo_barras) return it;
          const res = await productoService.generarCodigoBarras(it.id_producto);
          return { ...it, codigo_barras: res.data.codigo_barras };
        })
      );
      setItems(actualizados);
      setListoParaImprimir(true);
      // Esperar a que los <svg> del código de barras se rendericen antes de imprimir
      setTimeout(() => window.print(), 150);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar los códigos de barras');
    } finally {
      setGenerando(false);
    }
  };

  const imprimir = () => {
    if (!listoParaImprimir) {
      prepararEImprimir();
    } else {
      window.print();
    }
  };

  // El rollo es una tira continua, no hojas sueltas: armamos TODAS las
  // filas en un solo bloque (sin "page-break") y calculamos el alto total
  // exacto según cuántas filas haya. Usar "page-break-after" por fila
  // chocaba con el tamaño de papel fijo del driver y desalineaba filas
  // alternadas.
  const etiquetas = items.flatMap((it) =>
    Array.from({ length: it.cantidad }).map((_, i) => ({
      key: `${it.id_producto}-${i}`,
      codigoBarras: it.codigo_barras,
      nombre: it.nombre,
      precio: it.precio_menor,
    }))
  );
  const filas = [];
  for (let i = 0; i < etiquetas.length; i += ETIQUETAS_POR_FILA) {
    filas.push(etiquetas.slice(i, i + ETIQUETAS_POR_FILA));
  }
  const PAGE_HEIGHT_MM = Math.max(filas.length, 1) * LABEL_HEIGHT_MM;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="no-print w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 max-h-[85vh] flex flex-col">
        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">🏷️ Imprimir etiquetas ({LABEL_WIDTH_MM}x{LABEL_HEIGHT_MM}mm)</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Elige cuántas copias de cada etiqueta necesitas.
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {items.map((it) => (
            <div
              key={it.id_producto}
              className="flex items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{it.nombre}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {it.codigo_barras ? `Cód: ${it.codigo_barras}` : 'Se generará un código nuevo'}
                </p>
              </div>
              <input
                type="number"
                min="1"
                value={it.cantidad}
                onChange={(e) => actualizarCantidad(it.id_producto, e.target.value)}
                className="w-16 text-center py-1.5 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Cerrar
          </button>
          <button
            onClick={imprimir}
            disabled={generando}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {generando ? 'Preparando...' : '🖨️ Imprimir'}
          </button>
        </div>
      </div>

      {/* ── Área de impresión: tira continua de filas de 30x20mm x 2, sin cortes de página ── */}
      <div id="etiquetas-print">
        {filas.map((fila, idx) => (
          <div className="etiqueta-fila" key={idx}>
            {fila.map((et, colIdx) =>
              colIdx > 0 ? (
                <div
                  key={et.key}
                  style={{
                    width: `${ANCHO_SEGUNDA_COLUMNA_MM}mm`,
                    height: `${LABEL_HEIGHT_MM}mm`,
                    marginLeft: `${OFFSET_SEGUNDA_COLUMNA_MM}mm`,
                    overflow: 'hidden',
                  }}
                >
                  <EtiquetaBarcode codigoBarras={et.codigoBarras} />
                </div>
              ) : (
                <EtiquetaBarcode key={et.key} codigoBarras={et.codigoBarras} />
              )
            )}
            {Array.from({ length: ETIQUETAS_POR_FILA - fila.length }).map((_, i) => (
              <div key={`vacio-${i}`} style={{ width: `${LABEL_WIDTH_MM}mm`, height: `${LABEL_HEIGHT_MM}mm` }} />
            ))}
          </div>
        ))}
      </div>

      <style>{`
        #etiquetas-print { display: none; }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #etiquetas-print, #etiquetas-print * { visibility: visible !important; }
          #etiquetas-print {
            display: block !important;
            position: fixed;
            top: 0;
            left: 0;
          }
          .etiqueta-fila {
            display: flex;
            gap: ${COLUMN_GAP_MM}mm;
            padding: 0 ${COLUMN_GAP_MM}mm;
            box-sizing: border-box;
          }
          @page { size: ${PAGE_WIDTH_MM}mm ${PAGE_HEIGHT_MM}mm; margin: 0; }
        }
      `}</style>
    </div>
  );
}
