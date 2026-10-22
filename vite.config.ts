import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';
import { defineConfig } from 'vite';

dotenv.config();

const rawKeys = process.env.GEMINI_API_KEYS || '';
const DEV_API_KEYS = rawKeys
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

let devKeyCursor = 0;

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/ws': {
          target: 'wss://generativelanguage.googleapis.com',
          ws: true,
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            // @ts-ignore
            proxy.on('proxyReqWs', (proxyReq) => {
              if (DEV_API_KEYS.length > 0) {
                const selectedKey = DEV_API_KEYS[devKeyCursor % DEV_API_KEYS.length];
                devKeyCursor++;
                if (proxyReq.path) {
                  proxyReq.path = proxyReq.path.replace(/key=[^&]+/, `key=${selectedKey}`);
                }
              }
            });
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
          },
        },
      },
    },
  };
});
