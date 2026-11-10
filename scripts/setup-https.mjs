import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

try {
  const caRoot = execFileSync('mkcert', ['-CAROOT'], { encoding: 'utf8', windowsHide: true }).trim()
  mkdirSync('.certs', { recursive: true, mode: 0o700 })
  execFileSync('mkcert', ['-cert-file', resolve('.certs/localhost.pem'), '-key-file', resolve('.certs/localhost-key.pem'), 'localhost', '127.0.0.1', '::1'], { stdio: 'inherit', windowsHide: true })
  copyFileSync(resolve(caRoot, 'rootCA.pem'), resolve('.certs/rootCA.pem'))
  console.log('HTTPS certificates are ready. Run npm run dev and open https://localhost:4000/entries/.')
} catch (error) {
  console.error('Install mkcert and run mkcert -install once on this PC, then retry npm run setup:https.')
  console.error(error.message)
  process.exitCode = 1
}
