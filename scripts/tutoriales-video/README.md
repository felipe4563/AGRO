# Videos tutoriales de SIS-AGRO

Herramientas para grabar los video tutoriales del panel de SIS-AGRO. Cada
video recorre un módulo:

- Un navegador automático (Playwright) hace clic en el sistema real.
- Una voz de Windows explica cada paso.
- Un círculo naranja muestra dónde se hace clic, y un marco naranja resalta
  lo que se está explicando.

Los videos no tienen subtítulos.

Los videos terminados quedan en `C:\Users\<usuario>\Videos\Tutoriales SIS-AGRO\`.

| Guion | Video | Módulo |
|---|---|---|
| `guiones/01-introduccion.cjs` | `01-introduccion.mp4` | Entrar, Dashboard, modo oscuro, perfil |
| `guiones/02-operacion.cjs` | `02-operacion.mp4` | Ventas (POS), Cuentas por Cobrar/Pagar, Caja, Libro de Caja |
| `guiones/03-inventario.cjs` | `03-inventario.mp4` | Productos, Catálogos, Almacén, Compras, Combos, Promociones |
| `guiones/04-terceros.cjs` | `04-terceros.mp4` | Clientes, Proveedores, Fidelización |
| `guiones/05-reportes.cjs` | `05-reportes.mp4` | Centro de Reportes (Dashboard, Ganancias, Ventas, Compras, Inventario, Sucursales, Caja) |
| `guiones/06-administracion.cjs` | `06-administracion.mp4` | Sucursales, Usuarios, Roles y Permisos, Configuración |

---

## Cómo funciona

```
guion (pasos: texto + acción)
   │
   ├─► voz.ps1 ──► un .wav por cada texto (voz «Helena», en caché en voces/)
   │
   └─► motor.cjs
         1. Abre el panel en Chromium (1280×720) con una sesión del admin, grabando video.
         2. Muestra una portada con el título del módulo.
         3. Por cada paso: primero hace la acción (clic, escritura, marco,
            navegar) en silencio y, recién cuando termina, anota el segundo
            exacto y empieza a sonar su audio.
         4. Arma una pista de audio con cada .wav en su segundo.
         5. ffmpeg une el video (.webm) con el audio ──► .mp4 (H.264 + AAC)
