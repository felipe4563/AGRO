import { useContext } from 'react';
import { AbilityContext } from '../contexts/AbilityContext';

/**
 * Hook para verificar permisos dentro de lógica de componentes
 *
 * Uso:
 *   const { puede, noPuede } = usePermission();
 *
 *   // En condiciones
 *   if (puede('crear', 'encomiendas')) { ... }
 *
 *   // En JSX
 *   {puede('ver', 'roles') && <Link to="/roles">Roles</Link>}
 */
export function usePermission() {
  const ability = useContext(AbilityContext);

  return {
    /**
     * Retorna true si el usuario tiene el permiso
     * @param {string} action  - acción: 'ver', 'crear', 'ver_sticker', etc.
     * @param {string} subject - módulo: 'encomiendas', 'roles', etc.
     */
    puede:   (action, subject) => ability.can(action, subject),

    /**
     * Retorna true si el usuario NO tiene el permiso
     */
    noPuede: (action, subject) => ability.cannot(action, subject),

    // Expone el ability completo por si necesitas algo más avanzado
    ability,
  };
}