require('dotenv').config();
const db = require('./config/db');

const permisosClientes = [
  ['clientes', 'ver', 'clientes.ver', 'Ver listado de clientes'],
  ['clientes', 'crear', 'clientes.crear', 'Registrar nuevos clientes'],
  ['clientes', 'editar', 'clientes.editar', 'Editar datos de un cliente'],
  ['clientes', 'eliminar', 'clientes.eliminar', 'Eliminar clientes del sistema'],
  ['clientes', 'activar', 'clientes.activar', 'Activar o desactivar clientes']
];

async function seed() {
  try {
    for (const p of permisosClientes) {
      // Evitar duplicados
      const [rows] = await db.promise().query('SELECT id_permiso FROM permiso WHERE nombre_clave = ?', [p[2]]);
      if (rows.length === 0) {
        const [result] = await db.promise().query(
          'INSERT INTO permiso (modulo, accion, nombre_clave, descripcion) VALUES (?, ?, ?, ?)',
          p
        );
        console.log(`Permiso ${p[2]} insertado con ID: ${result.insertId}`);
        // Asignar al rol 1 (Admin)
        await db.promise().query(
          'INSERT IGNORE INTO rol_permiso (id_rol, id_permiso) VALUES (1, ?)',
          [result.insertId]
        );
      } else {
        console.log(`Permiso ${p[2]} ya existe.`);
      }
    }
    console.log('Semilla completada.');
    process.exit(0);
  } catch (err) {
    console.error('Error al insertar permisos:', err);
    process.exit(1);
  }
}

seed();
