
import appPaths from '../../app-paths.js'
import { createViteConfig, extendViteConfig } from '../../config-tools.js'
import { cordovaPlatformInject } from './vite-plugin.dev.cordova-platform-inject.js'

export const cordovaConfig = {
  vite: async quasarConf => {
    const cfg = await createViteConfig(quasarConf)

    if (quasarConf.ctx.dev === true) {
      cfg.plugins.unshift(
        cordovaPlatformInject(quasarConf)
      )
    }
    else {
      cfg.build.outDir = appPaths.resolve.cordova('www')
    }

    return extendViteConfig(cfg, quasarConf, { isClient: true })
  }
}
