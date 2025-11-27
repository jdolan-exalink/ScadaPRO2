import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      host: '0.0.0.0',
      port: 3002,
      proxy: {
        // Proxy API requests to the Industrial IoT Backend
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
        },
        // Proxy WebSocket connections for real-time data
        '/ws': {
          target: 'ws://localhost:3002',
          ws: true,
          changeOrigin: true,
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
