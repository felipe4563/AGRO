const { exec }   = require('child_process');
const path        = require('path');
const fs          = require('fs');
const os          = require('os');
const cron        = require('node-cron');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function generarNombreArchivo() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fecha = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const hora  = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `backup_${fecha}_${hora}.sql`;
}

function generarBackup() {
  return new Promise((resolve, reject) => {
    const filename = generarNombreArchivo();
    const filepath = path.join(BACKUP_DIR, filename);

    const {
      DB_HOST     = '127.0.0.1',
      DB_USER     = 'root',
      DB_PASSWORD = '',
      DB_NAME,
      DB_PORT     = '3306',
    } = process.env;

    // Write temp cnf to avoid password exposure in process list
    const cnfContent = [
      '[client]',
      `host=${DB_HOST}`,
      `port=${DB_PORT}`,
      `user=${DB_USER}`,
      `password=${DB_PASSWORD}`,
    ].join('\n');

    const cnfPath = path.join(os.tmpdir(), `sisagro_backup_${Date.now()}.cnf`);
    fs.writeFileSync(cnfPath, cnfContent, { mode: 0o600 });

    const outPath  = filepath.replace(/\\/g, '/');
    const cnfEsc   = cnfPath.replace(/\\/g, '/');
    const cmd      = `mysqldump --defaults-extra-file="${cnfEsc}" --single-transaction --routines --triggers "${DB_NAME}" > "${outPath}"`;

    exec(cmd, { shell: true }, (error, _stdout, stderr) => {
      try { fs.unlinkSync(cnfPath); } catch { /* ignore */ }

      if (error) {
        try { fs.unlinkSync(filepath); } catch { /* ignore */ }
        return reject(new Error(stderr || error.message));
      }

      // mysqldump may exit 0 but write an empty file on auth error
      const stats = fs.statSync(filepath);
      if (stats.size === 0) {
        try { fs.unlinkSync(filepath); } catch { /* ignore */ }
        return reject(new Error('El archivo de backup está vacío. Verifica credenciales de BD.'));
      }

      resolve({ filename, size: stats.size, sizeFormato: formatBytes(stats.size), fecha: stats.mtime });
    });
  });
}

function listarBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql'))
    .map(f => {
      const filepath = path.join(BACKUP_DIR, f);
      const stats    = fs.statSync(filepath);
      return {
        nombre:      f,
        size:        stats.size,
        sizeFormato: formatBytes(stats.size),
        fecha:       stats.mtime,
      };
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function eliminarBackupsAntiguos(limite = 30) {
  const backups = listarBackups();
  backups.slice(limite).forEach(b => {
    try { fs.unlinkSync(path.join(BACKUP_DIR, b.nombre)); } catch { /* ignore */ }
  });
}

function iniciarScheduler() {
  // Daily at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[Backup] Iniciando backup automático diario...');
    try {
      const resultado = await generarBackup();
      eliminarBackupsAntiguos(30);
      console.log(`[Backup] ✅ Completado: ${resultado.filename} (${resultado.sizeFormato})`);
    } catch (err) {
      console.error('[Backup] ❌ Error en backup automático:', err.message);
    }
  }, { timezone: 'America/La_Paz' });

  console.log('[Backup] ⏰ Scheduler iniciado — backup diario a las 02:00 (America/La_Paz)');
}

module.exports = { generarBackup, listarBackups, eliminarBackupsAntiguos, iniciarScheduler, BACKUP_DIR };
