
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';
  import fs from 'fs';
  import { VitePWA } from 'vite-plugin-pwa';

  const useHttps = process.env.VITE_HTTPS === 'true';
  const httpsConfig = useHttps && fs.existsSync(path.resolve(__dirname, '.certs/cert.pem'))
    ? { cert: fs.readFileSync(path.resolve(__dirname, '.certs/cert.pem')), key: fs.readFileSync(path.resolve(__dirname, '.certs/key.pem')) }
    : undefined;

  export default defineConfig({
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'GigManager',
          short_name: 'GigMgr',
          description: 'Production and Event Management Platform',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
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
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: false
        }
      })
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: true,
      ...(httpsConfig ? { https: httpsConfig } : {}),
    },
  });