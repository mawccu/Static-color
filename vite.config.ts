import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // relative asset paths so the built app also loads over file:// inside Electron
  base: './',
  plugins: [react(), tailwindcss()],
})
