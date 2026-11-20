const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Directorio con las migraciones numeradas (bd/0NN_*.sql). En Docker se monta
// como volumen (ver docker-compose.yml) porque la imagen del backend no
// incluye bd/; en desarrollo local cae directo al bd/ del repo, hermano de
// backend/.
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || path.join(__dirname, '..', '..', 'bd');

// Errores que solo pueden significar "esta migración ya se había aplicado a
// mano antes de que existiera este runner" — se registran como advertencia y
// se sigue con la siguiente sentencia del mismo archivo. Cualquier otro error
// es real y debe frenar el arranque del backend.
const ERRORES_YA_APLICADA = new Set([
  'ER_DUP_FIELDNAME',   // ADD COLUMN de una columna que ya existe
  'ER_DUP_KEYNAME',     // ADD KEY de un índice que ya existe
  'ER_DUP_ENTRY',       // INSERT de un permiso/rol_permiso que ya existe
  'ER_TABLE_EXISTS_ERROR', // CREATE TABLE de una tabla que ya existe
  'ER_CANT_DROP_FIELD_OR_KEY', // DROP COLUMN/KEY que ya no existe
  'ER_FK_DUP_NAME',     // ADD CONSTRAINT ... FOREIGN KEY de un nombre de FK que ya existe
  //                       (MySQL 8.0.16+ devuelve esto directo; versiones más
  //                       viejas lo envuelven en ER_CANT_CREATE_TABLE — ver
  //                       el chequeo por substring más abajo).
]);

// Separa un archivo .sql en sentencias individuales. Simple pero consciente
// de comillas simples/backticks, para no cortar un ';' que esté dentro de un
// string (ej. una descripción de permiso). Las migraciones de este proyecto
// no usan procedimientos/triggers (sin DELIMITER), así que no hace falta nada
// más sofisticado.
function dividirEnSentencias(sqlCompleto) {
  const sinComentarios = sqlCompleto
    .split('\n')
    .map((linea) => {
      const idx = linea.indexOf('--');
      return idx === -1 ? linea : linea.slice(0, idx);
    })
    .join('\n');

  const sentencias = [];
  let actual = '';
  let comilla = null; // "'" | '`' | null

  for (let i = 0; i < sinComentarios.length; i++) {
    const c = sinComentarios[i];
    actual += c;
    if (comilla) {
      if (c === comilla) comilla = null;
    } else if (c === "'" || c === '`') {
      comilla = c;
    } else if (c === ';') {
      const limpio = actual.slice(0, -1).trim();
      if (limpio) sentencias.push(limpio);
      actual = '';
    }
  }
  const resto = actual.trim();
  if (resto) sentencias.push(resto);
  return sentencias;
}

// ALTER TABLE reconstruye la tabla por dentro en MySQL, así que un nombre de
// índice/FK duplicado no sale como ER_DUP_KEYNAME sino envuelto en
// ER_CANT_CREATE_TABLE con el errno real (121: duplicate key/FK name) dentro
// del mensaje — por eso el chequeo por substring, además del set por código.
function esErrorYaAplicada(err) {
  if (ERRORES_YA_APLICADA.has(err.code)) return true;
  if (err.code === 'ER_CANT_CREATE_TABLE' && /errno:\s*121\b/.test(err.sqlMessage || err.message || '')) {
    return true;
  }
  return false;
}

async function runMigrations() {
  const conn = await db.promise().getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [aplicadasRows] = await conn.query('SELECT filename FROM schema_migrations');
    const aplicadas = new Set(aplicadasRows.map((r) => r.filename));

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.warn(`[migrate] No se encontró ${MIGRATIONS_DIR}; se omiten migraciones.`);
      return;
    }

    const archivos = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d{3}_.+\.sql$/.test(f) && f !== '000_base.sql')
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    let nuevasAplicadas = 0;
    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) continue;

      console.log(`[migrate] Aplicando ${archivo}...`);
      const contenido = fs.readFileSync(path.join(MIGRATIONS_DIR, archivo), 'utf8');
      const sentencias = dividirEnSentencias(contenido);

      for (const sentencia of sentencias) {
        try {
          await conn.query(sentencia);
        } catch (err) {
          if (esErrorYaAplicada(err)) {
            console.warn(`[migrate]   (ya aplicada) ${err.code} en: ${sentencia.slice(0, 80)}...`);
            continue;
          }
          throw new Error(`Falló ${archivo}: ${err.message}\nSentencia: ${sentencia.slice(0, 200)}`);
        }
      }

      await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [archivo]);
      nuevasAplicadas++;
      console.log(`[migrate] ${archivo} OK`);
    }

    console.log(`[migrate] Listo: ${nuevasAplicadas} migración(es) nueva(s), ${aplicadas.size + nuevasAplicadas} en total.`);
  } finally {
    conn.release();
  }
}

module.exports = runMigrations;
