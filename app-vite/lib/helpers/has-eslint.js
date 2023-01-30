
import { existsSync } from 'node:fs'

import appPaths from '../app-paths.js'
import { appPackageJson } from './app-package-json.js'

// See: https://eslint.org/docs/user-guide/configuring/configuration-files
export const eslintConfigFile = [
  '.eslintrc.cjs',
  '.eslintrc.js',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  '.eslintrc.json',
].find(path => existsSync(appPaths.resolve.app(path)))

export const hasEslint = appPackageJson.eslintConfig || eslintConfigFile
