
import { join } from 'node:path'

import { AppBuilder } from '../../app-builder.js'
import { modeConfig } from './electron-config.js'

import appPaths from '../../app-paths.js'
import { log, warn, fatal, progress } from '../../helpers/logger.js'
import { spawn } from '../../helpers/spawn.js'
import { nodePackager } from '../../helpers/node-packager.js'
import { getPackageJson } from '../../helpers/get-package-json.js'
import { getFixedDeps } from '../../helpers/get-fixed-deps.js'
import { appPackageJson } from '../../helpers/app-package-json.js'

export class AppProdBuilder extends AppBuilder {
  async build () {
    await this.#buildFiles()
    await this.#writePackageJson()
    await this.#copyElectronFiles()

    this.printSummary(join(this.quasarConf.build.distDir, 'UnPackaged'))

    if (this.argv['skip-pkg'] !== true) {
      await this.#packageFiles()
    }
  }

  async #buildFiles () {
    const viteConfig = await modeConfig.vite(this.quasarConf)
    await this.buildWithVite('Electron UI', viteConfig)

    const mainConfig = await modeConfig.main(this.quasarConf)
    await this.buildWithEsbuild('Electron Main', mainConfig)
    this.#replaceAppUrl(mainConfig.outfile)

    const preloadConfig = await modeConfig.preload(this.quasarConf)
    await this.buildWithEsbuild('Electron Preload', preloadConfig)
    this.#replaceAppUrl(preloadConfig.outfile)
  }

  // we can't do it by define() cause esbuild
  // does not accepts the syntax of the replacement
  #replaceAppUrl (file) {
    const content = this.readFile(file)
    this.writeFile(file, content.replace(/process\.env\.APP_URL/g, `"file://" + __dirname + "/index.html"`))
  }

  async #writePackageJson () {
    const pkg = JSON.parse(JSON.stringify(appPackageJson))

    if (pkg.dependencies) {
      pkg.dependencies = getFixedDeps(pkg.dependencies)
      delete pkg.dependencies['@quasar/extras']
    }

    // we don't need this (also, faster install time & smaller bundles)
    delete pkg.devDependencies
    delete pkg.browserslist
    delete pkg.scripts

    pkg.main = './electron-main.js'

    if (typeof this.quasarConf.electron.extendPackageJson === 'function') {
      this.quasarConf.electron.extendPackageJson(pkg)
    }

    this.writeFile('UnPackaged/package.json', JSON.stringify(pkg))
  }

  async #copyElectronFiles () {
    const patterns = [
      '.npmrc',
      'package-lock.json',
      '.yarnrc',
      'yarn.lock',
    ].map(filename => ({
      from: filename,
      to: './UnPackaged'
    }))

    patterns.push({
      from: appPaths.resolve.electron('icons'),
      to: './UnPackaged/icons'
    })

    this.copyFiles(patterns)
  }

  #packageFiles () {
    return new Promise(resolve => {
      spawn(
        nodePackager.name,
        [ 'install', '--production' ].concat(this.quasarConf.electron.unPackagedInstallParams),
        { cwd: join(this.quasarConf.build.distDir, 'UnPackaged') },
        code => {
          if (code) {
            fatal(`${nodePackager.name} failed installing dependencies`, 'FAIL')
          }
          resolve()
        }
      )
    }).then(async () => {
      if (typeof this.quasarConf.electron.beforePackaging === 'function') {
        log('Running beforePackaging()')
        log()

        const result = this.quasarConf.electron.beforePackaging({
          appPaths,
          unpackagedDir: join(this.quasarConf.build.distDir, 'UnPackaged')
        })

        if (result && result.then) {
          await result
        }

        log()
        log('[SUCCESS] Done running beforePackaging()')
      }
    }).then(() => {
      const bundlerName = this.quasarConf.electron.bundler
      const bundlerConfig = this.quasarConf.electron[bundlerName]
      const bundler from './bundler').getBundler(bundlerName)
      const pkgName = `electron-${bundlerName}`

      return new Promise((resolve, reject) => {
        const done = progress('Bundling app with ___...', `electron-${bundlerName}`)

        const bundlePromise = bundlerName === 'packager'
          ? bundler({
            ...bundlerConfig,
            electronVersion: getPackageJson('electron').version
          })
          : bundler.build(bundlerConfig)

        bundlePromise
          .then(() => {
            log()
            done(`${pkgName} built the app`)
            log()
            resolve()
          })
          .catch(err => {
            log()
            warn(`${pkgName} could not build`, 'FAIL')
            log()
            console.error(err + '\n')
            reject()
          })
      })
    })
  }
}
