
import { readFileSync } from 'node:fs'
import { sources } from 'webpack'

import appPaths from '../../app-paths.js'
import { getFixedDeps } from '../../helpers/get-fixed-deps.js'

export class ElectronPackageJsonPlugin {
  constructor (cfg = {}) {
    this.cfg = cfg

    const pkg = JSON.parse(
      readFileSync(appPaths.resolve.app('package.json'), 'utf-8')
    )

    if (pkg.dependencies) {
      pkg.dependencies = getFixedDeps(pkg.dependencies)
      delete pkg.dependencies['@quasar/extras']
    }

    // we don't need this (also, faster install time & smaller bundles)
    delete pkg.devDependencies
    delete pkg.browserslist
    delete pkg.scripts

    pkg.main = './electron-main.js'

    if (this.cfg.electron.extendPackageJson) {
      this.cfg.electron.extendPackageJson(pkg)
    }

    this.source = JSON.stringify(pkg)
  }

  apply (compiler) {
    compiler.hooks.thisCompilation.tap('package.json', compilation => {
      compilation.emitAsset('package.json', new sources.RawSource(this.source))
    })
  }
}
