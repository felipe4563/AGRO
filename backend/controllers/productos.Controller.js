const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');

const listarProductos = async (req, res) => {
  try {
    const query = `
      SELECT
        p.id_producto, p.id_clasificacion, p.id_marca, p.id_unidad,
        p.nombre, p.descripcion, p.codigo_barras, p.imagen,
        p.precio_mayor, p.precio_menor, p.descuento_mayor, p.descuento_menor,
        p.stock_minimo, p.activo, p.creado_en,
        c.nombre AS clasificacion_nombre,
        m.nombre AS marca_nombre,
        u.abreviatura AS unidad_abreviatura
      FROM producto p
      LEFT JOIN clasificacion_producto c ON p.id_clasificacion = c.id_clasificacion
      LEFT JOIN marca m ON p.id_marca = m.id_marca
      LEFT JOIN unidad_medida u ON p.id_unidad = u.id_unidad
      ORDER BY p.nombre ASC
    `;
    const [rows] = await db.promise().query(query);

    // Precios y descuentos son datos sensibles: solo se exponen si el rol
    // tiene el permiso específico 'ver_precios' (no basta con 'ver' productos).
    if (!req.ability?.can('ver_precios', 'productos')) {
      rows.forEach((r) => {
        delete r.precio_mayor;
        delete r.precio_menor;
        delete r.descuento_mayor;
        delete r.descuento_menor;
      });
    }

    return res.json(rows);
  } catch (err) {
    console.error('[listarProductos]', err);
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
};

const crearProducto = async (req, res) => {
  const { 
    id_clasificacion, id_marca, id_unidad, nombre, descripcion, codigo_barras, 
    precio_mayor, precio_menor, descuento_mayor, descuento_menor, stock_minimo, activo 
  } = req.body ?? {};

  if (!id_clasificacion || !id_marca || !id_unidad || !nombre || precio_mayor == null || precio_menor == null) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    if (codigo_barras) {
      const [exCodigo] = await db.promise().query('SELECT id_producto FROM producto WHERE codigo_barras = ? LIMIT 1', [codigo_barras]);
      if (exCodigo.length > 0) return res.status(409).json({ error: 'El código de barras ya está en uso' });
    }

    const [result] = await db.promise().query(
      `INSERT INTO producto 
      (id_clasificacion, id_marca, id_unidad, nombre, descripcion, codigo_barras, precio_mayor, precio_menor, descuento_mayor, descuento_menor, stock_minimo, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_clasificacion, id_marca, id_unidad, nombre.trim(), descripcion ? descripcion.trim() : null,
        codigo_barras ? codigo_barras.trim() : null, precio_mayor, precio_menor, 
        descuento_mayor || 0, descuento_menor || 0, stock_minimo || 0,
        activo === 0 ? 0 : 1
      ]
    );

    return res.status(201).json({ mensaje: 'Producto creado correctamente', id_producto: result.insertId });
  } catch (err) {
    console.error('[crearProducto]', err);
    return res.status(500).json({ error: 'Error al crear producto' });
  }
};

const editarProducto = async (req, res) => {
  const { id } = req.params;
  const idProductoNum = Number(id);

  const { 
    id_clasificacion, id_marca, id_unidad, nombre, descripcion, codigo_barras, 
    precio_mayor, precio_menor, descuento_mayor, descuento_menor, stock_minimo, activo 
  } = req.body ?? {};

  if (!idProductoNum) return res.status(400).json({ error: 'ID inválido' });

  // El endpoint es genérico (checkPermission('editar','productos')), pero los campos
  // de precio y descuento son sensibles y requieren permisos específicos aparte.
  const tocaPrecios = precio_mayor !== undefined || precio_menor !== undefined;
  const tocaDescuentos = descuento_mayor !== undefined || descuento_menor !== undefined;

  if (tocaPrecios && !req.ability?.can('editar_precios', 'productos')) {
    return res.status(403).json({ error: 'Sin permiso para: editar_precios en productos' });
  }
  if (tocaDescuentos && !req.ability?.can('editar_descuentos', 'productos')) {
    return res.status(403).json({ error: 'Sin permiso para: editar_descuentos en productos' });
  }

  try {
    const [existe] = await db.promise().query('SELECT id_producto FROM producto WHERE id_producto = ? LIMIT 1', [idProductoNum]);
    if (existe.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    if (codigo_barras) {
      const [dupCodigo] = await db.promise().query(
        'SELECT id_producto FROM producto WHERE codigo_barras = ? AND id_producto != ? LIMIT 1',
        [codigo_barras, idProductoNum]
      );
      if (dupCodigo.length > 0) return res.status(409).json({ error: 'El código de barras ya pertenece a otro producto' });
    }

    const fields = [];
    const values = [];

    if (id_clasificacion !== undefined) { fields.push('id_clasificacion = ?'); values.push(id_clasificacion); }
    if (id_marca !== undefined) { fields.push('id_marca = ?'); values.push(id_marca); }
    if (id_unidad !== undefined) { fields.push('id_unidad = ?'); values.push(id_unidad); }
    if (nombre !== undefined) { fields.push('nombre = ?'); values.push(nombre.trim()); }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); values.push(descripcion ? descripcion.trim() : null); }
    if (codigo_barras !== undefined) { fields.push('codigo_barras = ?'); values.push(codigo_barras ? codigo_barras.trim() : null); }
    if (precio_mayor !== undefined) { fields.push('precio_mayor = ?'); values.push(precio_mayor); }
    if (precio_menor !== undefined) { fields.push('precio_menor = ?'); values.push(precio_menor); }
    if (descuento_mayor !== undefined) { fields.push('descuento_mayor = ?'); values.push(descuento_mayor); }
    if (descuento_menor !== undefined) { fields.push('descuento_menor = ?'); values.push(descuento_menor); }
    if (stock_minimo !== undefined) { fields.push('stock_minimo = ?'); values.push(stock_minimo); }
    if (activo !== undefined) { fields.push('activo = ?'); values.push(activo === 0 ? 0 : 1); }

    if (fields.length === 0) return res.status(400).json({ error: 'No hay datos para actualizar' });

    values.push(idProductoNum);
    await db.promise().query(`UPDATE producto SET ${fields.join(', ')} WHERE id_producto = ?`, values);

    return res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (err) {
    console.error('[editarProducto]', err);
    return res.status(500).json({ error: 'Error al editar producto' });
  }
};

const eliminarProducto = async (req, res) => {
  const { id } = req.params;
  const idProductoNum = Number(id);
  if (!idProductoNum) return res.status(400).json({ error: 'ID inválido' });

  try {
    const [rows] = await db.promise().query('SELECT id_producto FROM producto WHERE id_producto = ? LIMIT 1', [idProductoNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    await db.promise().query('UPDATE producto SET activo = 0 WHERE id_producto = ?', [idProductoNum]);
    return res.json({ mensaje: 'Producto desactivado correctamente' });
  } catch (err) {
    console.error('[eliminarProducto]', err);
    return res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

const toggleActivoProducto = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body ?? {};
  const idProductoNum = Number(id);

  if (!idProductoNum) return res.status(400).json({ error: 'ID inválido' });

  const activoNum = activo === 1 || activo === '1' ? 1 : 0;

  try {
    const [rows] = await db.promise().query('SELECT id_producto FROM producto WHERE id_producto = ? LIMIT 1', [idProductoNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    await db.promise().query('UPDATE producto SET activo = ? WHERE id_producto = ?', [activoNum, idProductoNum]);
    return res.json({ mensaje: 'Estado del producto actualizado', activo: activoNum });
  } catch (err) {
    console.error('[toggleActivoProducto]', err);
    return res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

const subirImagenProducto = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

  try {
    const [rows] = await db.promise().query('SELECT imagen FROM producto WHERE id_producto = ? LIMIT 1', [Number(id)]);
    if (rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const imagenAnterior = rows[0].imagen;
    await db.promise().query('UPDATE producto SET imagen = ? WHERE id_producto = ?', [req.file.filename, Number(id)]);

    if (imagenAnterior) {
      const rutaAnterior = path.join(__dirname, '..', 'uploads', imagenAnterior);
      if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
    }

    return res.json({ mensaje: 'Imagen actualizada', imagen: req.file.filename });
  } catch (err) {
    console.error('[subirImagenProducto]', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: 'Error al subir imagen' });
  }
};

const eliminarImagenProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT imagen FROM producto WHERE id_producto = ? LIMIT 1', [Number(id)]);
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const imagen = rows[0].imagen;
    await db.promise().query('UPDATE producto SET imagen = NULL WHERE id_producto = ?', [Number(id)]);

    if (imagen) {
      const ruta = path.join(__dirname, '..', 'uploads', imagen);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    return res.json({ mensaje: 'Imagen eliminada' });
  } catch (err) {
    console.error('[eliminarImagenProducto]', err);
    return res.status(500).json({ error: 'Error al eliminar imagen' });
  }
};

// Genera y guarda un código de barras interno (Code128) si el producto no tiene uno
const generarCodigoBarras = async (req, res) => {
  const { id } = req.params;
  const idProductoNum = Number(id);
  if (!idProductoNum) return res.status(400).json({ error: 'ID inválido' });

  try {
    const [rows] = await db.promise().query('SELECT codigo_barras FROM producto WHERE id_producto = ? LIMIT 1', [idProductoNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    if (rows[0].codigo_barras) {
      return res.json({ codigo_barras: rows[0].codigo_barras, generado: false });
    }

    // Códigos internos arrancan en 900000 — puramente numérico (mejor compatibilidad
    // con lectores) y en un rango que no choca con códigos de fábrica reales (EAN-13).
    const codigo = String(900000 + idProductoNum);
    await db.promise().query('UPDATE producto SET codigo_barras = ? WHERE id_producto = ?', [codigo, idProductoNum]);

    return res.json({ codigo_barras: codigo, generado: true });
  } catch (err) {
    console.error('[generarCodigoBarras]', err);
    return res.status(500).json({ error: 'Error al generar el código de barras' });
  }
};

module.exports = {
  listarProductos,
  crearProducto,
  editarProducto,
  eliminarProducto,
  toggleActivoProducto,
  subirImagenProducto,
  eliminarImagenProducto,
  generarCodigoBarras,
};