```

La acción de cada paso siempre termina ANTES de que arranque su narración.
Así, cuando la voz empieza a hablar, la pantalla ya muestra exactamente lo
que describe — nunca al revés. Si la narración dura más que la acción (lo
normal), el resto del tiempo la pantalla queda quieta mostrando el resultado
mientras termina de sonar la voz.

### Archivos

| Archivo | Qué hace |
|---|---|
| `motor.cjs` | El motor: grabación, portada, cursor, marcos, sincronía con la voz y mezcla final. |
| `grabar.cjs` | Punto de entrada: `node grabar.cjs <guion> [ensayo]`. |
| `voz.ps1` | Genera los `.wav` con la voz de Windows (22050 Hz, mono). |
| `sesion.cjs` | Hace login contra la API real (admin de prueba) y devuelve `{ token, usuario }`. |
| `guiones/*.cjs` | Un archivo por video: título y lista de pasos. |
| `ajustes-demo.sql` | Limpia datos de prueba sueltos y agrega datos de demo realistas, solo para grabar. |
| `respaldar.sh` | Vuelca la base local (`bd_agropecuaria`) a `respaldo/`. |
| `preparar.sh` | Restaura el respaldo y aplica `ajustes-demo.sql`. |
| `restaurar.sh` | Deja la base local exactamente como en el respaldo (sin los ajustes ni lo grabado). |

Las carpetas `respaldo/`, `voces/`, `videos-tmp/` y `ensayo/` se generan al usar
las herramientas y están en `.gitignore`.

---

## Requisitos

- **Sistema encendido en local:** backend en `:3001` y frontend en `:5173`
  (ver `backend/.env` / `frontend/.env` — el puerto 3001 es porque el 3000 lo
  usa Docker en esta máquina para otro proyecto; en otra máquina puede ser
  3000 sin problema, solo hay que ajustar `BASE_URL`/`TUTORIAL_API_URL`).
- **MySQL local** con la base `bd_agropecuaria`.
- **Playwright:** se instala dentro de esta carpeta (`npm install` acá, no en
  `frontend/` ni `backend/`).
- **ffmpeg y ffprobe** en el PATH.
- **Voz en español de Windows:** «Microsoft Helena Desktop» (es-ES).

---

## Paso a paso para grabar o regrabar un video

```bash
cd scripts/tutoriales-video
npm install
npx playwright install chromium   # una sola vez

# 0. Solo la primera vez (o si la base cambió mucho): respaldar la base local.
sh respaldar.sh

# 1. Dejar la base lista. Hay que hacerlo antes de CADA ensayo o grabación,
#    porque grabar crea ventas, movimientos, etc.
sh preparar.sh

# 2. Ensayo: no graba video; saca una captura por paso en ensayo/.
node grabar.cjs 02-operacion ensayo
# revisar ensayo/02-operacion--01.png, --02.png, …

# 3. Si el ensayo se ve bien: preparar de nuevo y grabar de verdad.
sh preparar.sh
node grabar.cjs 02-operacion     # → .../Videos/Tutoriales SIS-AGRO/02-operacion.mp4

# 4. Al terminar todo: devolver la base local a su estado original.
sh restaurar.sh
```

### Ajustes de datos para la grabación (`ajustes-demo.sql`)

La base de desarrollo tiene de arrastre registros de prueba creados al
probar funciones durante el desarrollo (nombres como "b", "c",
"CLI_EDITADO"). En vez de ocultarlos, `preparar.sh` los recicla — les da un
nombre real y los deja activos — porque algunos ya están enganchados a
historial real (ventas, lotes) que no se puede borrar sin perder ese
historial. Los que de verdad no se usan (cuentas de prueba, duplicados sin
historial) se borran. También: se quita la foto de prueba del admin, se deja
el logo del sistema por defecto (los logos subidos en `uploads/` son de
pruebas de otros negocios), se agregan unos productos más para que el
catálogo no se vea vacío, y se abre un turno de caja para poder grabar una
venta.

`restaurar.sh` deja todo exactamente como estaba antes de tocar nada.

---

## Cómo escribir un guion

```js
module.exports = {
  archivo: '02-operacion',           // nombre del .mp4
  modulo: 'Tutorial 2',              // texto pequeño de la portada
  titulo: 'Operación diaria',        // título de la portada
  subtitulo: 'Vender, cobrar…',      // línea bajo el título
  inicio: '/ventas/nueva',           // ruta donde arranca
  // sinSesion: true,                // solo el video 1: empieza en /login sin sesión
  // mostrarBannerPwa: true,         // solo el video 1: no oculta el aviso de instalar como app
  pasos: [
    { v: 'Texto que dice la voz durante la portada.' },
    {
      v: 'Presiona Nueva Venta.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: 'Nueva Venta' })),
    },
  ],
};
```

- `v`: lo que dice la voz. El paso dura lo que dure este audio.
- `a`: la acción. Es opcional; sin ella, el paso solo narra sobre la pantalla actual.
- `pausa`: milisegundos extra al final del paso. Es opcional y vale 450 por defecto.

### Ayudas disponibles en `h`

| Ayuda | Qué hace |
|---|---|
| `h.p` | La página de Playwright, para escribir los localizadores. |
| `h.ir(ruta)` | Navega a una ruta del panel (recarga completa, con la sesión ya inyectada). |
| `h.clic(loc, espera)` | Mueve el cursor naranja, muestra la onda del clic y hace clic. Si recibe un texto, busca un botón con ese nombre. |
| `h.escribir(loc, texto)` | Hace clic en el campo y escribe letra por letra. |
| `h.elegir(loc, valor)` | Elige una opción de un `<select>` (ver `locator.selectOption` de Playwright). |
| `h.marcar(loc)` | Enmarca un elemento en naranja, sin hacer clic. Espera a que el elemento exista. El marco queda visible mientras dure la narración del paso; el motor lo quita solo al terminar. |
| `h.desmarcar()` | Quita el marco antes de tiempo (el motor ya lo llama automáticamente al final de cada paso). |
| `h.scroll(px)` | Desplaza la página; con números negativos, hacia arriba. |
| `h.simularClic(loc)` | Muestra el clic sin hacerlo; se usa en el login (video 1). |
| `h.ingresar(ruta)` | Inyecta la sesión real y navega; se usa en el login después de simular el tipeo. |

### Consejos aprendidos

- **Tablas con vista móvil y de escritorio:** varias pantallas (Productos,
  Catálogos, Almacén) renderizan una versión para celular Y una de
  escritorio al mismo tiempo (una queda oculta por CSS, no se saca del DOM).
  Un `getByRole('heading', …)` sobre el nombre de un producto puede
  encontrar las dos. Usar `getByRole('row', …)` en vez de encadenar
  `.locator('xpath=..')` desde un texto — las filas de tabla (`<tr>`) solo
  existen en la versión de escritorio.
- **Nombres de botón que chocan con el menú lateral:** los grupos del menú
  (Operación, Inventario, Terceros, Reportes, Administración) son botones
  reales. Si una pantalla tiene una pestaña con el mismo nombre (por
  ejemplo, "Inventario" en Reportes), hay que acotar la búsqueda con
  `h.p.getByRole('main').getByRole('button', { name: … })`.
- **`marcar()` necesita esperar:** a diferencia de un clic, leer la posición
  de un elemento no espera solo a que termine de cargar un dato que viene de
  la API. `marcar()` ya espera a que el elemento esté visible antes de
  medirlo.
- **La acción siempre va antes que la voz:** el motor ejecuta `a` completo
  (incluida la navegación o la espera de `marcar()`) y recién después empieza
  el audio del paso. Antes era al revés y, si la acción tardaba, la voz
  describía una pantalla que todavía no había cambiado. Por eso `marcar()`
  ya no recibe un tiempo manual (`ms`): el resaltado dura exactamente lo que
  dura la narración del paso.
- **Contraseña real:** el video 1 escribe una contraseña de ejemplo y luego
  entra con la sesión real inyectada (`h.ingresar`). Nunca se usa ni se
  muestra la contraseña real.
- **Confirmaciones del navegador:** el motor acepta los `confirm()` del
  navegador, 1,2 segundos después de que aparecen.

---

## Cambiar la voz o el estilo

- **Velocidad de la voz:** `$synth.Rate` en `voz.ps1`, de −10 (lento) a 10
  (rápido). Los audios se guardan en caché por texto, así que hay que borrar
  `voces/` para regenerarlos.
- **Resolución:** `ANCHO` y `ALTO` en `motor.cjs` (1280×720).
- **Calidad del MP4:** `-crf 20` en `motor.cjs`; un número más bajo da mejor
  calidad y archivos más pesados.
- **Carpeta de salida:** `CARPETA_SALIDA` en `motor.cjs`.
