import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'

const result = await build({
  configFile: false,
  publicDir: false,
  logLevel: 'silent',
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    write: false,
    sourcemap: false,
    minify: 'esbuild',
    lib: { entry: 'src/offline/main.tsx', name: 'MurmurationOffline', formats: ['iife'] },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
const outputs = (Array.isArray(result) ? result : [result]).flatMap(bundle => bundle.output)
const script = outputs.find(item => item.type === 'chunk')
const stylesheet = outputs.find(item => item.type === 'asset' && item.fileName.endsWith('.css'))
if (!script || !stylesheet || script.imports.length || script.dynamicImports.length || outputs.length !== 2) {
  throw new Error('Offline export must contain exactly one script and one embedded stylesheet')
}
const licenses = await Promise.all(['public/Pretendard-LICENSE.txt', 'node_modules/react/LICENSE', 'node_modules/react-dom/LICENSE', 'node_modules/three/LICENSE'].map(async file => `${file}\n\n${await readFile(file, 'utf8')}`))
process.stdout.write(JSON.stringify({ script: script.code, css: String(stylesheet.source), notices: licenses.join('\n\n') }))
