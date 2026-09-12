import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // el front habla con el motor por /api — así no hay CORS ni URLs hardcodeadas
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
});
