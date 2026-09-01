import { useEffect, useState, useCallback } from 'react';

// El aviso automático del navegador para instalar la PWA ("mini-infobar" /
// ícono en la barra de direcciones) es poco confiable: Chrome lo oculta según
// heurísticas de uso propias, y Firefox/Safari ni lo soportan. Este hook
// captura el evento nativo cuando está disponible para poder disparar la
// instalación desde un botón propio, y detecta iOS (que nunca dispara este
// evento) para mostrar instrucciones manuales en su lugar.
export function usePWAInstall() {
  const [promptDiferido, setPromptDiferido] = useState(null);
  const [yaInstalada, setYaInstalada] = useState(false);

  useEffect(() => {
    const detectarInstalada = () =>
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setYaInstalada(detectarInstalada());

    const alDisponible = (e) => {
      e.preventDefault();
      setPromptDiferido(e);
    };
    const alInstalar = () => {
      setYaInstalada(true);
      setPromptDiferido(null);
    };

    window.addEventListener('beforeinstallprompt', alDisponible);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alDisponible);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  const esIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  const instalar = useCallback(async () => {
    if (!promptDiferido) return;
    promptDiferido.prompt();
    await promptDiferido.userChoice;
    setPromptDiferido(null);
  }, [promptDiferido]);

  return {
    puedeInstalar: !!promptDiferido,
    esIOS,
    yaInstalada,
    instalar,
  };
}
