import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { writeFileSync, readFileSync } from 'fs'

// Plugin: ensure viewport meta is in built HTML + create 404.html for GH Pages
function ghPagesSpaPlugin() {
  return {
    name: 'gh-pages-spa',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      const indexPath = resolve(distDir, 'index.html')

      try {
        let html = readFileSync(indexPath, 'utf-8')

        // Ensure viewport meta tag exists
        if (!html.includes('name="viewport"')) {
          html = html.replace(
            '<head>',
            '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />'
          )
          writeFileSync(indexPath, html)
        }

        // Copy index.html → 404.html for GitHub Pages SPA routing
        writeFileSync(resolve(distDir, '404.html'), html)
        console.log('✅ Created 404.html for GitHub Pages SPA support')
      } catch (e) {
        console.warn('gh-pages-spa plugin: could not process dist/index.html', e)
      }
    },
  }
}

// GitHub Pages serves the site from /<repo-name>/. The router basename and
// the PWA scope are both derived from this, so it is the only place to change.
const BASE = '/LingoDrill-PWA/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    ghPagesSpaPlugin(),
    VitePWA({
      // 'prompt' without a prompt UI: a new version installs in the background
      // and takes over the next time the app is opened, instead of reloading
      // the page mid-drill or mid-edit.
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        id: BASE,
        name: 'LingoDrill',
        short_name: 'LingoDrill',
        description: 'Language learning by drilling audio fragments',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#faf8ff',
        theme_color: '#14b8ab',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Audio, subtitles and sequences live in IndexedDB, so precaching the
        // app shell is enough for the whole app to work offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Deep links (/file/:id/player/:seqId) are client routes: serve the shell.
        navigateFallback: `${BASE}index.html`,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})