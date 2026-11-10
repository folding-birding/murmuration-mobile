import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { offlineExport } from './tooling/offline-plugin'

export default defineConfig(({ command }) => {
  const keyPath = resolve('.certs/localhost-key.pem')
  const certPath = resolve('.certs/localhost.pem')
  if (command === 'serve' && (!existsSync(keyPath) || !existsSync(certPath))) {
    throw new Error('Local HTTPS certificates are missing. Run npm run setup:https first.')
  }
  const https = command === 'serve' ? { key: readFileSync(keyPath), cert: readFileSync(certPath) } : undefined
  return {
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [react(), offlineExport()],
    server: { https, watch: { ignored: ['**/.certs/**', '**/.qa/**', '**/test-results/**', '**/playwright-report/**'] } },
    preview: { https },
    build: {
      rollupOptions: {
        input: { home: resolve('index.html'), entries: resolve('entries/index.html') },
      },
    },
  }
})
