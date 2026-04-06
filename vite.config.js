import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'Forge',
        short_name: 'Forge',
        description: 'Personal PM & Developer Ops Toolkit',
        start_url: '/',
        display: 'standalone',
        theme_color: '#00D4FF',
        background_color: '#0A0A0F',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Do not precache index.html: after deploy, old precached HTML can reference deleted hashed JS → blank page.
        // Vercel rewrites already serve index.html for SPA routes; disable Workbox navigateFallback so we don't need a precached shell.
        navigateFallback: null,
        globPatterns: ['**/*.{js,css,svg,png,woff2}', '**/manifest.webmanifest', '**/registerSW.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 } },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-api', expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ],
})
