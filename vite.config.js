import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: './src',
  publicDir: '../public',
  server: {
    host: true, // Allow external access
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        profile: resolve(__dirname, 'src/profile.html'),
        gallery: resolve(__dirname, 'src/gallery.html')
      }
    }
  }
})