import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'KidzApp Clone',
        short_name: 'KidzApp',
        description: 'Discover and book amazing kids activities',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
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
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles')
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'https://gema-project.onrender.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxy request:', req.method, req.url, '->', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Proxy response:', req.method, req.url, '->', proxyRes.statusCode);
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2015',
    minify: 'esbuild',
    // Force fresh build - disable caching
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          vendor: ['react', 'react-dom'],
          
          // Routing
          router: ['react-router-dom'],
          
          // State Management
          state: ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          
          // UI & Animations
          ui: ['framer-motion', 'lucide-react', 'react-icons'],
          
          // Forms & Validation
          forms: ['react-hook-form', '@hookform/resolvers', 'yup'],
          
          // Data Fetching
          query: ['@tanstack/react-query', 'axios'],
          
          // Charts & Visualization
          charts: ['chart.js', 'react-chartjs-2'],
          
          // Carousels & Sliders
          sliders: ['keen-slider', 'embla-carousel-react', 'swiper'],
          
          // Maps
          maps: ['react-leaflet', 'leaflet'],
          
          // Payments
          payments: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          
          // Utilities
          utils: ['lodash', 'date-fns', 'clsx', 'tailwind-merge'],
          
          // i18n
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          
          // QR & Camera
          qr: ['@zxing/library', 'qr-scanner', 'qrcode.react'],
          
          // Firebase
          firebase: ['firebase/app', 'firebase/auth'],

          // Other
          misc: ['js-cookie', 'uuid', 'react-helmet-async']
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          const buildId = Date.now().toString(36);
          return `js/[name]-[hash]-${buildId}.js`;
        },
        entryFileNames: `js/[name]-[hash]-${Date.now().toString(36)}.js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 4096,
    commonjsOptions: {
      include: [/firebase/, /node_modules/]
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'redux-persist',
      'axios',
      'framer-motion',
      'lucide-react',
      'react-icons/fa',
      'date-fns',
      'clsx',
      'lodash',
      '@tanstack/react-query',
      'react-hook-form',
    ],
    exclude: ['@zxing/library']
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __CACHE_BUST__: JSON.stringify(Date.now().toString(36))
  },
  // Force Vercel to do fresh build
  clearScreen: false
});