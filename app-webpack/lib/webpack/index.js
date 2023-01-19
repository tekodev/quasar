
import { createChain } from './create-chain.js'
import { log } from '../helpers/logger.js'
import { webpackNames } from './symbols.js'
import { extensionRunner } from '../app-extension/extensions-runner.js'

async function getWebpackConfig (chain, cfg, {
  name,
  cfgExtendBase = cfg.build,
  hookSuffix = '',
  cmdSuffix = '',
  invokeParams
}) {
  await extensionRunner.runHook('chainWebpack' + hookSuffix, async hook => {
    log(`Extension(${hook.api.extId}): Chaining "${name}" Webpack config`)
    await hook.fn(chain, invokeParams, hook.api)
  })

  if (typeof cfgExtendBase[ 'chainWebpack' + cmdSuffix ] === 'function') {
    log(`Chaining "${name}" Webpack config`)
    await cfgExtendBase[ 'chainWebpack' + cmdSuffix ](chain, invokeParams)
  }

  const webpackConfig = chain.toConfig()

  await extensionRunner.runHook('extendWebpack' + hookSuffix, async hook => {
    log(`Extension(${hook.api.extId}): Extending "${name}" Webpack config`)
    await hook.fn(webpackConfig, invokeParams, hook.api)
  })

  if (typeof cfgExtendBase[ 'extendWebpack' + cmdSuffix ] === 'function') {
    log(`Extending "${name}" Webpack config`)
    await cfgExtendBase[ 'extendWebpack' + cmdSuffix ](webpackConfig, invokeParams)
  }

  if (cfg.ctx.dev) {
    webpackConfig.optimization = webpackConfig.optimization || {}
    webpackConfig.optimization.emitOnErrors = false

    webpackConfig.infrastructureLogging = Object.assign(
      { colors: true, level: 'warn' },
      webpackConfig.infrastructureLogging
    )
  }

  return webpackConfig
}

async function getCSW (cfg) {
  const { createCustomSw } = await import('./pwa/create-custom-sw.js')

  // csw - custom service worker
  return getWebpackConfig(createCustomSw(cfg, webpackNames.pwa.csw), cfg, {
    name: webpackNames.pwa.csw,
    cfgExtendBase: cfg.pwa,
    hookSuffix: 'PwaCustomSW',
    cmdSuffix: 'CustomSW',
    invokeParams: { isClient: true, isServer: false }
  })
}

async function getSPA (cfg) {
  const { injectSpa } = await import('./spa/index.js')
  const chain = await createChain(cfg, webpackNames.spa.renderer)

  injectSpa(chain, cfg)

  return {
    renderer: await getWebpackConfig(chain, cfg, {
      name: webpackNames.spa.renderer,
      invokeParams: { isClient: true, isServer: false }
    })
  }
}

async function getPWA (cfg) {
  // inner function so csw gets created first
  // (affects progress bar order)

  async function getRenderer () {
    const { injectSpa } = await import('./spa/index.js')
    const { injectPwa } = await import('./pwa/index.js')

    const chain = await createChain(cfg, webpackNames.pwa.renderer)

    injectSpa(chain, cfg) // extending a SPA
    injectPwa(chain, cfg)

    return getWebpackConfig(chain, cfg, {
      name: webpackNames.pwa.renderer,
      invokeParams: { isClient: true, isServer: false }
    })
  }

  return {
    ...(cfg.pwa.workboxPluginMode === 'InjectManifest' ? { csw: await getCSW(cfg) } : {}),
    renderer: await getRenderer()
  }
}

async function getCordova (cfg) {
  const { injectCordova } = await import('./cordova/index.js')
  const chain = await createChain(cfg, webpackNames.cordova.renderer)

  injectCordova(chain, cfg)

  return {
    renderer: await getWebpackConfig(chain, cfg, {
      name: webpackNames.cordova.renderer,
      invokeParams: { isClient: true, isServer: false }
    })
  }
}

async function getCapacitor (cfg) {
  const { injectCapacitor } = await import('./capacitor/index.js')
  const chain = await createChain(cfg, webpackNames.capacitor.renderer)

  injectCapacitor(chain, cfg)

  return {
    renderer: await getWebpackConfig(chain, cfg, {
      name: webpackNames.capacitor.renderer,
      invokeParams: { isClient: true, isServer: false }
    })
  }
}

