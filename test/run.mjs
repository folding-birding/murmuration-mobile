import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ca = resolve('.certs/rootCA.pem')
if (!existsSync(ca)) {
  console.error('Local HTTPS certificates are missing. Run npm run setup:https first.')
  process.exit(1)
}
const result = spawnSync(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', ...process.argv.slice(2)], {
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, NODE_EXTRA_CA_CERTS: ca },
})
if (result.error) console.error(result.error.message)
process.exitCode = result.status ?? 1
