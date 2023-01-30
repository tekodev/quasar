
import { readFileSync } from 'node:fs'

import appPaths from '../app-paths.js'

export const appPackageJson = JSON.parse(
  readFileSync(appPaths.resolve.app('package.json'), 'utf-8')
)
