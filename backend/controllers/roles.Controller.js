const db = require('../config/db');
const { invalidarCacheRol } = require('../middlewares/authMiddleware');

const listarRoles = (req, res) => {
  const sql = `
    SELECT
      r.id_rol,
      r.nombre,
      COUNT(DISTINCT rp.id_permiso) AS total_permisos,
      COUNT(DISTINCT u.id_usuario)  AS total_usuarios
    FROM rol r
    LEFT JOIN rol_permiso rp ON rp.id_rol     = r.id_rol
    LEFT JOIN usuario    u  ON u.id_rol       = r.id_rol
    GROUP BY r.id_rol, r.nombre
    ORDER BY r.id_rol ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('[listarRoles]', err);
      return res.status(500).json({ error: 'Error al obtener roles' });
    }
    return res.json(results);
  });
};

const obtenerRol = (req, res) => {
  const { id } = req.params;

  // Primero verificamos que el rol exista
  db.query(
    'SELECT * FROM rol WHERE id_rol = ?',
    [id],
    (err, rowsRol) => {
      if (err) {
        console.error('[obtenerRol] rol:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
      }
      if (rowsRol.length === 0) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      const rol = rowsRol[0];

      // Luego cargamos sus permisos agrupados por módulo
      const sqlPermisos = `
        SELECT
          p.id_permiso,
          p.modulo,
          p.accion,
          p.nombre_clave,
          p.descripcion,
          CASE WHEN rp.id_rol IS NOT NULL THEN 1 ELSE 0 END AS asignado
        FROM permiso p
        LEFT JOIN rol_permiso rp
          ON rp.id_permiso = p.id_permiso
          AND rp.id_rol = ?
        ORDER BY p.modulo ASC, p.accion ASC
      `;

      db.query(sqlPermisos, [id], (errP, rowsPermisos) => {
        if (errP) {
          console.error('[obtenerRol] permisos:', errP);
          return res.status(500).json({ error: 'Error al cargar permisos' });
        }

        // Agrupar permisos por módulo para mejor lectura en el frontend
        const permisosPorModulo = rowsPermisos.reduce((acc, permiso) => {
          if (!acc[permiso.modulo]) acc[permiso.modulo] = [];
          acc[permiso.modulo].push(permiso);
          return acc;
        }, {});

        return res.json({
          ...rol,
          permisos_por_modulo: permisosPorModulo,
        });
      });
    }
  );
};

const crearRol = (req, res) => {
  const { nombre, permisos = [] } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre del rol es requerido' });
  }

  // Verificar que no exista un rol con el mismo nombre
  db.query(
    'SELECT id_rol FROM rol WHERE nombre = ?',
    [nombre.trim().toUpperCase()],
    (err, existe) => {
      if (err) {
        console.error('[crearRol] check nombre:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
      }
      if (existe.length > 0) {
        return res.status(409).json({ error: `Ya existe un rol con el nombre "${nombre}"` });
      }

      // Insertar el rol
      db.query(
        'INSERT INTO rol (nombre) VALUES (?)',
        [nombre.trim().toUpperCase()],
        (errInsert, result) => {
          if (errInsert) {
            console.error('[crearRol] insert:', errInsert);
            return res.status(500).json({ error: 'Error al crear el rol' });
          }

          const id_rol = result.insertId;

          // Si no hay permisos iniciales, responder de una
          if (permisos.length === 0) {
            return res.status(201).json({
              mensaje: 'Rol creado correctamente',
              id_rol,
              nombre: nombre.trim().toUpperCase(),
            });
          }

          // Insertar permisos iniciales en rol_permiso
          const valores = permisos.map(id_permiso => [id_rol, id_permiso]);

          db.query(
            'INSERT INTO rol_permiso (id_rol, id_permiso) VALUES ?',
            [valores],
            (errPermisos) => {
              if (errPermisos) {
                console.error('[crearRol] permisos:', errPermisos);
                // El rol se creó, pero los permisos fallaron → avisamos
                return res.status(207).json({
                  advertencia: 'Rol creado pero hubo un error al asignar permisos',
                  id_rol,
                });
              }

              return res.status(201).json({
                mensaje: 'Rol creado con permisos correctamente',
                id_rol,
                nombre: nombre.trim().toUpperCase(),
                total_permisos: permisos.length,
              });
            }
          );
        }
      );
    }
  );
};

const editarRol = (req, res) => {
  const { id }    = req.params;
  const { nombre } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre del rol es requerido' });
  }

  // Verificar que el rol exista
  db.query('SELECT id_rol FROM rol WHERE id_rol = ?', [id], (err, rows) => {
    if (err) {
      console.error('[editarRol] check:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // Verificar que el nuevo nombre no lo use otro rol
    db.query(
      'SELECT id_rol FROM rol WHERE nombre = ? AND id_rol != ?',
      [nombre.trim().toUpperCase(), id],
      (errCheck, duplicado) => {
        if (errCheck) {
          console.error('[editarRol] check nombre:', errCheck);
          return res.status(500).json({ error: 'Error en el servidor' });
        }
        if (duplicado.length > 0) {
          return res.status(409).json({ error: `Ya existe otro rol con el nombre "${nombre}"` });
        }

        db.query(
          'UPDATE rol SET nombre = ? WHERE id_rol = ?',
          [nombre.trim().toUpperCase(), id],
          (errUpdate) => {
            if (errUpdate) {
              console.error('[editarRol] update:', errUpdate);
              return res.status(500).json({ error: 'Error al actualizar rol' });
            }

            return res.json({
              mensaje: 'Rol actualizado correctamente',
              id_rol: Number(id),
              nombre: nombre.trim().toUpperCase(),
            });
          }
        );
      }
    );
  });
};

const eliminarRol = (req, res) => {
  const { id } = req.params;

  // Verificar que el rol exista
  db.query('SELECT * FROM rol WHERE id_rol = ?', [id], (err, rows) => {
    if (err) {
      console.error('[eliminarRol] check:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // Verificar que no tenga usuarios asignados
    db.query(
      'SELECT COUNT(*) AS total FROM usuario WHERE id_rol = ?',
      [id],
      (errCount, countRows) => {
        if (errCount) {
          console.error('[eliminarRol] count usuarios:', errCount);
          return res.status(500).json({ error: 'Error en el servidor' });
        }

        if (countRows[0].total > 0) {
          return res.status(409).json({
            error: `No se puede eliminar: el rol tiene ${countRows[0].total} usuario(s) asignado(s)`,
          });
        }

        // Eliminar permisos del rol primero (integridad referencial)
        db.query(
          'DELETE FROM rol_permiso WHERE id_rol = ?',
          [id],
          (errDelPermisos) => {
            if (errDelPermisos) {
              console.error('[eliminarRol] delete permisos:', errDelPermisos);
              return res.status(500).json({ error: 'Error al eliminar permisos del rol' });
            }

            db.query(
              'DELETE FROM rol WHERE id_rol = ?',
              [id],
              (errDelRol) => {
                if (errDelRol) {
                  console.error('[eliminarRol] delete rol:', errDelRol);
                  return res.status(500).json({ error: 'Error al eliminar el rol' });
                }

                // Limpiar caché por si acaso
                invalidarCacheRol(Number(id));

                return res.json({
                  mensaje: `Rol "${rows[0].nombre}" eliminado correctamente`,
                });
              }
            );
          }
        );
      }
    );
  });
};

const listarPermisos = (req, res) => {
  const sql = `
    SELECT id_permiso, modulo, accion, nombre_clave, descripcion
    FROM permiso
    ORDER BY modulo ASC, accion ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('[listarPermisos]', err);
      return res.status(500).json({ error: 'Error al obtener permisos' });
    }

    // Agrupar por módulo → el frontend renderiza sección por sección
    const agrupados = rows.reduce((acc, p) => {
      if (!acc[p.modulo]) acc[p.modulo] = [];
      acc[p.modulo].push(p);
      return acc;
    }, {});

    return res.json({
      total:   rows.length,
      modulos: agrupados,
    });
  });
};

