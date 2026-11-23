import { useRegisterSW } from 'virtual:pwa-register/react';

// Botón flotante que aparece cuando hay una versión nueva del frontend
// publicada (service worker nuevo ya descargado y esperando). Al tocarlo,
// activa esa versión y recarga la página — así el usuario controla el
// momento, en vez de que se reemplace sola a mitad de una venta.
export default function ActualizarApp() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Revisa si hay una versión nueva cada 60 min, por si la pestaña
      // queda abierta mucho tiempo sin recargar.
      if (!registration) return;
      setInterval(() => { registration.update(); }, 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <button
      onClick={() => updateServiceWorker(true)}
      className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 pl-4 pr-5 py-3
                 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white
                 text-sm font-bold shadow-xl shadow-emerald-600/30
                 transition-all duration-200 hover:scale-105 animate-bounce"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
      Actualizar
    </button>
  );
}
