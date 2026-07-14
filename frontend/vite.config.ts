import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Ruta base donde se sirve la app. En local es "/"; en producción (Vercel)
// se define VITE_BASE_PATH="/warren/" para servirla bajo joaquinsolla.com/warren.
const base = process.env.VITE_BASE_PATH ?? '/'

// Los ficheros se emiten en un subdirectorio que coincide con la ruta base,
// de modo que Vercel sirva /warren/index.html y /warren/assets/* tal cual.
const outDir = base === '/' ? 'dist' : `dist${base.replace(/\/$/, '')}`

// https://vite.dev/config/
export default defineConfig({
  base,
  build: {
    outDir,
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
