import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vibePlugin from '../vite-plugin-vibe.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vibePlugin()],
  server: {
    port: 3067
  }
})
