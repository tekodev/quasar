import { existsSync, readFileSync } from 'node:fs'
import appPaths from '../app-paths.js'

const appPkg = JSON.parse(
  readFileSync(
    appPaths.resolve.app('package.json'),
    'utf-8'
  )
)

function appHasEslint () {
  // See: https://eslint.org/docs/user-guide/configuring/configuration-files
  const configPaths = [
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    '.eslintrc.json',
  ]

  return (
    configPaths.some(path => existsSync(appPaths.resolve.app(path))) ||
    appPkg.eslintConfig !== undefined
  )
}

export const hasEslint = appHasEslint()
