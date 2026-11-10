import { execFile } from 'node:child_process'
import { relative, resolve } from 'node:path'
import { promisify } from 'node:util'
import type { Plugin } from 'vite'

const execute = promisify(execFile)

export function offlineExport(): Plugin {
  let root = ''
  let runtime: Promise<string> | undefined
  const bundle = () => runtime ??= execute(process.execPath, [resolve(root, 'scripts/build-offline.mjs')], {
    cwd: root, windowsHide: true, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, NODE_ENV: 'production' },
  }).then(result => result.stdout).catch(error => { runtime = undefined; throw error })

  return {
    name: 'murmuration-offline-export',
    configResolved(config) { root = config.root },
    configureServer(server) {
      server.watcher.on('all', (_event, path) => {
        const file = relative(root, path).replaceAll('\\', '/')
        if (file.startsWith('src/') || file.startsWith('public/') || file === 'scripts/build-offline.mjs') runtime = undefined
      })
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== `${server.config.base}offline-runtime.json`) return next()
        void bundle().then(payload => {
          response.setHeader('Content-Type', 'application/json')
          response.setHeader('Cache-Control', 'no-store')
          response.end(payload)
        }).catch(error => {
          server.config.logger.error(String(error))
          response.statusCode = 500
          response.end('Unable to build offline viewer')
        })
      })
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'offline-runtime.json', source: await bundle() })
    },
  }
}