const actualizarPermisosRol = (req, res) => {
  const { id }       = req.params;
  const { permisos } = req.body;

  if (!Array.isArray(permisos)) {
    return res.status(400).json({ error: '"permisos" debe ser un array de IDs' });
  }

  // Verificar que el rol exista
  db.query('SELECT id_rol FROM rol WHERE id_rol = ?', [id], (err, rows) => {
    if (err) {
      console.error('[actualizarPermisosRol] check rol:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // ← Obtener una conexión individual del pool para la transacción
    db.getConnection((errConn, connection) => {
      if (errConn) {
        console.error('[actualizarPermisosRol] getConnection:', errConn);
        return res.status(500).json({ error: 'Error al obtener conexión' });
      }

      // ← beginTransaction sobre la conexión, no el pool
      connection.beginTransaction((errTx) => {
        if (errTx) {
          connection.release();
          console.error('[actualizarPermisosRol] beginTransaction:', errTx);
          return res.status(500).json({ error: 'Error al iniciar transacción' });
        }

        // 1. Borrar permisos actuales
        connection.query(
          'DELETE FROM rol_permiso WHERE id_rol = ?',
          [id],
          (errDel) => {
            if (errDel) {
              return connection.rollback(() => {
                connection.release();
                console.error('[actualizarPermisosRol] DELETE:', errDel);
                res.status(500).json({ error: 'Error al limpiar permisos anteriores' });
              });
            }

            // Si array vacío → rol sin permisos
            if (permisos.length === 0) {
              return connection.commit((errCommit) => {
                if (errCommit) {
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ error: 'Error al guardar cambios' });
                  });
                }
                connection.release();
                invalidarCacheRol(Number(id));
                return res.json({
                  mensaje: 'Permisos actualizados: rol sin permisos asignados',
                  total_permisos: 0,
                });
              });
            }

            // 2. Insertar nuevos permisos
            const valores = permisos.map(id_permiso => [Number(id), id_permiso]);

            connection.query(
              'INSERT INTO rol_permiso (id_rol, id_permiso) VALUES ?',
              [valores],
              (errIns) => {
                if (errIns) {
                  return connection.rollback(() => {
                    connection.release();
                    console.error('[actualizarPermisosRol] INSERT:', errIns);
                    res.status(500).json({ error: 'Error al asignar nuevos permisos' });
                  });
                }

                // 3. Commit
                connection.commit((errCommit) => {
                  if (errCommit) {
                    return connection.rollback(() => {
                      connection.release();
                      res.status(500).json({ error: 'Error al confirmar cambios' });
                    });
                  }

                  // ← Liberar la conexión de vuelta al pool
                  connection.release();
                  invalidarCacheRol(Number(id));

                  return res.json({
                    mensaje: 'Permisos actualizados correctamente',
                    id_rol: Number(id),
                    total_permisos: permisos.length,
                  });
                });
              }
            );
          }
        );
      });
    });
  });
};

module.exports = {
  // Roles
  listarRoles,
  obtenerRol,
  crearRol,
  editarRol,
  eliminarRol,
  // Permisos
  listarPermisos,
  actualizarPermisosRol,
};