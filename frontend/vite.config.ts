import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { loadEnv } from 'vite';

interface ConfigEnv {
  mode: string;
}

export default ({ mode }: ConfigEnv) => {
  Object.assign(process?.env, loadEnv(mode, process?.cwd(), ''));
  const SERVER_URL = process?.env?.SERVER_URL || 'http://localhost:4455';

  return defineConfig({
    resolve: {
      alias: {
        '@containers': '/src/containers',
        '@components': '/src/components',
        '@features': '/src/features',
        '@client': '/src/client',
        '@lib': '/src/lib',
        '@types': '/src/types',
        '@': '/src',
      },
    },

    server: {
      proxy: {
        '/api': {
          target: SERVER_URL,
          changeOrigin: true,
        },
        '/plugin': {
          target: SERVER_URL,
          changeOrigin: true,
        },
        '/proxy': {
          target: SERVER_URL,
          changeOrigin: true,
        },
        '/upload': {
          target: SERVER_URL,
          changeOrigin: true,
        },
        '/ws': {
          ws: true,
          target: SERVER_URL,
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  });
};
