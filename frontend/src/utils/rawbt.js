// Utilidades para imprimir texto plano en impresoras térmicas Bluetooth
// mediante la app RawBT (https://rawbt.ru) — usa un intent de Android,
// solo funciona desde un navegador Android con RawBT instalado.

export const ANCHO_TICKET = 48; // columnas para impresora térmica 80mm, fuente normal (Font A)

export function centrar(texto, ancho = ANCHO_TICKET) {
  texto = String(texto);
  if (texto.length >= ancho) return texto.slice(0, ancho);
  const espacios = ancho - texto.length;
  const izq = Math.floor(espacios / 2);
  return ' '.repeat(izq) + texto + ' '.repeat(espacios - izq);
}

export function fila(izquierda, derecha, ancho = ANCHO_TICKET) {
  izquierda = String(izquierda);
  derecha = String(derecha);
  const espacio = ancho - izquierda.length - derecha.length;
  if (espacio <= 0) return `${izquierda} ${derecha}`;
  return izquierda + ' '.repeat(espacio) + derecha;
}

export function linea(char = '-', ancho = ANCHO_TICKET) {
  return char.repeat(ancho);
}

// Muchas impresoras térmicas clon (incluida la probada, "POS80"/MTP-3) traen
// de fábrica una codepágina china (GB18030) en vez de UTF-8 o Latin-1: una
// tilde en UTF-8 ocupa 2 bytes que la impresora interpreta como un carácter
// chino de 2 bytes, no como la letra acentuada. En vez de apostar a que la
// impresora soporte cambiar de codepágina (ESC t n, no garantizado en todos
// los modelos), se sacan los acentos antes de mandar el texto — funciona
// igual en cualquier impresora ESC/POS sin importar su codepágina por defecto.
export function quitarTildes(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// Codifica un array de bytes crudos (no texto) a base64, en bloques para no
// reventar el límite de argumentos de String.fromCharCode con imágenes grandes.
function bytesABase64(bytes) {
  let binario = '';
  const TAMANO_BLOQUE = 0x8000;
  for (let i = 0; i < bytes.length; i += TAMANO_BLOQUE) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TAMANO_BLOQUE));
  }
  return btoa(binario);
}

// Ancho en píxeles para el logo impreso — múltiplo de 8 (lo exige el formato
// ESC/POS de imagen rasterizada). Ajustado a ojo contra la impresora real
// (576 = ancho completo del papel resultó demasiado grande).
const ANCHO_LOGO_PX = 224;

// Descarga el logo y lo convierte a comandos ESC/POS de imagen rasterizada
// (GS v 0), en blanco y negro puro por umbral de luminancia — las impresoras
// térmicas no manejan color ni escala de grises real.
export async function generarRasterLogo(logoUrl, anchoPx = ANCHO_LOGO_PX) {
  const res = await fetch(logoUrl, { mode: 'cors' });
  if (!res.ok) throw new Error('No se pudo descargar el logo');
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const escala = anchoPx / bitmap.width;
  const alto = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement('canvas');
  canvas.width = anchoPx;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, anchoPx, alto);
  ctx.drawImage(bitmap, 0, 0, anchoPx, alto);

  const { data } = ctx.getImageData(0, 0, anchoPx, alto);
  const bytesPorFila = anchoPx / 8;
  const bitmapBits = new Uint8Array(bytesPorFila * alto);

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < anchoPx; x++) {
      const i = (y * anchoPx + x) * 4;
      const luminancia = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const esNegro = data[i + 3] > 64 && luminancia < 160; // ignora transparencia; umbral fijo
      if (esNegro) {
        bitmapBits[y * bytesPorFila + (x >> 3)] |= 0x80 >> (x % 8);
      }
    }
  }

  const bytesFila = bytesPorFila;
  // GS v 0 siempre arranca a imprimir desde el margen izquierdo del papel —
  // no se auto-centra solo por tener menos ancho que el área imprimible.
  // Se envuelve en ESC a 1 / ESC a 0 (centrar / volver a izquierda) para que
  // quede centrado aunque el logo sea más angosto que el papel.
  const alinearCentro = new Uint8Array([0x1b, 0x61, 0x01]);
  const alinearIzquierda = new Uint8Array([0x1b, 0x61, 0x00]);
  const encabezadoImagen = new Uint8Array([
    0x1d, 0x76, 0x30, 0x00,          // GS v 0, modo normal
    bytesFila & 0xff, (bytesFila >> 8) & 0xff,
    alto & 0xff, (alto >> 8) & 0xff,
  ]);

  const comando = new Uint8Array(
    alinearCentro.length + encabezadoImagen.length + bitmapBits.length + alinearIzquierda.length
  );
  let offset = 0;
  comando.set(alinearCentro, offset); offset += alinearCentro.length;
  comando.set(encabezadoImagen, offset); offset += encabezadoImagen.length;
  comando.set(bitmapBits, offset); offset += bitmapBits.length;
  comando.set(alinearIzquierda, offset);
  return comando;
}

// Dispara la impresión en RawBT (impresora térmica Bluetooth vía Android).
// Si RawBT no está instalado, Android simplemente no abre ninguna app.
export function imprimirConRawBT(texto) {
  const b64 = utf8ToBase64(quitarTildes(texto));
  const url = `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
  window.location.href = url;
}

// Igual que imprimirConRawBT, pero antepone el logo de la empresa como imagen
// ESC/POS antes del texto. Si el logo no se puede descargar/procesar (sin
// conexión, imagen inválida, etc.) se imprime igual el ticket, solo que sin
// logo — el logo nunca bloquea la impresión.
export async function imprimirConRawBTyLogo(logoUrl, texto) {
  const textoBytes = new TextEncoder().encode(quitarTildes(texto));
  let payload = textoBytes;

  if (logoUrl) {
    try {
      const logoBytes = await generarRasterLogo(logoUrl);
      const salto = new TextEncoder().encode('\n');
      payload = new Uint8Array(logoBytes.length + salto.length + textoBytes.length);
      payload.set(logoBytes, 0);
      payload.set(salto, logoBytes.length);
      payload.set(textoBytes, logoBytes.length + salto.length);
    } catch (err) {
      console.warn('No se pudo imprimir el logo, se imprime solo el texto:', err);
    }
  }

  const b64 = bytesABase64(payload);
  const url = `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
  window.location.href = url;
}
