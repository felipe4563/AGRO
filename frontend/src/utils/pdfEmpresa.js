// Encabezado de empresa (logo + nombre + NIT + dirección + contacto) reutilizado
// por todas las exportaciones a PDF de Reportes, para que los documentos se vean
// profesionales y listos para entregar/archivar.

async function cargarLogoDataUrl(logoUrl) {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Dibuja el encabezado de la empresa en la posición actual del documento jsPDF
 * y devuelve el Y (mm) donde debe continuar el contenido (tabla, imagen, etc.).
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {{ nombreEmpresa, logoUrl, tieneLogoPropio, nit, direccion, ciudad, telefono, correo }} config
 * @param {{ marginX?: number, startY?: number }} opciones
 */
export async function dibujarEncabezadoEmpresa(doc, config = {}, opciones = {}) {
  const marginX = opciones.marginX ?? 14;
  const startY = opciones.startY ?? 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoSize = 18;
  let textX = marginX;

  if (config.tieneLogoPropio && config.logoUrl) {
    const dataUrl = await cargarLogoDataUrl(config.logoUrl);
    if (dataUrl) {
      try {
        const formato = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(dataUrl, formato, marginX, startY - 4, logoSize, logoSize);
        textX = marginX + logoSize + 4;
      } catch {
        // Formato no soportado
      }
    }
  }

  // Izquierda: Nombre de la empresa y NIT
  let y = startY;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20);
  doc.text(config.nombreEmpresa || 'SIS-AGRO', textX, y);

  if (config.nit) {
    y += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`NIT: ${config.nit}`, textX, y);
  }

  // Derecha: Dirección y Contacto
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  
  let rightY = startY;
  const alignRight = (text, yPos) => {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, pageWidth - marginX - textWidth, yPos);
  };

  const dirCiudad = [config.direccion, config.ciudad].filter(Boolean).join(' — ');
  if (dirCiudad) {
    alignRight(dirCiudad, rightY);
    rightY += 5;
  }
  
  const contacto = [config.telefono, config.correo].filter(Boolean).join('  |  ');
  if (contacto) {
    alignRight(contacto, rightY);
    rightY += 5;
  }

  // Dibujar línea separadora
  const finalY = Math.max(y, rightY - 5, startY - 4 + logoSize) + 4;
  
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(marginX, finalY, pageWidth - marginX, finalY);

  doc.setTextColor(0); // Reset color
  return finalY + 6;
}
