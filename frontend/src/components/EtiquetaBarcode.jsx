import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

// Alto y grosor de las barras del código. Editar estos valores para
// probar distintos tamaños — el código ocupa casi toda la etiqueta.
export const BARCODE_HEIGHT_MM = 13;
export const BARCODE_BAR_WIDTH = 0.9;
export const BARCODE_FONT_SIZE = 9;

// Etiqueta física de 30mm x 20mm: solo código de barras + su número.
export default function EtiquetaBarcode({ codigoBarras }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !codigoBarras) return;
    try {
      JsBarcode(svgRef.current, codigoBarras, {
        format: 'CODE128',
        displayValue: true,
        fontSize: BARCODE_FONT_SIZE,
        height: BARCODE_HEIGHT_MM * 3.78, // mm a px aprox (96dpi/25.4)
        width: BARCODE_BAR_WIDTH,
        margin: 0,
        textMargin: 2,
      });
    } catch {
      // código con caracteres no soportados por Code128: no renderiza
    }
  }, [codigoBarras]);

  return (
    <div
      className="etiqueta-barcode"
      style={{
        width: '30mm',
        height: '20mm',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '1mm',
        fontFamily: 'Arial, sans-serif',
        background: 'white',
        color: '#000',
      }}
    >
      <svg ref={svgRef} style={{ width: '100%', minWidth: 0, maxWidth: '100%', maxHeight: '18mm' }} />
    </div>
  );
}
