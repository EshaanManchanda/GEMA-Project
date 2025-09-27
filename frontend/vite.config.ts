import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.svg', 'robots.txt'],
      manifest: {
        name: 'Gema - Event Management Platform',
        short_name: 'Gema',
        description: 'Discover and book amazing events in your area',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gema-project\.onrender\.com\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    }),
    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
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
    sourcemap: true, // Always enable sourcemaps for debugging
    target: ['es2020', 'chrome80', 'safari13', 'firefox78'],
    minify: 'esbuild',
    // Force fresh build - disable caching
    emptyOutDir: true,
    // Vercel optimizations
    reportCompressedSize: false,
    cssCodeSplit: true,
    rollupOptions: {
      // Prevent Node.js built-ins from being bundled for client
      external: (id) => {
        // Only exclude actual Node.js built-ins, NOT fetch libraries
        if (id.startsWith('node:') ||
            id.includes('perf_hooks') ||
            id.startsWith('fs') ||
            id.startsWith('path') ||
            id.startsWith('http') ||
            id.startsWith('https') ||
            id.startsWith('url') ||
            (id.startsWith('crypto') && !id.includes('crypto-js'))) {
          console.warn(`[Vite] Excluding Node.js built-in from bundle: ${id}`);
          return true;
        }
        // ✅ Allow undici/node-fetch to be bundled or replaced with browser equivalents
        return false;
      },
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
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 8192,
    commonjsOptions: {
      include: [/firebase/, /node_modules/]
    },
    // Vercel-specific optimizations
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production'
      }
    }
  },
  optimizeDeps: {
    include: [
      // Include whatwg-fetch FIRST to ensure polyfills are available early
      'whatwg-fetch',
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
      'react-hook-form'
    ],
    exclude: ['@zxing/library'],
    force: true,
    entries: ['src/main.tsx']
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __CACHE_BUST__: JSON.stringify(Date.now().toString(36)),
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV || 'development'),
    __VERCEL_URL__: JSON.stringify(process.env.VERCEL_URL || 'localhost'),
    // Ensure global points to globalThis for polyfill compatibility
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': '{}',
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v18.0.0')
  },
  // Vercel deployment settings
  clearScreen: false,
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  // Preview mode optimizations
  preview: {
    port: 3000,
    host: true,
    strictPort: false
  },
  // ESBuild options for better compatibility
  esbuild: {
    target: 'es2020',
    supported: {
      'top-level-await': false
    }
  }
});