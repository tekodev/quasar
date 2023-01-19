import fs from 'fs'
import fse from 'fs-extra'
import compileTemplate from 'lodash/template.js'

import appPaths from '../app-paths.js'
import { log, warn } from '../helpers/logger.js'
import { spawnSync } from '../helpers/spawn.js'
import { nodePackager } from '../helpers/node-packager.js'
import { ensureDeps, ensureConsistency } from '../capacitor/ensure-consistency.js'

export class Mode {
  get isInstalled () {
    return fs.existsSync(appPaths.capacitorDir)
  }

  async add (target) {
    if (this.isInstalled) {
      warn(`Capacitor support detected already. Aborting.`)
      return
    }

    const pkgPath = appPaths.resolve.app('package.json')
    const pkg = JSON.parse(
      fs.readFileSync(pkgPath, 'utf-8')
    )
    const appName = pkg.productName || pkg.name || 'Quasar App'

    if (/^[0-9]/.test(appName)) {
      warn(
        `App product name cannot start with a number. ` +
        `Please change the "productName" prop in your /package.json then try again.`
      )
      return
    }

    const { default: inquirer } = await import('inquirer')

    console.log()
    const answer = await inquirer.prompt([{
      name: 'appId',
      type: 'input',
      message: 'What is the Capacitor app id?',
      default: 'org.capacitor.quasar.app',
      validate: appId => appId ? true : 'Please fill in a value'
    }])

    log(`Creating Capacitor source folder...`)

    // Create /src-capacitor from template
    fse.ensureDirSync(appPaths.capacitorDir)

    const { default: fglob } = await import('fast-glob')
    const scope = {
      appName,
      appId: answer.appId,
      pkg,
      nodePackager
    }

    fglob.sync(['**/*'], {
      cwd: appPaths.resolve.cli('templates/capacitor')
    }).forEach(filePath => {
      const dest = appPaths.resolve.capacitor(filePath)
      const content = fs.readFileSync(appPaths.resolve.cli('templates/capacitor/' + filePath))
      fse.ensureFileSync(dest)
      fs.writeFileSync(dest, compileTemplate(content)(scope), 'utf-8')
    })

    ensureDeps()

    const { capBin } = await import('../capacitor/cap-cli.js')

    log(`Initializing capacitor...`)
    spawnSync(
      capBin,
      [
        'init',
        '--web-dir',
        'www',
        scope.appName,
        scope.appId
      ],
      { cwd: appPaths.capacitorDir }
    )

    log(`Capacitor support was added`)

    if (!target) {
      console.log()
      console.log(` No Capacitor platform has been added yet as these get installed on demand automatically when running "quasar dev" or "quasar build".`)
      log()
      return
    }

    await this.addPlatform(target)
  }

  hasPlatform (target) {
    return fs.existsSync(appPaths.resolve.capacitor(target))
  }

  async addPlatform (target) {
    ensureConsistency()

    if (this.hasPlatform(target)) {
      return
    }

    const { capBin, capVersion } = await import('../capacitor/cap-cli.js')

    if (capVersion >= 3) {
      nodePackager.installPackage(
        `@capacitor/${target}@^${capVersion}.0.0-beta.0`,
        { displayName: 'Capacitor platform', cwd: appPaths.capacitorDir }
      )
    }

    log(`Adding Capacitor platform "${target}"`)
    spawnSync(
      capBin,
      ['add', target],
      { cwd: appPaths.capacitorDir }
    )
  }

  remove() {
    if (!this.isInstalled) {
      warn(`No Capacitor support detected. Aborting.`)
      return
    }

    log(`Removing Capacitor folder`)
    fse.removeSync(appPaths.capacitorDir)

    log(`Capacitor support was removed`)
  }
}
