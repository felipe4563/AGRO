const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');
const Jimp = require('jimp');
const { mensajeSeguro } = require('../utils/errorHandler');

const LOGO_DEFAULT_PATH = path.join(__dirname, '..', 'assets', 'logo-default.png');

async function obtenerRutaLogoActual() {
  const [rows] = await db.promise().query(
    'SELECT logo FROM configuracion_negocio WHERE id_config = 1'
  );
  const logo = rows[0]?.logo;
  if (logo) {
    const ruta = path.join(__dirname, '..', 'uploads', logo);
    if (fs.existsSync(ruta)) return ruta;
  }
  return LOGO_DEFAULT_PATH;
}

// Genera un ícono cuadrado (fondo blanco, logo centrado) a partir del logo
// configurado — así el ícono de la PWA instalada siempre refleja el logo
// que suba el negocio desde Configuración, sin depender de archivos fijos
// generados en el build del frontend.
async function generarIconoCuadrado(rutaLogo, size, { maskable = false } = {}) {
  const logo = await Jimp.read(rutaLogo);
  const lienzo = new Jimp(size, size, 0xffffffff);
  const margen = maskable ? Math.round(size * 0.15) : Math.round(size * 0.06);
  const disponible = size - margen * 2;
  const copia = logo.clone().contain(disponible, disponible);
  const x = Math.round((size - copia.bitmap.width) / 2);
  const y = Math.round((size - copia.bitmap.height) / 2);
  lienzo.composite(copia, x, y);
  return lienzo.getBufferAsync(Jimp.MIME_PNG);
}

// Público: lo consume tanto el Login (sin sesión) como el sidebar/ticket ya autenticados.
const obtener = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT nombre_empresa, nit, direccion, ciudad, telefono, correo, logo FROM configuracion_negocio WHERE id_config = 1'
    );
    if (rows.length === 0) {
      return res.json({ nombre_empresa: 'SIS-AGRO', nit: null, direccion: null, ciudad: null, telefono: null, correo: null, logo: null });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('[configuracion.obtener]', err);
    return res.status(500).json({ error: 'Error al obtener la configuración' });
  }
};

const actualizar = async (req, res) => {
  const { nombre_empresa, nit, direccion, ciudad, telefono, correo } = req.body ?? {};
  if (!nombre_empresa || !nombre_empresa.trim()) {
    return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
  }
  try {
    await db.promise().query(
      `UPDATE configuracion_negocio
       SET nombre_empresa = ?, nit = ?, direccion = ?, ciudad = ?, telefono = ?, correo = ?
       WHERE id_config = 1`,
      [
        nombre_empresa.trim(),
        nit?.trim() || null,
        direccion?.trim() || null,
        ciudad?.trim() || null,
        telefono?.trim() || null,
        correo?.trim() || null,
      ]
    );
    return res.json({ mensaje: 'Configuración actualizada' });
  } catch (err) {
    console.error('[configuracion.actualizar]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al actualizar la configuración') });
  }
};

const subirLogo = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

  try {
    const [rows] = await db.promise().query(
      'SELECT logo FROM configuracion_negocio WHERE id_config = 1'
    );
    const logoAnterior = rows[0]?.logo;

    await db.promise().query(
      'UPDATE configuracion_negocio SET logo = ? WHERE id_config = 1',
      [req.file.filename]
    );

    if (logoAnterior) {
      const rutaAnterior = path.join(__dirname, '..', 'uploads', logoAnterior);
      if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
    }

    return res.json({ mensaje: 'Logo actualizado', logo: req.file.filename });
  } catch (err) {
    console.error('[configuracion.subirLogo]', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: 'Error al subir el logo' });
  }
};

const eliminarLogo = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT logo FROM configuracion_negocio WHERE id_config = 1'
    );
    const logo = rows[0]?.logo;
    await db.promise().query('UPDATE configuracion_negocio SET logo = NULL WHERE id_config = 1');

    if (logo) {
      const ruta = path.join(__dirname, '..', 'uploads', logo);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    return res.json({ mensaje: 'Logo eliminado' });
  } catch (err) {
    console.error('[configuracion.eliminarLogo]', err);
    return res.status(500).json({ error: 'Error al eliminar el logo' });
  }
};

// Público: el manifest de la PWA se pide sin sesión al momento de instalar.
// Los íconos apuntan siempre a /pwa/icono/:size de este mismo backend (nunca
// a archivos estáticos del frontend), así el ícono instalado refleja el logo
// subido en Configuración incluso si cambia después de la instalación inicial.
const obtenerManifestPWA = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT nombre_empresa FROM configuracion_negocio WHERE id_config = 1'
    );
    const nombreEmpresa = rows[0]?.nombre_empresa || 'SIS-AGRO';

    res.set('Content-Type', 'application/manifest+json');
    return res.json({
      name: nombreEmpresa,
      short_name: nombreEmpresa.length > 12 ? 'SIS AGRO' : nombreEmpresa,
      description: 'Sistema de gestión agropecuaria: ventas, compras, inventario y reportes.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#f4f4f5',
      theme_color: '#10b981',
      icons: [
        { src: 'pwa/icono/192', sizes: '192x192', type: 'image/png' },
        { src: 'pwa/icono/512', sizes: '512x512', type: 'image/png' },
        { src: 'pwa/icono/512?maskable=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    });
  } catch (err) {
    console.error('[configuracion.obtenerManifestPWA]', err);
    return res.status(500).json({ error: 'Error al generar el manifest' });
  }
};

const obtenerIconoPWA = async (req, res) => {
  const size = parseInt(req.params.size, 10);
  if (![180, 192, 512].includes(size)) {
    return res.status(400).json({ error: 'Tamaño de ícono no soportado' });
  }
  try {
    const rutaLogo = await obtenerRutaLogoActual();
    const buffer = await generarIconoCuadrado(rutaLogo, size, { maskable: req.query.maskable === '1' });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache'); // el logo puede cambiar en Configuración
    return res.send(buffer);
  } catch (err) {
    console.error('[configuracion.obtenerIconoPWA]', err);
    return res.status(500).json({ error: 'Error al generar el ícono' });
  }
};

module.exports = {
  obtener,
  actualizar,
  subirLogo,
  eliminarLogo,
  obtenerManifestPWA,
  obtenerIconoPWA,
};
