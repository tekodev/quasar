import fs from 'node:fs'
import open from 'open'
import { sync as rimraf } from 'rimraf'

const src = new URL('../dist', import.meta.url)
const dest = new URL('../dev-umd/dist', import.meta.url)

if (!fs.existsSync(src)) {
  console.error('ERROR: please "yarn build" or "npm run build" first')
  process.exit(0)
}

rimraf(dest)
fs.symlinkSync(src, dest, 'dir')

open(
  new URL('../dev-umd/index.umd.html', import.meta.url)
)
