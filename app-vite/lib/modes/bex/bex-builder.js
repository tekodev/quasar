
import { join } from 'node:path'
import { createWriteStream } from 'fs-extra'
import archiver from 'archiver'

import appPaths from '../../app-paths.js'
import { AppBuilder } from '../../app-builder.js'
import { progress } from '../../helpers/logger.js'
import { bexConfig} from './bex-config.js'
import { createManifest, copyBexAssets } from './utils.js'
import { appPackageJson } from '../../helpers/app-package-json.js'

const { name } = appPackageJson

class BexBuilder extends AppBuilder {
  async build () {
    const viteConfig = await bexConfig.vite(this.quasarConf)
    await this.buildWithVite('BEX UI', viteConfig)

    const { err } = createManifest(this.quasarConf)
    if (err !== void 0) { process.exit(1) }

    const backgroundConfig = await bexConfig.backgroundScript(this.quasarConf)
    await this.buildWithEsbuild('Background Script', backgroundConfig)

    for (const name of this.quasarConf.bex.contentScripts) {
      const contentConfig = await bexConfig.contentScript(this.quasarConf, name)
      await this.buildWithEsbuild('Content Script', contentConfig)
    }

    const domConfig = await bexConfig.domScript(this.quasarConf)
    await this.buildWithEsbuild('Dom Script', domConfig)

    copyBexAssets(this.quasarConf)

    this.printSummary(this.quasarConf.build.distDir)
    this.#bundlePackage(this.quasarConf.build.distDir)
  }

  #bundlePackage (folder) {
    const done = progress('Bundling in progress...')
    const file = join(folder, `Packaged.${ name }.zip`)

    let output = createWriteStream(file)
    let archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    })

    archive.pipe(output)
    archive.directory(folder, false)
    archive.finalize()

    done(`Bundle has been generated at: ${file}`)
  }
}

module.exports = BexBuilder