async function getElectron (cfg) {
  const rendererChain = await createChain(cfg, webpackNames.electron.renderer)

  const { injectElectronPreload } = await import('./electron/preload.js')
  const preloadChain = await injectElectronPreload(cfg, webpackNames.electron.preload)

  const { injectElectronMain } = await import('./electron/main.js')
  const mainChain = await injectElectronMain(cfg, webpackNames.electron.main)

  const { injectElectronRenderer } = await import('./electron/renderer.js')
  injectElectronRenderer(rendererChain, cfg)

  return {
    renderer: await getWebpackConfig(rendererChain, cfg, {
      name: webpackNames.electron.renderer,
      invokeParams: { isClient: true, isServer: false }
    }),
    preload: await getWebpackConfig(preloadChain, cfg, {
      name: webpackNames.electron.preload,
      cfgExtendBase: cfg.electron,
      hookSuffix: 'PreloadElectronProcess',
      cmdSuffix: 'Preload',
      invokeParams: { isClient: false, isServer: true }
    }),
    main: await getWebpackConfig(mainChain, cfg, {
      name: webpackNames.electron.main,
      cfgExtendBase: cfg.electron,
      hookSuffix: 'MainElectronProcess',
      cmdSuffix: 'Main',
      invokeParams: { isClient: false, isServer: true }
    })
  }
}

async function getSSR (cfg) {
  const { injectSSRClient } = await import('./ssr/client.js')
  const client = await createChain(cfg, webpackNames.ssr.clientSide)
  injectSSRClient(client, cfg)

  if (cfg.ctx.mode.pwa) {
    const { injectPwa } = await import('./pwa/index.js')
    injectPwa(client, cfg) // extending a PWA
  }

  const { injectSSRServer } = await import('./ssr/server.js')
  const server = await createChain(cfg, webpackNames.ssr.serverSide)
  injectSSRServer(server, cfg)

  const { injectSSRWebserver } = await import('./ssr/webserver.js')
  injectSSRWebserver(cfg, webpackNames.ssr.webserver)

  return {
    ...(cfg.pwa.workboxPluginMode === 'InjectManifest' ? { csw: await getCSW(cfg) } : {}),

    webserver: await getWebpackConfig(webserver, cfg, {
      name: webpackNames.ssr.webserver,
      cfgExtendBase: cfg.ssr,
      hookSuffix: 'Webserver',
      cmdSuffix: 'Webserver',
      invokeParams: { isClient: false, isServer: true }
    }),

    clientSide: await getWebpackConfig(client, cfg, {
      name: webpackNames.ssr.clientSide,
      invokeParams: { isClient: true, isServer: false }
    }),

    serverSide: await getWebpackConfig(server, cfg, {
      name: webpackNames.ssr.serverSide,
      invokeParams: { isClient: false, isServer: true }
    })
  }
}

async function getBEX (cfg) {
  const { injectBexRenderer } = await import('./bex/renderer.js')
  const rendererChain = await createChain(cfg, webpackNames.bex.renderer)
  await injectBexRenderer(rendererChain, cfg)

  const { injectBexMain } = await import('./bex/main.js')
  const mainChain = await createChain(cfg, webpackNames.bex.main)
  injectBexMain(mainChain, cfg)

  return {
    renderer: await getWebpackConfig(rendererChain, cfg, {
      name: webpackNames.bex.renderer,
      invokeParams: { isClient: true, isServer: false }
    }),

    main: await getWebpackConfig(mainChain, cfg, {
      name: webpackNames.bex.main,
      hookSuffix: 'MainBexProcess',
      invokeParams: { isClient: true, isServer: false }
    })
  }
}

// returns a Promise
export function createWebpackConfig (cfg) {
  const { mode } = cfg.ctx

  if (mode.ssr) {
    return getSSR(cfg)
  }

  if (mode.electron) {
    return getElectron(cfg)
  }

  if (mode.cordova) {
    return getCordova(cfg)
  }

  if (mode.capacitor) {
    return getCapacitor(cfg)
  }

  if (mode.pwa) {
    return getPWA(cfg)
  }

  if (mode.bex) {
    return getBEX(cfg)
  }

  return getSPA(cfg)
}
