
import fs from 'node:fs'
import fse from 'fs-extra'

import appPaths from '../app-paths.js'
import { log, warn } from '../helpers/logger.js'
import { nodePackager } from '../helpers/node-packager.js'
import { hasTypescript } from '../helpers/has-typescript.js'
import { hasEslint, eslintConfigFile } from '../helpers/has-eslint.js'

const pwaDeps = {
  'workbox-webpack-plugin': '^6.0.0'
}

export class Mode {
  get isInstalled () {
    return fs.existsSync(appPaths.pwaDir)
  }

  add () {
    if (this.isInstalled) {
      warn('PWA support detected already. Aborting.')
      return
    }

    nodePackager.installPackage(
      Object.entries(pwaDeps).map(([name, version]) => `${name}@${version}`),
      { isDev: true, displayName: 'PWA dependencies' }
    )

    log('Creating PWA source folder...')

    const format = hasTypescript ? 'ts' : 'default'
    fse.copySync(
      appPaths.resolve.cli(`templates/pwa/${format}`),
      appPaths.pwaDir,
      // Copy .eslintrc.js only if the app has ESLint
      { filter: src => hasEslint || !src.endsWith(eslintConfigFile) }
    )

    fse.copySync(
      appPaths.resolve.cli('templates/pwa/pwa-flag.d.ts'),
      appPaths.resolve.pwa('pwa-flag.d.ts')
    )

    log('Copying PWA icons to /public/icons/ (if they are not already there)...')
    fse.copySync(
      appPaths.resolve.cli('templates/pwa-icons'),
      appPaths.resolve.app('public/icons'),
      { overwrite: false }
    )

    log('PWA support was added')
  }

  remove () {
    if (!this.isInstalled) {
      warn('No PWA support detected. Aborting.')
      return
    }

    log('Removing PWA source folder')
    fse.removeSync(appPaths.pwaDir)

    nodePackager.uninstallPackage(Object.keys(pwaDeps), {
      displayName: 'PWA dependencies'
    })

    log('PWA support was removed')
  }
}
