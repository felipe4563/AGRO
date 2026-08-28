import { AbilityBuilder, createMongoAbility } from '@casl/ability';

/**
 * Construye el Ability de CASL desde el array de nombre_clave
 * Ejemplo: ['encomiendas.ver', 'roles.gestionar_permisos', ...]
 */
export function buildAbility(permisos = []) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  permisos.forEach((clave) => {
    const dot = clave.indexOf('.');
    if (dot === -1) return;

    const subject = clave.substring(0, dot);  // 'encomiendas'
    const action  = clave.substring(dot + 1); // 'ver'

    can(action, subject);
  });

  return build();
}

// Ability vacío para cuando no hay sesión
export const emptyAbility = buildAbility([]);