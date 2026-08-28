const db = require('../config/db');

const listar = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id_proveedor, empresa, nit, contacto, telefono, correo, direccion, activo 
       FROM proveedor 
       ORDER BY empresa ASC`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener proveedores' });
  }
};

const obtener = async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM proveedor WHERE id_proveedor = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener proveedor' });
  }
};

const crear = async (req, res) => {
  const { empresa, nit, contacto, telefono, correo, direccion } = req.body;
  
  if (!empresa) {
    return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
  }

  try {
    const [result] = await db.promise().query(
      `INSERT INTO proveedor (empresa, nit, contacto, telefono, correo, direccion) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        empresa.trim(),
        nit || null,
        contacto ? contacto.trim() : null,
        telefono || null,
        correo || null,
        direccion || null
      ]
    );

    return res.status(201).json({ mensaje: 'Proveedor registrado', id_proveedor: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El NIT ya está registrado' });
    }
    return res.status(500).json({ error: 'Error al registrar proveedor' });
  }
};

const editar = async (req, res) => {
  const { id } = req.params;
  const { empresa, nit, contacto, telefono, correo, direccion } = req.body;

  if (!empresa) {
    return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
  }

  try {
    await db.promise().query(
      `UPDATE proveedor SET 
        empresa = ?, nit = ?, contacto = ?, telefono = ?, correo = ?, direccion = ? 
       WHERE id_proveedor = ?`,
      [
        empresa.trim(),
        nit || null,
        contacto ? contacto.trim() : null,
        telefono || null,
        correo || null,
        direccion || null,
        id
      ]
    );

    return res.json({ mensaje: 'Proveedor actualizado correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El NIT ya está registrado por otro proveedor' });
    }
    return res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
};

const eliminar = async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query('UPDATE proveedor SET activo = 0 WHERE id_proveedor = ?', [id]);
    return res.json({ mensaje: 'Proveedor desactivado' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al desactivar proveedor' });
  }
};

const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    await db.promise().query('UPDATE proveedor SET activo = ? WHERE id_proveedor = ?', [activo ? 1 : 0, id]);
    return res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  editar,
  eliminar,
  toggleActivo
};
