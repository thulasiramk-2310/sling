import { cpSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const out = join(root, 'dist-extension')
cpSync(join(root, 'extension', 'manifest.json'), join(out, 'manifest.json'))
cpSync(join(root, 'extension', 'icons'), join(out, 'icons'), { recursive: true })
// The site favicon isn't part of the extension.
if (existsSync(join(out, 'favicon.svg'))) rmSync(join(out, 'favicon.svg'))
console.log('Extension ready in dist-extension/. Load it from chrome://extensions → Load unpacked.')
