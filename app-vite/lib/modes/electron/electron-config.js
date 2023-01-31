
import { join } from 'node:path'

import appPaths from '../../app-paths.js'

import { createViteConfig, extendViteConfig, extendEsbuildConfig, createNodeEsbuildConfig } from '../../config-tools.js'
import { parseEnv } from '../../parse-env.js'

export const modeConfig = {
  vite: async quasarConf => {
    const cfg = await createViteConfig(quasarConf)

    if (quasarConf.ctx.prod === true) {
      cfg.build.outDir = join(quasarConf.build.distDir, 'UnPackaged')
    }

    return extendViteConfig(cfg, quasarConf, { isClient: true })
  },

  main: async quasarConf => {
    const cfg = await createNodeEsbuildConfig(quasarConf, 'cjs', { cacheSuffix: 'electron-main' })

    // need an absolute path, otherwise esbuild's "packages: external" will consider
    // the entry point as external too and will error out
    cfg.entryPoints = [ appPaths.resolve.app(quasarConf.sourceFiles.electronMain) ]

    cfg.outfile = quasarConf.ctx.dev === true
      ? appPaths.resolve.app('.quasar/electron/electron-main.js')
      : join(quasarConf.build.distDir, 'UnPackaged/electron-main.js')

    cfg.define = {
      ...cfg.define,
      ...parseEnv({
        QUASAR_ELECTRON_PRELOAD: quasarConf.ctx.dev === true
          ? appPaths.resolve.app(`.quasar/electron/electron-preload.js`)
          : 'electron-preload.js',
        QUASAR_PUBLIC_FOLDER: quasarConf.ctx.dev === true
          ? appPaths.publicDir
          : '.'
      }, {})
    }

    return extendEsbuildConfig(cfg, quasarConf.electron, 'ElectronMain')
  },

  preload: async quasarConf => {
    const cfg = await createNodeEsbuildConfig(quasarConf, 'cjs', { cacheSuffix: 'electron-preload' })

    // need an absolute path, otherwise esbuild's "packages: external" will consider
    // the entry point as external too and will error out
    cfg.entryPoints = [ appPaths.resolve.app(quasarConf.sourceFiles.electronPreload) ]

    cfg.outfile = quasarConf.ctx.dev === true
      ? appPaths.resolve.app('.quasar/electron/electron-preload.js')
      : join(quasarConf.build.distDir, 'UnPackaged/electron-preload.js')

    cfg.define = {
      ...cfg.define,
      ...parseEnv({
        QUASAR_ELECTRON_PRELOAD: quasarConf.ctx.dev === true
          ? appPaths.resolve.app(`.quasar/electron/electron-preload.js`)
          : 'electron-preload.js',
        QUASAR_PUBLIC_FOLDER: quasarConf.ctx.dev === true
          ? appPaths.publicDir
          : '.'
      }, {})
    }

    return extendEsbuildConfig(cfg, quasarConf.electron, 'ElectronPreload')
  }
}
