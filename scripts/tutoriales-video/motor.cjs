// Motor de grabación de los video tutoriales de SIS-AGRO.
//
//   guion (pasos: texto + acción)
//      │
//      ├─► voz.ps1 ──► un .wav por cada texto (voz «Helena», en caché en voces/)
//      │
//      └─► motor.cjs
//            1. Abre el panel en Chromium (1280×720) con una sesión del admin, grabando video.
//            2. Muestra una portada con el título del módulo.
//            3. Por cada paso: anota el segundo exacto en que empieza, hace la acción
//               (clics, escritura, marcos) y espera lo que dure su audio.
//            4. Arma una pista de audio con cada .wav en su segundo.
//            5. ffmpeg une el video (.webm) con el audio ──► .mp4 (H.264 + AAC)
//
// Cada paso se graba a la par que su narración, así la voz siempre coincide
// con lo que se ve. Si una acción tarda más que el audio, el motor espera a
// que termine antes de pasar al siguiente paso.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { obtenerSesion } = require('./sesion.cjs');

const ANCHO = 1280;
const ALTO = 720;
const BASE_URL = 'http://localhost:5173';
const CARPETA_VOCES = path.join(__dirname, 'voces');
const CARPETA_VIDEOS_TMP = path.join(__dirname, 'videos-tmp');
const CARPETA_ENSAYO = path.join(__dirname, 'ensayo');
const CARPETA_SALIDA = path.join(os.homedir(), 'Videos', 'Tutoriales SIS-AGRO');
const PAUSA_DEFECTO_MS = 450;
const SAMPLE_RATE = 22050;

for (const carpeta of [CARPETA_VOCES, CARPETA_VIDEOS_TMP]) {
  fs.mkdirSync(carpeta, { recursive: true });
}

// ─── Voz (TTS con caché por texto) ──────────────────────────────────────────
function rutaWav(texto) {
  const hash = crypto.createHash('sha1').update(texto).digest('hex').slice(0, 16);
  return path.join(CARPETA_VOCES, `${hash}.wav`);
}

function generarWav(texto) {
  const salida = rutaWav(texto);
  if (fs.existsSync(salida)) return salida;
  execFileSync('powershell', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(__dirname, 'voz.ps1'),
    '-Texto', texto,
    '-Salida', salida,
  ]);
  return salida;
}

// Duración de un wav PCM 16 bits mono a partir de su tamaño de archivo (el
// header RIFF de voz.ps1 siempre es de 44 bytes, formato fijo).
function duracionWavMs(rutaArchivo) {
  const bytes = fs.statSync(rutaArchivo).size - 44;
  const muestras = Math.max(0, bytes / 2); // 16 bits = 2 bytes por muestra
  return (muestras / SAMPLE_RATE) * 1000;
}

function leerPcm(rutaArchivo) {
  const buf = fs.readFileSync(rutaArchivo);
  return buf.subarray(44); // sin el header RIFF de 44 bytes
}

function escribirWav(rutaArchivo, pcm) {
  const header = Buffer.alloc(44);
  const bytesPorMuestra = 2;
  const byteRate = SAMPLE_RATE * bytesPorMuestra;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);           // PCM
  header.writeUInt16LE(1, 22);           // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(bytesPorMuestra, 32);
  header.writeUInt16LE(16, 34);          // bits por muestra
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(rutaArchivo, Buffer.concat([header, pcm]));
}

