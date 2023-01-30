
import { readFileSync } from 'node:fs'

import appPaths from '../app-paths.js'
import { fatal } from '../helpers/logger.js'
import { nodePackager } from '../helpers/node-packager.js'
import { appPackageJson } from '../../helpers/app-package-json.js'

const versions = {
  packager: '15.2.0',
  builder: '22.4.0'
}

function isValidName (bundlerName) {
  return ['packager', 'builder'].includes(bundlerName)
}

function installBundler (bundlerName) {
  nodePackager.installPackage(
    `electron-${bundlerName}@^${versions[bundlerName]}`,
    { isDev: true, displayName: `electron-${bundlerName}` }
  )
}

export function bundlerIsInstalled (bundlerName) {
  const pgkName = `electron-${bundlerName}`
  return (
    (appPackageJson.devDependencies && appPackageJson.devDependencies[pgkName])
    || (appPackageJson.dependencies && appPackageJson.dependencies[pgkName])
  ) !== void 0
}

export function ensureInstall (bundlerName) {
  if (!isValidName(bundlerName)) {
    fatal(`Unknown bundler "${ bundlerName }" for Electron`)
  }

  if (!bundlerIsInstalled(bundlerName)) {
    installBundler(bundlerName)
  }
}

export function getDefaultName () {
  if (bundlerIsInstalled('packager')) {
    return 'packager'
  }

  if (bundlerIsInstalled('builder')) {
    return 'builder'
  }

  return 'packager'
}
