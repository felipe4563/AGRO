const db = require('../config/db');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { mensajeSeguro } = require('../utils/errorHandler');

const obtener = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT u.id_usuario, u.ci, u.nombre, u.apellido, u.correo, u.celular, u.foto,
              u.debe_cambiar_contrasena, r.nombre AS rol_nombre, s.nombre AS sucursal_nombre
       FROM usuario u
       LEFT JOIN rol r ON r.id_rol = u.id_rol
       LEFT JOIN sucursal s ON s.id_sucursal = u.id_sucursal
       WHERE u.id_usuario = ?`,
      [req.user.id_usuario]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[perfil.obtener]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al obtener el perfil') });
  }
};

const cambiarPassword = async (req, res) => {
  const { contrasena_actual, nueva_contrasena } = req.body ?? {};
  if (!contrasena_actual || !nueva_contrasena) {
    return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son obligatorias' });
  }
  if (String(nueva_contrasena).trim().length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const [rows] = await db.promise().query('SELECT contrasena FROM usuario WHERE id_usuario = ?', [req.user.id_usuario]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const coincide = await bcrypt.compare(String(contrasena_actual), rows[0].contrasena ?? '');
    if (!coincide) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(String(nueva_contrasena), 10);
    await db.promise().query(
      'UPDATE usuario SET contrasena = ?, debe_cambiar_contrasena = 0 WHERE id_usuario = ?',
      [hash, req.user.id_usuario]
    );
    return res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('[perfil.cambiarPassword]', err);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al cambiar la contraseña') });
  }
};

const subirFoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  try {
    const [rows] = await db.promise().query('SELECT foto FROM usuario WHERE id_usuario = ?', [req.user.id_usuario]);
    const fotoAnterior = rows[0]?.foto;

    await db.promise().query('UPDATE usuario SET foto = ? WHERE id_usuario = ?', [req.file.filename, req.user.id_usuario]);

    if (fotoAnterior) {
      const rutaAnterior = path.join(__dirname, '..', 'uploads', fotoAnterior);
      if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
    }

    return res.json({ mensaje: 'Foto actualizada', foto: req.file.filename });
  } catch (err) {
    console.error('[perfil.subirFoto]', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: mensajeSeguro(err, 'Error al subir la foto') });
  }
};

module.exports = { obtener, cambiarPassword, subirFoto };