// ─── Overlays visuales inyectados en cada documento de la página ───────────
const SCRIPT_OVERLAYS = `
(function () {
  function crear() {
    if (document.getElementById('tut-cursor')) return;
    var estilo = document.createElement('style');
    estilo.textContent = [
      '#tut-cursor{position:fixed;width:18px;height:18px;border-radius:50%;',
      'background:#f59e0b;border:2px solid #fff;box-shadow:0 0 10px rgba(245,158,11,.9);',
      'left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483000;',
      'pointer-events:none;transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1);}',
      '#tut-ripple{position:fixed;width:18px;height:18px;border-radius:50%;',
      'left:50%;top:50%;transform:translate(-50%,-50%);border:3px solid #f59e0b;',
      'z-index:2147483000;pointer-events:none;opacity:0;}',
      '#tut-ripple.activo{animation:tut-ripple-anim .55s ease-out;}',
      '@keyframes tut-ripple-anim{0%{opacity:.9;width:18px;height:18px;}',
      '100%{opacity:0;width:60px;height:60px;}}',
      '#tut-marco{position:fixed;border:3px solid #f59e0b;border-radius:10px;',
      'box-shadow:0 0 0 4000px rgba(0,0,0,.45);z-index:2147482999;pointer-events:none;',
      'display:none;transition:all .3s ease;}',
      '#tut-portada{position:fixed;inset:0;z-index:2147483647;background:#18181b;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;}',
      '#tut-portada .mod{color:#facc15;font-size:14px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:14px;}',
      '#tut-portada .tit{font-size:44px;font-weight:900;margin-bottom:10px;}',
      '#tut-portada .sub{color:#a1a1aa;font-size:18px;max-width:640px;}',
    ].join('');
    document.head.appendChild(estilo);
    var cursor = document.createElement('div'); cursor.id = 'tut-cursor';
    var ripple = document.createElement('div'); ripple.id = 'tut-ripple';
    var marco  = document.createElement('div'); marco.id  = 'tut-marco';
    document.body.appendChild(cursor);
    document.body.appendChild(ripple);
    document.body.appendChild(marco);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', crear);
  } else {
    crear();
  }
})();
`;

// ocultarBannerPwa: casi todos los videos lo ocultan para no distraer del
// contenido real; el video 1 (introducción) lo deja en false a propósito,
// porque ahí sí lo narra.
function scriptAuth(token, usuario, ocultarBannerPwa) {
  return `
    try {
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('usuario', ${JSON.stringify(JSON.stringify(usuario))});
      ${ocultarBannerPwa ? "localStorage.setItem('pwa_banner_cerrado', '1');" : ''}
    } catch (e) {}
  `;
}

