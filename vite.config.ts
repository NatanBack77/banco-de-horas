import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  optimizeDeps: { include: ['sql.js/dist/sql-wasm.js'] },
  assetsInclude: ['**/*.wasm'],
  server: { host: true, port: 5173 },
});
