import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  build: { outDir: 'dist' },
  resolve: {
    alias: {
      'lucide': resolve('node_modules/lucide/dist/esm/lucide/src/lucide.js'),
    },
  },
})
