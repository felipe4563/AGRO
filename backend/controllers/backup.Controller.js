const fs   = require('fs');
const path = require('path');
const { generarBackup, listarBackups, BACKUP_DIR } = require('../services/backup.service');
const { mensajeSeguro } = require('../utils/errorHandler');

// Valida que el nombre sea exactamente del formato generado por el servicio
const FILENAME_RE = /^backup_\d{8}_\d{6}\.sql$/;

const listar = (_req, res) => {
  try {
    const backups = listarBackups();
    res.json({ data: backups });
  } catch (err) {
    res.status(500).json({ error: mensajeSeguro(err, 'Error al listar backups') });
  }
};

const generar = async (_req, res) => {
  try {
    const resultado = await generarBackup();
    res.json({ mensaje: 'Backup generado exitosamente', ...resultado });
  } catch (err) {
    res.status(500).json({ error: mensajeSeguro(err, 'Error al generar backup') });
  }
};

const descargar = (req, res) => {
  const { filename } = req.params;

  if (!FILENAME_RE.test(filename)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }

  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Backup no encontrado' });
  }

  res.download(filepath, filename);
};

const eliminar = (req, res) => {
  const { filename } = req.params;

  if (!FILENAME_RE.test(filename)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }

  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Backup no encontrado' });
  }

  fs.unlinkSync(filepath);
  res.json({ mensaje: 'Backup eliminado correctamente' });
};

module.exports = { listar, generar, descargar, eliminar };
