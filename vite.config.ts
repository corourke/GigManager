
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import tailwindcss from '@tailwindcss/vite';
  import path from 'path';
  import fs from 'fs';
  import { VitePWA } from 'vite-plugin-pwa';

  const useHttps = process.env.VITE_HTTPS === 'true';
  const httpsConfig = useHttps && fs.existsSync(path.resolve(__dirname, '.certs/cert.pem'))
    ? { cert: fs.readFileSync(path.resolve(__dirname, '.certs/cert.pem')), key: fs.readFileSync(path.resolve(__dirname, '.certs/key.pem')) }
    : undefined;

  export default defineConfig({
    plugins: [
      tailwindcss(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'GigWrangler',
          short_name: 'GigWrnglr',
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
          // Explicit allowlist so every client-side (react-router) route falls
          // back to index.html instead of being silently rejected by the SW's
          // navigation-fallback route — only exclude actual API/asset requests.
          navigateFallbackAllowlist: [/^(?!\/api\/).*/],
          // public/static/404.html is Cloudflare's not-found page for missing
          // chunks, never a page the app shows. (Restates Workbox's default
          // node_modules ignore, which setting globIgnores replaces.)
          globIgnores: ['**/node_modules/**/*', 'static/404.html'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
          navigateFallbackAllowlist: [/^(?!\/api\/).*/],
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
      // Hashed JS/CSS go in /static/, not Vite's default /assets/, because
      // /assets/... are app routes (equipment). public/static/404.html makes
      // Cloudflare Pages answer a missing build file with a real 404 there,
      // while every other path keeps the SPA fallback to index.html.
      assetsDir: 'static',
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: true,
      ...(httpsConfig ? { https: httpsConfig } : {}),
    },
  });