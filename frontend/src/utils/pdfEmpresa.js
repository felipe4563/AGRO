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
        // Formato de imagen no soportado por jsPDF — se omite el logo, no es fatal.
      }
    }
  }

  let y = startY;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text(config.nombreEmpresa || 'SIS-AGRO', textX, y);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100);
  y += 4.5;

  const lineas = [];
  if (config.nit) lineas.push(`NIT: ${config.nit}`);
  const dirCiudad = [config.direccion, config.ciudad].filter(Boolean).join(' — ');
  if (dirCiudad) lineas.push(dirCiudad);
  const contacto = [config.telefono, config.correo].filter(Boolean).join('  ·  ');
  if (contacto) lineas.push(contacto);

  lineas.forEach((linea) => {
    doc.text(linea, textX, y);
    y += 4;
  });

  doc.setTextColor(0);
  doc.setFont(undefined, 'normal');

  y = Math.max(y, startY - 4 + logoSize) + 3;
  doc.setDrawColor(220);
  doc.line(marginX, y, doc.internal.pageSize.getWidth() - marginX, y);

  return y + 6;
}
