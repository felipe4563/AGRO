// Singleton a nivel de módulo (fuera de React) que captura el evento nativo
// de instalación de PWA (beforeinstallprompt) desde el instante en que se
// carga la app — típicamente en la pantalla de Login, mucho antes de que
// exista el Topbar donde vive el botón "Instalar app". Si escucháramos el
// evento solo dentro de un componente que recién monta después de iniciar
// sesión, para cuando el usuario llega ahí el evento ya se disparó y se
// perdió (el navegador no lo vuelve a emitir en la misma carga de página).
let promptDiferido = null;

// useSyncExternalStore exige que getSnapshot devuelva la MISMA referencia
// mientras nada cambió — si arma un objeto nuevo en cada llamada, React lo
// interpreta como "el store cambia todo el tiempo" y entra en loop infinito
// de renders. Por eso el estado se guarda en un único objeto que solo se
// reemplaza cuando algo realmente cambia (ver actualizarEstado).
let estado = {
  puedeInstalar: false,
  yaInstalada: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
};

const suscriptores = new Set();

function actualizarEstado(cambios) {
  estado = { ...estado, ...cambios };
  suscriptores.forEach((fn) => fn());
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptDiferido = e;
  actualizarEstado({ puedeInstalar: true });
});

window.addEventListener('appinstalled', () => {
  promptDiferido = null;
  actualizarEstado({ puedeInstalar: false, yaInstalada: true });
});

export function obtenerEstadoPWA() {
  return estado;
}

export function suscribirsePWA(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

export async function instalarPWA() {
  if (!promptDiferido) return;
  promptDiferido.prompt();
  await promptDiferido.userChoice;
  promptDiferido = null;
  actualizarEstado({ puedeInstalar: false });
}
