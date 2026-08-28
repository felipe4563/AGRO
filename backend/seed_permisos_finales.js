require('dotenv').config();
const db = require('./config/db');

const permisosNuevos = [
  // Proveedores
  ['proveedores', 'ver', 'proveedores.ver', 'Ver proveedores'],
  ['proveedores', 'crear', 'proveedores.crear', 'Crear proveedores'],
  ['proveedores', 'editar', 'proveedores.editar', 'Editar proveedores'],
  ['proveedores', 'eliminar', 'proveedores.eliminar', 'Eliminar proveedores'],
  ['proveedores', 'activar', 'proveedores.activar', 'Activar/Desactivar proveedores'],
  
  // Compras
  ['compras', 'ver', 'compras.ver', 'Ver historial de compras'],
  ['compras', 'crear', 'compras.crear', 'Registrar nuevas compras'],
  ['compras', 'editar', 'compras.editar', 'Editar o anular compras'],
  ['compras', 'confirmar', 'compras.confirmar', 'Confirmar ingreso de compras al almacén'],
  
  // Almacen
  ['almacen', 'ver', 'almacen.ver', 'Ver inventario del almacén'],
  ['almacen', 'ajustar', 'almacen.ajustar', 'Realizar ajustes manuales de inventario'],
  
  // Ventas
  ['ventas', 'ver', 'ventas.ver', 'Ver historial de ventas'],
  ['ventas', 'crear', 'ventas.crear', 'Registrar nuevas ventas en el POS'],
  ['ventas', 'anular', 'ventas.anular', 'Anular ventas registradas'],
  
  // Reportes
  ['reportes', 'ver', 'reportes.ver', 'Ver reportes gerenciales y dashboard']
];

async function seed() {
  try {
    for (const p of permisosNuevos) {
      const [rows] = await db.promise().query('SELECT id_permiso FROM permiso WHERE nombre_clave = ?', [p[2]]);
      if (rows.length === 0) {
        const [result] = await db.promise().query(
          'INSERT INTO permiso (modulo, accion, nombre_clave, descripcion) VALUES (?, ?, ?, ?)',
          p
        );
        console.log(`Permiso ${p[2]} insertado.`);
        
        // Asignar al rol 1 (Administrador)
        await db.promise().query(
          'INSERT IGNORE INTO rol_permiso (id_rol, id_permiso) VALUES (1, ?)',
          [result.insertId]
        );
      } else {
        console.log(`Permiso ${p[2]} ya existía.`);
        // Ensure role 1 has it
        await db.promise().query(
          'INSERT IGNORE INTO rol_permiso (id_rol, id_permiso) VALUES (1, ?)',
          [rows[0].id_permiso]
        );
      }
    }
    console.log('Todos los permisos inyectados y asignados al Administrador.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
