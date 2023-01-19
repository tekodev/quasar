
import fs from 'node:fs'
import fse from 'fs-extra'

import appPaths from '../app-paths.js'
import { log, warn } from '../helpers/logger.js'
import { nodePackager } from '../helpers/node-packager.js'
import { hasTypescript } from '../helpers/has-typescript.js'
import { bundlerIsInstalled } from '../electron/bundler.js'

const electronDeps = {
  'electron': 'latest'
}

export class Mode {
  get isInstalled () {
    return fs.existsSync(appPaths.electronDir)
  }

  add () {
    if (this.isInstalled) {
      warn('Electron support detected already. Aborting.')
      return
    }

    nodePackager.installPackage(
      Object.entries(electronDeps).map(([name, version]) => `${name}@${version}`),
      { isDev: true, displayName: 'Electron dependencies' }
    )

    log('Creating Electron source folder...')

    const format = hasTypescript ? 'ts' : 'default'
    fse.copySync(
      appPaths.resolve.cli(`templates/electron/${format}`),
      appPaths.electronDir
    )

    fse.copySync(
      appPaths.resolve.cli('templates/electron/electron-flag.d.ts'),
      appPaths.resolve.electron('electron-flag.d.ts')
    )

    log('Creating Electron icons folder...')
    fse.copySync(
      appPaths.resolve.cli('templates/electron/icons'),
      appPaths.resolve.electron('icons')
    )

    log('Electron support was added')
  }

  remove () {
    if (!this.isInstalled) {
      warn('No Electron support detected. Aborting.')
      return
    }

    log('Removing Electron source folder')
    fse.removeSync(appPaths.electronDir)

    const deps = Object.keys(electronDeps)

    ;['packager', 'builder'].forEach(bundlerName => {
      if (bundlerIsInstalled(bundlerName)) {
        deps.push(`electron-${bundlerName}`)
      }
    })

    nodePackager.uninstallPackage(deps, { displayName: 'Electron dependencies' })

    log('Electron support was removed')
  }
}
