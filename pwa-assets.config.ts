import { defineConfig } from '@vite-pwa/assets-generator/config'

// Generates the install icons referenced by the web app manifest in
// vite.config.ts. Run with `npm run generate-pwa-assets` after changing
// public/favicon.svg. Favicons and the apple-touch-icon are left alone —
// they already live in public/ and are linked from index.html.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [] },
    maskable: {
      sizes: [512],
      padding: 0.3,
      resizeOptions: { background: '#d9f0ec' },
    },
    apple: { sizes: [] },
  },
  images: ['public/favicon.svg'],
})
