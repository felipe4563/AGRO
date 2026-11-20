# Impresión Bluetooth

El sistema puede imprimir tickets (venta, caja, cobro, pago a proveedor) en una
impresora térmica Bluetooth de dos formas distintas. Este documento explica
cómo funciona cada una, cuándo usar cuál, y cómo diagnosticar problemas.

## Las dos formas de imprimir por Bluetooth

| | RawBT | Bluetooth directo |
|---|---|---|
| Botón | "Imprimir Bluetooth (RawBT)" | "Imprimir Bluetooth (directo)" |
| Requiere | App [RawBT](https://rawbt.ru) instalada en el celular | Nada — solo el navegador |
| Plataformas | Solo Android (dispara un `intent://`) | Chrome/Edge en Android **y** en escritorio (Windows/Mac/Linux) |
| Cómo se conecta | RawBT maneja el Bluetooth internamente | El navegador se conecta directo a la impresora (Web Bluetooth API) |
| Visible cuando | Siempre | Solo si el navegador soporta Web Bluetooth (`'bluetooth' in navigator`) |

Ambos botones aparecen juntos en la pantalla de cada ticket — no es necesario
elegir uno solo para todo el sistema. Alguien que ya tiene RawBT configurado
puede seguir usándolo; alguien con Chrome en una compu de escritorio puede
usar el directo sin instalar nada.

## Cómo funciona el Bluetooth directo (sin RawBT)

### 1. Conexión vía Web Bluetooth

El navegador usa la [Web Bluetooth
API](https://developer.chrome.com/docs/capabilities/bluetooth) para hablar
directo con la impresora por **BLE (Bluetooth Low Energy)**. Esto **no**
funciona con impresoras que solo tengan **Bluetooth clásico (perfil SPP)** —
es una limitación del navegador, no del código. Las impresoras térmicas clon
más comunes (tipo "POS80", las mismas que se venden para RawBT) sí exponen un
perfil BLE además del clásico, con uno de estos tres servicios GATT:

```
000018f0-0000-1000-8000-00805f9b34fb
0000ff00-0000-1000-8000-00805f9b34fb
49535343-fe7d-4ae5-8fa9-9fafd205e455   (UART genérico, común en clones)
```

Al conectar, el código busca en esos servicios la primera *characteristic*
que acepte escritura (`write` o `writeWithoutResponse`) — ahí es donde se
mandan los comandos ESC/POS crudos.

### 2. El payload (texto + logo) en ESC/POS

Es el mismo formato de bytes que ya se armaba para RawBT — no hay dos
implementaciones del ticket, solo dos formas de *mandarlo*:

- **Texto**: cada ticket arma su contenido como texto plano con ancho fijo
  (función `centrar`/`fila`/`linea` en `rawbt.js`), después se le sacan los
  acentos (ver más abajo) y se codifica a bytes.
- **Logo**: si la empresa tiene un logo propio configurado (no el genérico
  por defecto), se descarga, se rasteriza a blanco y negro puro, y se
  antepone como imagen ESC/POS (`GS v 0`) envuelta en comandos de
  centrado (`ESC a 1` / `ESC a 0`).
- Los bytes se mandan en **bloques de 20** a la characteristic — mandar todo
  de una vez corta la conexión en varias impresoras BLE clon.

### 3. Por qué se le sacan los acentos al texto

Muchas impresoras térmicas clon traen de fábrica la codepágina china
**GB18030** en vez de UTF-8 o Latin-1. Una tilde en UTF-8 ocupa 2 bytes, que
la impresora interpreta como un carácter chino de 2 bytes en vez de la letra
acentuada (ejemplo real: "Dirección" salía como "Direcci弱n"). En vez de
apostar a que la impresora soporte cambiar de codepágina (`ESC t n`, no
garantizado en todos los modelos), se usa `quitarTildes()` — saca los acentos
antes de mandar el texto, así se ve bien en cualquier impresora sin importar
su codepágina por defecto. Esto afecta tanto al Bluetooth directo como a
RawBT (comparten el mismo armado de texto).

### 4. Emparejamiento persistente (no vuelve a preguntar cada vez)

El permiso de Bluetooth que concede el selector nativo del navegador
(`requestDevice()`) lo recuerda **Chrome**, por origen, entre recargas de
página — es la función de *"persistent device permissions"* del navegador.
El sistema usa esto así:

1. En **Configuración → Impresora Bluetooth**, el botón "Conectar impresora"
   llama a `requestDevice()` (ahí sí aparece el selector nativo una vez), y
   guarda el `id` del dispositivo elegido en `localStorage`.
2. Cada vez que se imprime un ticket, el código llama a
   `navigator.bluetooth.getDevices()` — que devuelve los dispositivos que el
   navegador ya tiene permiso de usar — busca el `id` guardado, y conecta
   directo (`device.gatt.connect()`), **sin mostrar ningún selector**.
3. Si no hay nada guardado, o el navegador ya no reconoce ese `id` (permiso
   revocado, perfil de navegador distinto, etc.), el botón de imprimir tira
   un error pidiendo volver a configurarla en Configuración, en vez de
   interrumpir la venta con un selector inesperado.

**Importante:** esto se guarda en `localStorage`, es decir, **por
navegador/dispositivo**, no por el backend. Si el negocio vende desde dos
computadoras o celulares distintos, cada uno necesita configurar su propia
impresora una vez en Configuración — no hay forma de sincronizar el
emparejamiento Bluetooth entre dispositivos (es una restricción del propio
navegador, no del sistema).

## Dónde vive el código

| Archivo | Qué hace |
|---|---|
| `frontend/src/utils/rawbt.js` | Arma el texto del ticket (`centrar`/`fila`/`linea`), rasteriza el logo a ESC/POS (`generarRasterLogo`), saca tildes (`quitarTildes`), y la implementación RawBT (`imprimirConRawBTyLogo`). |
| `frontend/src/utils/webBluetoothPrinter.js` | Todo lo específico de Web Bluetooth: detectar la characteristic de escritura, emparejar y guardar el dispositivo (`emparejarImpresora`), reconectar en silencio (`imprimirConWebBluetooth`), olvidar el emparejamiento (`olvidarImpresoraGuardada`). |
| `frontend/src/pages/configuracion/Configuracion.jsx` | Panel "Impresora Bluetooth (este dispositivo)" para emparejar/olvidar. |
| `frontend/src/pages/ventas/VentaTicket.jsx`, `caja/TicketResumenCaja.jsx`, `cobros/TicketCobro.jsx`, `cuentas-pagar/TicketPago.jsx` | Los 4 tickets, cada uno con los tres botones de impresión (USB, RawBT, directo). |

## Diagnóstico rápido

- **No aparece el botón "Bluetooth (directo)"**: el navegador no soporta Web
  Bluetooth (Firefox, Safari, iOS en cualquier navegador). Usar RawBT en su
  lugar, o cambiar a Chrome/Edge.
- **"No hay ninguna impresora Bluetooth configurada en este dispositivo"**:
  falta ir a Configuración → Impresora Bluetooth → Conectar impresora, en
  ese mismo navegador.
- **"Este navegador ya no recuerda la impresora..."**: el permiso se
  revocó (se limpió el sitio, perfil de Chrome distinto, etc.) — hay que
  volver a conectarla en Configuración.
- **Imprime pero sin logo**: revisar que haya un logo propio subido en
  Configuración — el sistema nunca manda el logo genérico por defecto a la
  impresora térmica, solo un logo propio de la empresa.
- **Las tildes salen mal / caracteres raros**: no debería pasar — si pasa,
  revisar que `quitarTildes()` se esté aplicando antes de codificar el texto
  en ambos archivos (`rawbt.js` y `webBluetoothPrinter.js`).
- **Se conecta pero nunca imprime / se corta la conexión**: la impresora
  puede no tener ninguna characteristic BLE con permiso de escritura (es
  decir, solo tiene Bluetooth clásico/SPP) — en ese caso Web Bluetooth no
  puede usarla, hay que usar RawBT para esa impresora en particular.
