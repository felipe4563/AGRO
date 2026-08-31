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
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'SIS AGRONOMICO',
        short_name: 'SIS AGRO',
        description: 'Sistema de gestión agropecuaria: ventas, compras, inventario y reportes.',
        theme_color: '#10b981',
        background_color: '#f4f4f5',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
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
  }
})
