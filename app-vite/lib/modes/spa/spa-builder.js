
import { AppBuilder } from '../../app-builder.js'
import { spaConfig } from './spa-config.js'

export class AppProdBuilder extends AppBuilder {
  async build () {
    const viteConfig = await spaConfig.vite(this.quasarConf)
    await this.buildWithVite('SPA UI', viteConfig)

    this.printSummary(this.quasarConf.build.distDir, true)
  }
}
