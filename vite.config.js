import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom domain (epwonna.at) connected — site lives at the domain root,
// so base is '/', not a repo subpath. If you ever go back to plain
// GitHub Pages without a custom domain, set this to '/epwonna/' again —
// and flip segmentCount back to 1 in public/404.html to match.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
