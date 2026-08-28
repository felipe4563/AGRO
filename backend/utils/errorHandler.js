// Evita filtrar errores nativos de MySQL (nombres de tablas/columnas, SQL crudo) al cliente.
// Solo expone err.message cuando es un error de negocio lanzado a mano (throw new Error('...'));
// si trae huellas del driver de MySQL (code/sqlMessage/sqlState/errno), se devuelve el mensaje genérico.
function mensajeSeguro(err, fallback) {
  const esErrorDeBD = !!(err && (err.code || err.sqlMessage || err.sqlState || err.errno));
  if (esErrorDeBD) return fallback;
  return (err && err.message) || fallback;
}

module.exports = { mensajeSeguro };
