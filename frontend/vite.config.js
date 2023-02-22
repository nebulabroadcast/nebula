import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const nebula_server = 'http://localhost:4455'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: nebula_server,
        changeOrigin: true
      },
      '/plugin': {
        target: nebula_server,
        changeOrigin: true
      },
      '/proxy': {
        target: nebula_server,
        changeOrigin: true
      },
      '/upload': {
        target: nebula_server,
        changeOrigin: true
      },
      '/ws': {
        ws: true,
        target: nebula_server,
        changeOrigin: true
      },
    }
  },
  plugins: [react()]
})
