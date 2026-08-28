const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');
const { mensajeSeguro } = require('../utils/errorHandler');

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

module.exports = {
  obtener,
  actualizar,
  subirLogo,
  eliminarLogo,
};
