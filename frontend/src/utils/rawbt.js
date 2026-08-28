// Utilidades para imprimir texto plano en impresoras térmicas Bluetooth
// mediante la app RawBT (https://rawbt.ru) — usa un intent de Android,
// solo funciona desde un navegador Android con RawBT instalado.

export const ANCHO_TICKET = 32; // columnas para impresora térmica 58/80mm en fuente normal

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

// Dispara la impresión en RawBT (impresora térmica Bluetooth vía Android).
// Si RawBT no está instalado, Android simplemente no abre ninguna app.
export function imprimirConRawBT(texto) {
  const b64 = utf8ToBase64(texto);
  const url = `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
  window.location.href = url;
}
