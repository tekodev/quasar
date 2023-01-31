
import { AppBuilder } from '../../app-builder.js'
import { modeConfig } from './spa-config.js'

export class AppProdBuilder extends AppBuilder {
  async build () {
    const viteConfig = await modeConfig.vite(this.quasarConf)
    await this.buildWithVite('SPA UI', viteConfig)

    this.printSummary(this.quasarConf.build.distDir, true)
  }
}