// ─── Motor ──────────────────────────────────────────────────────────────────
async function grabar(guion, { ensayo = false } = {}) {
  const tiempoInicioProceso = Date.now();
  const browser = await chromium.launch();

  const opcionesContexto = {
    viewport: { width: ANCHO, height: ALTO },
  };
  if (!ensayo) {
    opcionesContexto.recordVideo = { dir: CARPETA_VIDEOS_TMP, size: { width: ANCHO, height: ALTO } };
  }
  const contexto = await browser.newContext(opcionesContexto);
  await contexto.addInitScript(SCRIPT_OVERLAYS);

  if (!guion.sinSesion) {
    const { token, usuario } = await obtenerSesion();
    await contexto.addInitScript(scriptAuth(token, usuario, !guion.mostrarBannerPwa));
  }

  const pagina = await contexto.newPage();
  pagina.on('dialog', async (dialog) => {
    await new Promise((r) => setTimeout(r, 1200));
    await dialog.accept();
  });

  let marcoActivo = false;
  let portadaVisible = false;
  let pasoActual = 0;
  const pistaAudio = []; // { offsetMs, rutaWav }
  const tiempoInicioVideo = Date.now();

  // ── Ayudas disponibles para los guiones (objeto `h`) ──────────────────────
  const h = {
    p: pagina,

    async ir(ruta) {
      await pagina.goto(BASE_URL + ruta, { waitUntil: 'load' });
    },

    async _moverCursor(loc) {
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      const caja = await loc.boundingBox();
      if (!caja) return null;
      const x = caja.x + caja.width / 2;
      const y = caja.y + caja.height / 2;
      await pagina.evaluate(({ x, y }) => {
        const c = document.getElementById('tut-cursor');
        if (c) { c.style.left = x + 'px'; c.style.top = y + 'px'; }
      }, { x, y });
      await pagina.waitForTimeout(460);
      return { x, y };
    },

    async _ripple() {
      await pagina.evaluate(() => {
        const r = document.getElementById('tut-ripple');
        if (!r) return;
        r.classList.remove('activo');
        void r.offsetWidth; // reinicia la animación
        r.classList.add('activo');
      });
      await pagina.waitForTimeout(250);
    },

    async clic(loc, espera) {
      if (typeof loc === 'string') loc = pagina.getByRole('button', { name: loc });
      await h._moverCursor(loc);
      await h._ripple();
      await loc.click();
      if (espera) await pagina.waitForTimeout(espera);
    },

    async simularClic(loc) {
      if (typeof loc === 'string') loc = pagina.getByRole('button', { name: loc });
      await h._moverCursor(loc);
      await h._ripple();
    },

    async escribir(loc, texto) {
      await h._moverCursor(loc);
      await loc.click();
      await loc.pressSequentially(texto, { delay: 55 });
    },

    async elegir(loc, valor) {
      await h._moverCursor(loc);
      await loc.selectOption(valor);
    },

    async marcar(loc) {
      // Espera explícita: a diferencia de un clic, boundingBox() no espera
      // solo por sí mismo a que el contenido cargado por API aparezca.
      await loc.waitFor({ state: 'visible', timeout: 8000 }).catch((e) => console.warn(`[motor] marcar() waitFor falló (paso ${pasoActual + 1}):`, e.message));
      const caja = await loc.boundingBox().catch((e) => { console.warn(`[motor] marcar() boundingBox falló (paso ${pasoActual + 1}):`, e.message); return null; });
      if (!caja) { console.warn(`[motor] marcar(): elemento no encontrado (paso ${pasoActual + 1})`); return; }
      await pagina.evaluate(({ x, y, w, h: alto }) => {
        const m = document.getElementById('tut-marco');
        if (!m) return;
        m.style.left = (x - 6) + 'px';
        m.style.top = (y - 6) + 'px';
        m.style.width = (w + 12) + 'px';
        m.style.height = (alto + 12) + 'px';
        m.style.display = 'block';
      }, { x: caja.x, y: caja.y, w: caja.width, h: caja.height });
      marcoActivo = true;
      // El marco queda visible hasta que el bucle de pasos lo oculte, al
      // terminar de sonar la narración de este paso — así el resaltado dura
      // exactamente lo que dura la voz, en vez de un tiempo adivinado.
    },

    async desmarcar() {
      if (!marcoActivo) return;
      await pagina.evaluate(() => {
        const m = document.getElementById('tut-marco');
        if (m) m.style.display = 'none';
      });
      marcoActivo = false;
    },

    async scroll(px) {
      await pagina.mouse.wheel(0, px);
      await pagina.waitForTimeout(350);
    },

    async ingresar(ruta) {
      const { token, usuario } = await obtenerSesion();
      await contexto.addInitScript(scriptAuth(token, usuario, !guion.mostrarBannerPwa));
      await pagina.goto(BASE_URL + ruta, { waitUntil: 'load' });
    },
  };

  // ── Portada ────────────────────────────────────────────────────────────
  async function mostrarPortada() {
    await pagina.evaluate(({ modulo, titulo, subtitulo }) => {
      let p = document.getElementById('tut-portada');
      if (!p) {
        p = document.createElement('div');
        p.id = 'tut-portada';
        p.innerHTML =
          '<div class="mod"></div><div class="tit"></div><div class="sub"></div>';
        document.body.appendChild(p);
      }
      p.querySelector('.mod').textContent = modulo || '';
      p.querySelector('.tit').textContent = titulo || '';
      p.querySelector('.sub').textContent = subtitulo || '';
      p.style.display = 'flex';
    }, { modulo: guion.modulo, titulo: guion.titulo, subtitulo: guion.subtitulo });
    portadaVisible = true;
  }

  async function ocultarPortada() {
    if (!portadaVisible) return;
    await pagina.evaluate(() => {
      const p = document.getElementById('tut-portada');
      if (p) p.style.display = 'none';
    }).catch(() => {});
    portadaVisible = false;
  }

  // ── Arranque: ruta inicial + portada ──────────────────────────────────
  await pagina.goto(BASE_URL + guion.inicio, { waitUntil: 'load' });
  await mostrarPortada();

  // ── Bucle de pasos ─────────────────────────────────────────────────────
  // La acción de cada paso corre primero, en silencio, y recién cuando
  // termina empieza a sonar su narración. Antes la voz arrancaba a la vez
  // que la acción, y si la acción tardaba (navegar a otra pantalla, esperar
  // un dato que viene de la API), la narración describía algo que todavía
  // no estaba en pantalla. Así, la voz siempre describe lo que ya se ve.
  for (let i = 0; i < guion.pasos.length; i++) {
    pasoActual = i;
    const paso = guion.pasos[i];
    const wav = generarWav(paso.v);
    const duracionMs = duracionWavMs(wav);

    if (paso.a && portadaVisible) await ocultarPortada();
    if (paso.a) await paso.a(h);

    const offsetMs = Date.now() - tiempoInicioVideo;
    if (!ensayo) pistaAudio.push({ offsetMs, rutaWav: wav });

    await pagina.waitForTimeout(duracionMs);

    if (ensayo) {
      const numero = String(i + 1).padStart(2, '0');
      await pagina.screenshot({
        path: path.join(CARPETA_ENSAYO, `${guion.archivo}--${numero}.png`),
      });
    }

    await h.desmarcar();
    await pagina.waitForTimeout(paso.pausa ?? PAUSA_DEFECTO_MS);
  }

  await pagina.waitForTimeout(600);
  const video = pagina.video();
  await contexto.close();
  await browser.close();

  if (ensayo) {
    console.log(`[motor] Ensayo listo: ${guion.pasos.length} capturas en ensayo/${guion.archivo}--NN.png`);
    return;
  }

  const rutaWebm = await video.path();
  await mezclarYExportar(guion, rutaWebm, pistaAudio);
  console.log(`[motor] Terminado en ${((Date.now() - tiempoInicioProceso) / 1000).toFixed(1)}s`);
}

