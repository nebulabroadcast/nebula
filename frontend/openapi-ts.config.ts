import { loadEnv } from 'vite';
import { defineConfig } from '@hey-api/openapi-ts';

const mode = process.env.NODE_ENV || 'development';
const env = loadEnv(mode, process?.cwd(), '');

const SERVER_URL = env.SERVER_URL || 'http://localhost:4455';

export default defineConfig({
  input: `${SERVER_URL}/openapi.json`,
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: './src/client',
  },
  plugins: ['@hey-api/typescript', '@hey-api/client-axios', '@hey-api/sdk'],
});
