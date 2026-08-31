const mysql = require('mysql2/promise');
require('dotenv').config({path: './backend/.env'});
async function test() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    const query = `
      SELECT 
        p.id_producto, 
        p.nombre, 
        c.nombre as categoria,
        SUM(stock_por_suc.total_sucursal) as stock_total_unidades,
        CONCAT('[', GROUP_CONCAT(
          JSON_OBJECT(
            'id_sucursal', stock_por_suc.id_sucursal,
            'sucursal_nombre', stock_por_suc.sucursal_nombre,
            'stock', stock_por_suc.total_sucursal
          )
        ), ']') as detalle_sucursales
      FROM producto p
      LEFT JOIN clasificacion_producto c ON p.id_clasificacion = c.id_clasificacion
      JOIN (
        SELECT id_producto, s.id_sucursal, s.nombre as sucursal_nombre, SUM(stock_unidades) as total_sucursal
        FROM lote l
        JOIN sucursal s ON l.id_sucursal = s.id_sucursal
        WHERE l.activo = 1 AND l.stock_unidades > 0
        GROUP BY id_producto, s.id_sucursal
      ) stock_por_suc ON p.id_producto = stock_por_suc.id_producto
      GROUP BY p.id_producto, p.nombre, c.nombre
      LIMIT 2
    `;
    const [rows] = await db.query(query);
    console.log(JSON.stringify(rows, null, 2));
    db.end();
  } catch(e) {
    console.error(e);
  }
}
test();