// ─── Mezcla de audio + mux final con ffmpeg ────────────────────────────────
async function mezclarYExportar(guion, rutaWebm, pistaAudio) {
  const duracionVideoSeg = parseFloat(
    execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', rutaWebm,
    ]).toString().trim()
  );

  let totalMuestras = Math.ceil(duracionVideoSeg * SAMPLE_RATE);
  for (const { offsetMs, rutaWav } of pistaAudio) {
    const inicioMuestra = Math.round((offsetMs / 1000) * SAMPLE_RATE);
    const pcm = leerPcm(rutaWav);
    totalMuestras = Math.max(totalMuestras, inicioMuestra + pcm.length / 2);
  }

  const bufferFinal = Buffer.alloc(totalMuestras * 2); // silencio = ceros
  for (const { offsetMs, rutaWav } of pistaAudio) {
    const inicioMuestra = Math.round((offsetMs / 1000) * SAMPLE_RATE);
    const pcm = leerPcm(rutaWav);
    pcm.copy(bufferFinal, inicioMuestra * 2);
  }

  const rutaAudioFinal = path.join(CARPETA_VIDEOS_TMP, `${guion.archivo}-audio.wav`);
  escribirWav(rutaAudioFinal, bufferFinal);

  fs.mkdirSync(CARPETA_SALIDA, { recursive: true });
  const rutaSalida = path.join(CARPETA_SALIDA, `${guion.archivo}.mp4`);

  execFileSync('ffmpeg', [
    '-y',
    '-i', rutaWebm,
    '-i', rutaAudioFinal,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    rutaSalida,
  ], { stdio: 'inherit' });

  console.log(`[motor] Video exportado: ${rutaSalida}`);
}

module.exports = { grabar };
