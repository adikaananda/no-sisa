import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Prototype single-bundle app (Recharts + semua halaman) wajar > 500kB.
    // Dinaikkan supaya warning build tidak muncul; tidak mengubah performa runtime.
    chunkSizeWarningLimit: 1000,
  },
})
