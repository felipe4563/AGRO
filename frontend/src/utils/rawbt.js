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
// ESC/POS de imagen rasterizada). 384px se ve bien tanto en 58mm como 80mm
// sin desbordar el papel.
const ANCHO_LOGO_PX = 384;

// Descarga el logo y lo convierte a comandos ESC/POS de imagen rasterizada
// (GS v 0), en blanco y negro puro por umbral de luminancia — las impresoras
// térmicas no manejan color ni escala de grises real.
async function generarRasterLogo(logoUrl, anchoPx = ANCHO_LOGO_PX) {
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
  const encabezado = new Uint8Array([
    0x1d, 0x76, 0x30, 0x00,          // GS v 0, modo normal
    bytesFila & 0xff, (bytesFila >> 8) & 0xff,
    alto & 0xff, (alto >> 8) & 0xff,
  ]);

  const comando = new Uint8Array(encabezado.length + bitmapBits.length);
  comando.set(encabezado, 0);
  comando.set(bitmapBits, encabezado.length);
  return comando;
}

// Dispara la impresión en RawBT (impresora térmica Bluetooth vía Android).
// Si RawBT no está instalado, Android simplemente no abre ninguna app.
export function imprimirConRawBT(texto) {
  const b64 = utf8ToBase64(texto);
  const url = `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
  window.location.href = url;
}

// Igual que imprimirConRawBT, pero antepone el logo de la empresa como imagen
// ESC/POS antes del texto. Si el logo no se puede descargar/procesar (sin
// conexión, imagen inválida, etc.) se imprime igual el ticket, solo que sin
// logo — el logo nunca bloquea la impresión.
export async function imprimirConRawBTyLogo(logoUrl, texto) {
  const textoBytes = new TextEncoder().encode(texto);
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
