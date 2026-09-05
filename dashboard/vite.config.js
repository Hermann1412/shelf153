import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          i18n: ['i18next', 'i18next-browser-languagedetector', 'react-i18next'],
          socket: ['socket.io-client'],
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
})
