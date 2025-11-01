import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Optimisation du code splitting pour lazy loading
    rollupOptions: {
      output: {
        // Séparer les chunks par type
        manualChunks: {
          // Vendor chunks - bibliothèques tierces
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['axios', 'uuid', 'qrcode', 'react-qr-code'],

          // Chunks par fonctionnalité
          'auth': [
            './src/pages/Login.jsx',
            './src/pages/Register.jsx',
            './src/pages/Security.jsx'
          ],
          'elections': [
            './src/pages/CreateElection.jsx',
            './src/pages/ElectionDetails.jsx',
            './src/pages/Results.jsx'
          ],
          'voting': [
            './src/pages/VotingPage.jsx',
            './src/pages/ObserverDashboard.jsx'
          ],
        },
        // Nommage des chunks pour le cache
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name]-[hash].js`;
        },
        // Optimiser la taille des chunks
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    // Taille max des chunks (500 KB)
    chunkSizeWarningLimit: 500,
    // Minification avec terser
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprimer les console.log en production
        drop_debugger: true,
      },
    },
  },
  // Optimisation des dépendances
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
    exclude: ['recharts'], // Lazy load
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
});
