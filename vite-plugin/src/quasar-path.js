
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export const quasarPath = dirname(require.resolve('quasar/package.json'))
