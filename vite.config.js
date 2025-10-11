import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
      },
      manifest: {
        name: 'Sistema de Tareas',
        short_name: 'TareasApp',
        description: 'Sistema de gestión de tareas y comunicación en tiempo real',
        theme_color: '#1867C0',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  root: '.',
  build: {
    rollupOptions: {
      input: './index.html'
    }
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'vuetify', 'socket.io-client']
  },
  // Agregar esta configuración para desarrollo
  server: {
    host: true
  }
})