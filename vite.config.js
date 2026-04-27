import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import { readdirSync } from 'fs';

function getPages() {
  const pages = { main: resolve(__dirname, 'index.html') };
  try {
    readdirSync(resolve(__dirname, 'pages/learn'))
      .filter(f => f.endsWith('.html'))
      .forEach(f => {
        pages[`learn-${f.replace('.html', '')}`] = resolve(__dirname, 'pages/learn', f);
      });
  } catch {}
  try {
    readdirSync(resolve(__dirname, 'pages/apply'))
      .filter(f => f.endsWith('.html'))
      .forEach(f => {
        pages[`apply-${f.replace('.html', '')}`] = resolve(__dirname, 'pages/apply', f);
      });
  } catch {}
  return pages;
}

export default defineConfig({
  base: '/Managerial-Accounting/',
  build: {
    rollupOptions: { input: getPages() },
    outDir: 'dist',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Managerial Accounting Interactive',
        short_name: 'Mgmt Accounting',
        description: 'Interactive learning tools for Horngren\'s Cost Accounting',
        theme_color: '#1a365d',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/Managerial-Accounting/',
        start_url: '/Managerial-Accounting/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
