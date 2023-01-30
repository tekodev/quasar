
import { createViteConfig, extendViteConfig } from '../../config-tools.js'

export const spaConfig = {
  vite: async quasarConf => {
    const cfg = await createViteConfig(quasarConf)
    return extendViteConfig(cfg, quasarConf, { isClient: true })
  }
}
