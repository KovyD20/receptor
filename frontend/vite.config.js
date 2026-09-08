import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
})
