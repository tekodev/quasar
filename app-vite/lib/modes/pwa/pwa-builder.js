
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { AppBuilder } from '../../app-builder.js'
import { pwaConfig } from './pwa-config.js'
import { injectPwaManifest, buildPwaServiceWorker } from './utils.js'

export class PwaBuilder extends AppBuilder {
  async build () {
    injectPwaManifest(this.quasarConf)

    const viteConfig = await pwaConfig.vite(this.quasarConf)
    await this.buildWithVite('PWA UI', viteConfig)

    // also update ssr-builder.js when changing here
    writeFileSync(
      join(this.quasarConf.build.distDir, this.quasarConf.pwa.manifestFilename),
      JSON.stringify(
        this.quasarConf.htmlVariables.pwaManifest,
        null,
        this.quasarConf.build.minify !== false ? void 0 : 2
      ),
      'utf-8'
    )

    // also update ssr-builder.js when changing here
    if (this.quasarConf.pwa.workboxMode === 'injectManifest') {
      const esbuildConfig = await pwaConfig.customSw(this.quasarConf)
      await this.buildWithEsbuild('injectManifest Custom SW', esbuildConfig)
    }

    // also update ssr-builder.js when changing here
    const workboxConfig = await pwaConfig.workbox(this.quasarConf)
    await buildPwaServiceWorker(this.quasarConf.pwa.workboxMode, workboxConfig)

    this.printSummary(this.quasarConf.build.distDir, true)
  }
}
