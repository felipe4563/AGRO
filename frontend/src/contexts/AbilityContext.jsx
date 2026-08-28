import { createContext, useContext, useState } from 'react';
import { createContextualCan } from '@casl/react';
import { buildAbility, emptyAbility } from '../casl/ability';

// ── Contexto principal que expone el Ability ─────────────────────────────
export const AbilityContext = createContext(emptyAbility);

// ── Componente <Can> listo para usar en cualquier componente ─────────────
// Uso: <Can I="crear" a="encomiendas"> <button>...</button> </Can>
export const Can = createContextualCan(AbilityContext.Consumer);

// ── Contexto secundario para actualizar/limpiar el Ability ───────────────
const AbilityUpdaterContext = createContext({
  actualizar: () => {},
  limpiar:    () => {},
});

export const useAbilityUpdater = () => useContext(AbilityUpdaterContext);

// ── Provider principal ───────────────────────────────────────────────────
export function AbilityProvider({ children }) {
  const [ability, setAbility] = useState(() => {
    // Al recargar la página reconstruye el ability desde localStorage
    // así no se pierde la sesión al hacer F5
    try {
      const raw = localStorage.getItem('usuario');
      if (raw) {
        const usuario = JSON.parse(raw);
        return buildAbility(usuario.permisos ?? []);
      }
    } catch {
      // Si hay datos corruptos en localStorage los ignoramos
    }
    return emptyAbility;
  });

  /**
   * Llamar tras login exitoso con los permisos del usuario
   * @param {string[]} permisos - array de nombre_clave
   */
  const actualizar = (permisos = []) => {
    setAbility(buildAbility(permisos));
  };

  /**
   * Llamar tras logout para revocar todos los permisos
   */
  const limpiar = () => {
    setAbility(emptyAbility);
  };

  return (
    <AbilityContext.Provider value={ability}>
      <AbilityUpdaterContext.Provider value={{ actualizar, limpiar }}>
        {children}
      </AbilityUpdaterContext.Provider>
    </AbilityContext.Provider>
  );
}