import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build je jeden soběstačný dist/index.html (JS i CSS uvnitř): jde stáhnout
// a otevřít dvojklikem bez serveru, a stejný soubor běží i na GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
})
