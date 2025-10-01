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
      // Path aliases
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
    sourcemap: process.env.NODE_ENV !== 'production', // Sourcemaps only in development
    target: ['es2020', 'chrome80', 'safari13', 'firefox78'],
    minify: 'terser', // Use terser for better compression
    // Force fresh build - disable caching
    emptyOutDir: true,
    // Vercel optimizations
    reportCompressedSize: false,
    cssCodeSplit: true,
    rollupOptions: {
      // Prevent Node.js built-ins from being bundled for client
      external: (id) => {
        // Exclude Node.js built-ins from browser bundle
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
        return false;
      },
      output: {
        manualChunks: (id) => {
          // CRITICAL: Force polyfills into main entry chunk (no separate chunk)
          // This ensures polyfills run BEFORE any other code
          if (id.includes('src/polyfills') || id.includes('whatwg-fetch')) {
            return undefined; // undefined = main entry chunk
          }

          // Core React - Bundle in main entry chunk to guarantee it loads first
          // This prevents race conditions where other chunks load before React is available
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            if (!id.includes('react-router') && !id.includes('react-redux') &&
                !id.includes('react-hook-form') && !id.includes('react-query') &&
                !id.includes('react-icons') && !id.includes('react-chartjs') &&
                !id.includes('react-leaflet') && !id.includes('react-i18next') &&
                !id.includes('react-helmet') && !id.includes('react-hot-toast') &&
                !id.includes('react-stripe')) {
              return undefined; // Main entry chunk - always loads first
            }
          }

          // Routing - REMOVED: react-router-dom now bundled with main entry chunk
          // See lines 238-243 for router configuration

          // State Management
          if (id.includes('node_modules/@reduxjs/toolkit') ||
              id.includes('node_modules/react-redux') ||
              id.includes('node_modules/redux-persist')) {
            return 'state';
          }

          // UI & Animations
          if (id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/react-icons')) {
            return 'ui';
          }

          // Forms & Validation
          if (id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform/resolvers') ||
              id.includes('node_modules/yup')) {
            return 'forms';
          }

          // Data Fetching - AFTER polyfills are guaranteed to be in main chunk
          if (id.includes('node_modules/@tanstack/react-query') ||
              id.includes('node_modules/axios')) {
            return 'query';
          }

          // Charts & Visualization
          if (id.includes('node_modules/chart.js') ||
              id.includes('node_modules/react-chartjs-2')) {
            return 'charts';
          }

          // Carousels & Sliders
          if (id.includes('node_modules/keen-slider') ||
              id.includes('node_modules/swiper')) {
            return 'sliders';
          }

          // Maps
          if (id.includes('node_modules/react-leaflet') ||
              id.includes('node_modules/leaflet')) {
            return 'maps';
          }

          // Payments
          if (id.includes('node_modules/@stripe/stripe-js') ||
              id.includes('node_modules/@stripe/react-stripe-js')) {
            return 'payments';
          }

          // Utilities
          if (id.includes('node_modules/lodash') ||
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')) {
            return 'utils';
          }

          // i18n - Explicitly exclude from misc chunk to bundle with dynamic import
          // Returning undefined allows Vite to bundle these with their importer (App.tsx dynamic import)
          // This ensures i18n only loads when useEffect runs, after React is initialized
          if (id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next') ||
              id.includes('node_modules/i18next-browser-languagedetector') ||
              id.includes('node_modules/i18next-http-backend')) {
            return undefined; // Bundle with dynamic import chunk, not misc
          }

          // CRITICAL: Router and React-dependent libraries must load with main chunk
          // react-router-dom calls createContext at module parse time (not runtime)
          // These libraries MUST have React available before they load
          if (id.includes('node_modules/react-router-dom')) {
            return undefined; // Bundle with main entry chunk to guarantee React is available
          }

          // Other React-dependent libraries that use Context APIs
          if (id.includes('node_modules/react-helmet-async') ||
              id.includes('node_modules/react-hot-toast')) {
            return undefined; // Bundle with main entry chunk
          }

          // QR & Camera
          if (id.includes('node_modules/@zxing/library') ||
              id.includes('node_modules/qr-scanner') ||
              id.includes('node_modules/qrcode.react')) {
            return 'qr';
          }

          // Firebase
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }

          // Other misc libraries
          if (id.includes('node_modules/js-cookie') ||
              id.includes('node_modules/uuid')) {
            return 'misc';
          }

          // Everything else from node_modules goes to misc
          if (id.includes('node_modules')) {
            return 'misc';
          }
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
    },
    // Module preload to ensure proper chunk loading order
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        // Ensure main chunk (with React) loads before misc/router chunks
        if (filename.includes('misc') || filename.includes('router')) {
          return deps.filter(dep => dep.includes('index-'));
        }
        return deps;
      }
    }
  },
  optimizeDeps: {
    include: [
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
    entries: ['src/polyfills.ts', 'src/main.tsx']
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __CACHE_BUST__: JSON.stringify(Date.now().toString(36)),
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV || 'development'),
    __VERCEL_URL__: JSON.stringify(process.env.VERCEL_URL || 'localhost'),

    // Node/env mocks
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': '{}',
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v18.0.0')

    // NOTE: Removed global.* definitions - they interfere with runtime polyfills
    // Our polyfill code in src/polyfills.ts handles global patching at runtime
  },
  clearScreen: false,
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  preview: {
    port: 3000,
    host: true,
    strictPort: false
  },
  esbuild: {
    target: 'es2020',
    supported: {
      'top-level-await': false
    }
  }
});