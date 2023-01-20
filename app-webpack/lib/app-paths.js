
import { existsSync } from 'node:fs'
import { normalize, resolve, join, sep } from 'node:path'

import { fatal } from './helpers/logger.js'

function getAppInfo () {
  let appDir = process.cwd()

  while (appDir.length && appDir[appDir.length - 1] !== sep) {
    if (existsSync(join(appDir, 'quasar.config.js'))) {
      return { appDir, quasarConfigFilename: 'quasar.config.js', quasarConfigFileFormat: 'module' }
    }

    if (existsSync(join(appDir, 'quasar.config.ts'))) {
      return { appDir, quasarConfigFilename: 'quasar.config.ts', quasarConfigFileFormat: 'ts' }
    }

    if (existsSync(join(appDir, 'quasar.config.cjs'))) {
      return { appDir, quasarConfigFilename: 'quasar.config.cjs', quasarConfigFileFormat: 'commonjs' }
    }

    appDir = normalize(join(appDir, '..'))
  }

  fatal(`Error. This command must be executed inside a Quasar project folder.`)
}

const { appDir, quasarConfigFilename, quasarConfigFileFormat } = getAppInfo()
const cliDir = new URL('..', import.meta.url).pathname
const srcDir = resolve(appDir, 'src')
const pwaDir = resolve(appDir, 'src-pwa')
const ssrDir = resolve(appDir, 'src-ssr')
const cordovaDir = resolve(appDir, 'src-cordova')
const capacitorDir = resolve(appDir, 'src-capacitor')
const electronDir = resolve(appDir, 'src-electron')
const bexDir = resolve(appDir, 'src-bex')

export default {
  cliDir,
  appDir,
  srcDir,
  pwaDir,
  ssrDir,
  cordovaDir,
  capacitorDir,
  electronDir,
  bexDir,
  quasarConfigFilename: resolve(appDir, quasarConfigFilename),
  quasarConfigFileFormat,

  resolve: {
    cli: dir => join(cliDir, dir),
    app: dir => join(appDir, dir),
    src: dir => join(srcDir, dir),
    pwa: dir => join(pwaDir, dir),
    ssr: dir => join(ssrDir, dir),
    cordova: dir => join(cordovaDir, dir),
    capacitor: dir => join(capacitorDir, dir),
    electron: dir => join(electronDir, dir),
    bex: dir => join(bexDir, dir)
  }
}
