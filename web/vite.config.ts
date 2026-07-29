import { defineConfig } from 'vite'

export default defineConfig({
  base: '/csc3206-assignment2/',
  build: {
    target: 'esnext'
  },
  worker: {
    format: 'es'
  }
})
