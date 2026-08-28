const { AbilityBuilder, createMongoAbility } = require('@casl/ability');

/**
 * Recibe un array de nombre_clave como:
 * ['encomiendas.ver', 'encomiendas.crear', 'manifiestos.ver_conductor', ...]
 * y construye el Ability de CASL
 */
function buildAbilityForPermisos(permisos = []) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  permisos.forEach((clave) => {
    // Separamos 'modulo.accion' → subject='modulo', action='accion'
    const dotIndex = clave.indexOf('.');
    if (dotIndex === -1) return;

    const subject = clave.substring(0, dotIndex);   // ej: 'encomiendas'
    const action  = clave.substring(dotIndex + 1);  // ej: 'ver'

    can(action, subject);
  });

  return build();
}

module.exports = { buildAbilityForPermisos };