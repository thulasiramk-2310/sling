import { cpSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const pkgDir = join(process.cwd(), 'node_modules', '@mediapipe', 'tasks-vision')
const out = join(process.cwd(), 'public', 'mediapipe')

mkdirSync(out, { recursive: true })
for (const file of [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]) {
  cpSync(join(pkgDir, 'wasm', file), join(out, file))
}
