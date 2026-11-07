// Impresión directa a impresoras térmicas Bluetooth vía Web Bluetooth API —
// sin ninguna app externa (a diferencia de rawbt.js, que depende de RawBT).
// Solo funciona en navegadores con soporte Web Bluetooth (Chrome/Edge en
// escritorio y Android; no disponible en Firefox ni Safari/iOS).
//
// Las impresoras térmicas clon (como las "POS80") exponen uno de estos
// servicios GATT con una characteristic de escritura por la que se les manda
// el flujo de comandos ESC/POS crudo:
import { generarRasterLogo, quitarTildes } from './rawbt';

const SERVICIOS_IMPRESORA = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

// Tamaño de bloque seguro para characteristic write en este tipo de impresora
// (paquetes más grandes pueden cortar la conexión BLE).
const TAMANO_BLOQUE = 20;

export function soportaWebBluetooth() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

// El permiso de Bluetooth que concede el selector nativo (navigator.bluetooth.
// requestDevice) lo recuerda el propio navegador, por origen, entre recargas —
// esto es lo que Chrome llama "persistent device permissions". Guardamos acá
// solo el id del dispositivo elegido (y su nombre, para mostrarlo en pantalla),
// así en la próxima impresión usamos navigator.bluetooth.getDevices() para
// recuperarlo y conectar directo, sin volver a mostrar el selector. Esto vive
// en localStorage: es por navegador/dispositivo, no se sincroniza por el
// backend (el permiso de Bluetooth en sí tampoco se puede sincronizar).
const CLAVE_IMPRESORA_GUARDADA = 'impresora_bluetooth_guardada';

export function obtenerImpresoraGuardada() {
  try {
    const raw = localStorage.getItem(CLAVE_IMPRESORA_GUARDADA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarImpresora(device) {
  try {
    localStorage.setItem(CLAVE_IMPRESORA_GUARDADA, JSON.stringify({ id: device.id, name: device.name || '' }));
  } catch {
    // localStorage no disponible (navegación privada, etc.) — no es crítico,
    // simplemente va a volver a pedir el dispositivo en la próxima impresión.
  }
}

export function olvidarImpresoraGuardada() {
  try { localStorage.removeItem(CLAVE_IMPRESORA_GUARDADA); } catch { /* no-op */ }
  conexion = null;
}

// Conexión cacheada en memoria para no reconectar en cada ticket dentro de la
// misma sesión del navegador.
let conexion = null; // { device, characteristic }

async function detectarCharacteristicEscritura(server) {
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    const esc = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (esc) return esc;
  }
  return null;
}

async function conectarYGuardarCaracteristic(device) {
  const server = await device.gatt.connect();
  const characteristic = await detectarCharacteristicEscritura(server);
  if (!characteristic) {
    throw new Error('La impresora no expone ninguna characteristic de escritura reconocida.');
  }
  conexion = { device, characteristic };
  return conexion;
}

// Flujo de configuración explícita (botón "Conectar impresora" en
// Configuración): siempre muestra el selector nativo, y guarda el dispositivo
// elegido para que las próximas impresiones no vuelvan a preguntar.
export async function emparejarImpresora() {
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICIOS_IMPRESORA,
  });
  const resultado = await conectarYGuardarCaracteristic(device);
  guardarImpresora(device);
  return resultado;
}

// Usado al imprimir un ticket: intenta reconectar en silencio al dispositivo
// ya guardado (sin selector); si no hay ninguno guardado o el navegador ya no
// lo recuerda (permiso revocado, otro navegador, etc.), pide configurarlo
// primero en vez de interrumpir la venta con el selector nativo.
async function conectarImpresoraBLE() {
  if (conexion && conexion.device.gatt.connected) return conexion;

  const guardada = obtenerImpresoraGuardada();
  if (!guardada) {
    throw new Error('No hay ninguna impresora Bluetooth configurada en este dispositivo. Configurala primero en Configuración → Impresora Bluetooth.');
  }

  const dispositivosConocidos = await navigator.bluetooth.getDevices();
  const device = dispositivosConocidos.find((d) => d.id === guardada.id);
  if (!device) {
    throw new Error(`Este navegador ya no recuerda "${guardada.name || 'la impresora'}". Volvé a conectarla en Configuración → Impresora Bluetooth.`);
  }

  return conectarYGuardarCaracteristic(device);
}

async function enviarBytes(characteristic, bytes) {
  for (let i = 0; i < bytes.length; i += TAMANO_BLOQUE) {
    const bloque = bytes.slice(i, i + TAMANO_BLOQUE);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(bloque);
    } else {
      await characteristic.writeValue(bloque);
    }
  }
}

// Mismo payload (logo + texto en ESC/POS) que imprimirConRawBTyLogo en
// rawbt.js, pero enviado directo por Web Bluetooth en vez de delegar a RawBT.
export async function imprimirConWebBluetooth(logoUrl, texto) {
  const { characteristic } = await conectarImpresoraBLE();

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

  await enviarBytes(characteristic, payload);
}
