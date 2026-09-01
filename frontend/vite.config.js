import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // El manifest NO lo genera este plugin: se sirve dinámicamente desde el
      // backend (/api/configuracion/pwa/manifest.webmanifest, enlazado desde
      // index.html) para que el nombre y el ícono de la PWA instalada reflejen
      // el logo que el negocio suba en Configuración, en vez de quedar fijos
      // en lo que había al momento del build.
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // El shell (JS/CSS/HTML/íconos) se cachea para que la app instale y
        // cargue al instante. Los datos reales (/api/**) NUNCA se cachean:
        // esto es un POS/ERP con stock y precios en vivo — servir una
        // respuesta vieja del caché sería mostrar inventario o precios
        // incorrectos. Sin conexión, las pantallas de datos deben fallar
        // visiblemente (como ya hacen) en vez de mentir con datos viejos.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    allowedHosts: [
      'virtual-loved-logs-computation.trycloudflare.com'
    ]
  },
  // Solo para `vite preview`: reproduce el mismo-origen que en producción
  // (donde el proxy reverso sirve /api bajo el propio dominio del frontend),
  // así el manifest de la PWA resuelve start_url/scope correctamente al
  // probar el build de forma local.
  preview: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
