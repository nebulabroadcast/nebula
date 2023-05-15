import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  Object.assign(process?.env, loadEnv(mode, process?.cwd(), ''))

  let SERVER_URL = 'http://localhost:4455'

  // use .env if valid
  if (process?.env?.SERVER_URL) {
    SERVER_URL = process.env.SERVER_URL
  }

  return defineConfig({
    server: {
      proxy: {
        '/api': {
          target: SERVER_URL,
          changeOrigin: true
        },
        '/plugin': {
          target: SERVER_URL,
          changeOrigin: true
        },
        '/proxy': {
          target: SERVER_URL,
          changeOrigin: true
        },
        '/upload': {
          target: SERVER_URL,
          changeOrigin: true
        },
        '/ws': {
          ws: true,
          target: SERVER_URL,
          changeOrigin: true
        },
      }
    },
    plugins: [react()]
  })

}
