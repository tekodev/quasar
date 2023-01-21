import { existsSync, readFileSync } from 'node:fs'
import appPaths from '../app-paths.js'

const appPkg = JSON.parse(
  readFileSync(
    appPaths.resolve.app('package.json'),
    'utf-8'
  )
)

// See: https://eslint.org/docs/user-guide/configuring/configuration-files
export const eslintConfigFile = [
  '.eslintrc.cjs',
  '.eslintrc.js',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  '.eslintrc.json',
].find(path => existsSync(appPaths.resolve.app(path)))

export const hasEslint = appPkg.eslintConfig || eslintConfigFile
