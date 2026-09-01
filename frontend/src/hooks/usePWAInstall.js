import { useSyncExternalStore } from 'react';
import { obtenerEstadoPWA, suscribirsePWA, instalarPWA } from '../utils/pwaInstall';

// El aviso automático del navegador para instalar la PWA ("mini-infobar" /
// ícono en la barra de direcciones) es poco confiable: Chrome lo oculta según
// heurísticas de uso propias, y Firefox/Safari ni lo soportan. Este hook
// expone el evento nativo (capturado globalmente desde utils/pwaInstall, ver
// ahí el porqué) para poder disparar la instalación desde un botón propio, y
// detecta iOS (que nunca dispara ese evento) para mostrar instrucciones
// manuales en su lugar.
export function usePWAInstall() {
  const { puedeInstalar, yaInstalada } = useSyncExternalStore(suscribirsePWA, obtenerEstadoPWA);
  const esIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  return {
    puedeInstalar,
    esIOS,
    yaInstalada,
    instalar: instalarPWA,
  };
}
