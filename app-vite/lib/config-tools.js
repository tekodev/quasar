
import { readFileSync } from 'node:fs'
import { mergeConfig: mergeViteConfig } from 'vite'
import { quasar: quasarVitePlugin } from '@quasar/vite-plugin'
import vueVitePlugin from '@vitejs/plugin-vue'
import { merge } from 'webpack-merge'
import { removeSync } from 'fs-extra'

import appPaths from './app-paths.js'
import { parseEnv } from './parse-env.js'
import { getPackage } from './helpers/get-package.js'
import { log, warn, tip } from './helpers/logger.js'
import { extensionRunner } from './app-extension/extensions-runner.js'
import { appPackageJson } from './helpers/app-package-json.js'

import { quasarVitePluginIndexHtmlTransform } from './plugins/vite.index-html-transform.js'
import { quasarViteStripFilenameHashes } from './plugins/vite.strip-filename-hashes.js'

const { dependencies:cliDepsObject } = JSON.parse(
  readFileSync(appPaths.resolve.cli('package.json'), 'utf-8')
)

const cliDeps = Object.keys(cliDepsObject)

function parseVitePlugins (entries) {
  const acc = []
  let showTip = false

  entries.forEach(entry => {
    if (!entry) {
      // example:
      // [
      //   ctx.dev ? [ ... ] : null,
      //   // ...
      // ]
      return
    }

    if (Array.isArray(entry) === false) {
      if (typeof entry === 'function') {
        showTip = true
      }

      acc.push(entry)
      return
    }

    const [ name, opts ] = entry

    if (typeof name === 'function') {
      acc.push(name(opts))
      return
    }

    if (Object(name) === name) {
      acc.push(name)
      return
    }

    if (typeof name !== 'string') {
      console.log(name)
      warn('quasar.config.js > invalid Vite plugin specified: ' + name)
      warn(`Correct form: [ 'my-vite-plugin-name', { /* opts */ } ] or [ pluginFn, { /* opts */ } ]`)
      return
    }

    const plugin = await getPackage(name)

    if (!plugin) {
      warn('quasar.config.js > invalid Vite plugin specified (cannot find it): ' + name)
      return
    }

    acc.push((plugin.default || plugin)(opts))
  })

  if (showTip === true) {
    tip(`If you want changes to quasar.config.js > build > vitePlugins to be picked up, specify them in this form: [ [ 'plugin-name', { /* opts */ } ], ... ] or [ [ pluginFn, { /* opts */ } ], ... ]`)
  }

  return acc
}

export function createViteConfig (quasarConf, quasarRunMode) {
  const { ctx, build } = quasarConf
  const cacheSuffix = quasarRunMode || ctx.modeName
  const cacheDir = appPaths.resolve.app(`node_modules/.q-cache/vite/${ cacheSuffix }`)

  if (quasarConf.build.rebuildCache === true) {
    removeSync(cacheDir)
  }

  const vueVitePluginOptions = quasarRunMode !== 'ssr-server'
    ? build.viteVuePluginOptions
    : merge({
        ssr: true,
        template: { ssr: true }
      }, build.viteVuePluginOptions)

  const viteConf = {
    configFile: false,
    root: appPaths.appDir,
    base: build.publicPath,
    publicDir: build.ignorePublicFolder === true
      ? false
      : appPaths.publicDir,
    clearScreen: false,
    logLevel: 'warn',
    mode: ctx.dev === true ? 'development' : 'production',
    cacheDir,
    define: parseEnv(build.env, build.rawDefine),

    resolve: {
      alias: build.alias
    },

    build: {
      target: quasarRunMode === 'ssr-server'
        ? build.target.node
        : build.target.browser,
      polyfillModulePreload: build.polyfillModulePreload,
      emptyOutDir: false,
      minify: build.minify,
      sourcemap: build.sourcemap === true
        ? 'inline'
        : build.sourcemap || false
    },

    optimizeDeps: {
      entries: [ 'index.html' ]
    },

    plugins: [
      vueVitePlugin(vueVitePluginOptions),
      quasarVitePlugin({
        runMode: quasarRunMode || 'web-client',
        autoImportComponentCase: quasarConf.framework.autoImportComponentCase,
        sassVariables: quasarConf.metaConf.css.variablesFile,
        devTreeshaking: quasarConf.build.devQuasarTreeshaking === true
      }),
      ...parseVitePlugins(build.vitePlugins)
    ]
  }

  if (quasarRunMode !== 'ssr-server') {
    if (ctx.prod === true && quasarConf.build.useFilenameHashes !== true) {
      viteConf.plugins.push(quasarViteStripFilenameHashes())
    }

    if (quasarRunMode !== 'ssr-client' || quasarConf.ctx.prod === true) {
      viteConf.plugins.unshift(
        quasarVitePluginIndexHtmlTransform(quasarConf)
      )
    }
  }

  if (ctx.dev) {
    viteConf.server = quasarConf.devServer
  }
  else {
    viteConf.build.outDir = build.distDir

    const analyze = quasarConf.build.analyze
    if (analyze) {
      viteConf.plugins.push(
        require('rollup-plugin-visualizer').visualizer({
          open: true,
          filename: `.quasar/stats-${ quasarRunMode }.html`,
          ...(Object(analyze) === analyze ? analyze : {})
        })
      )
    }
  }

  if (quasarRunMode !== 'ssr-server') {
    const { warnings, errors } = quasarConf.eslint
    if (warnings === true || errors === true) {
      // require only if actually needed (as it imports app's eslint pkg)
      const quasarVitePluginESLint from './plugins/vite.eslint')
      viteConf.plugins.push(
        quasarVitePluginESLint(quasarConf, { cacheSuffix })
      )
    }
  }

  return viteConf
}

export function extendViteConfig (viteConf, quasarConf, invokeParams) {
  const opts = {
    isClient: false,
    isServer: false,
    ...invokeParams
  }

  if (typeof quasarConf.build.extendViteConf === 'function') {
    quasarConf.build.extendViteConf(viteConf, opts)
  }

  const promise = extensionRunner.runHook('extendViteConf', async hook => {
    log(`Extension(${hook.api.extId}): Extending Vite config`)
    await hook.fn(viteConf, opts, hook.api)
  })

  return promise.then(() => viteConf)
}

export function createNodeEsbuildConfig (quasarConf, getLinterOpts) {
  const { dependencies:appDeps = {}, devDependencies:appDevDeps = {} } = appPackageJson

  const cfg = {
    platform: 'node',
    target: quasarConf.build.target.node,
    format: 'cjs',
    bundle: true,
    sourcemap: quasarConf.metaConf.debugging === true ? 'inline' : false,
    external: [
      ...cliDeps,
      ...Object.keys(appDeps),
      ...Object.keys(appDevDeps)
    ],
    minify: quasarConf.build.minify !== false,
    define: parseEnv(quasarConf.build.env, quasarConf.build.rawDefine)
  }

  const { warnings, errors } = quasarConf.eslint
  if (warnings === true || errors === true) {
    // require only if actually needed (as it imports app's eslint pkg)
    const quasarEsbuildPluginESLint from './plugins/esbuild.eslint')
    cfg.plugins = [
      quasarEsbuildPluginESLint(quasarConf, getLinterOpts)
    ]
  }

  return cfg
}

export function createBrowserEsbuildConfig (quasarConf, getLinterOpts) {
  const cfg = {
    platform: 'browser',
    target: quasarConf.build.target.browser,
    format: 'iife',
    bundle: true,
    sourcemap: quasarConf.metaConf.debugging === true ? 'inline' : false,
    minify: quasarConf.build.minify !== false,
    define: parseEnv(quasarConf.build.env, quasarConf.build.rawDefine)
  }

  const { warnings, errors } = quasarConf.eslint
  if (warnings === true || errors === true) {
    // require only if actually needed (as it imports app's eslint pkg)
    const quasarEsbuildPluginESLint from './plugins/esbuild.eslint')
    cfg.plugins = [
      quasarEsbuildPluginESLint(quasarConf, getLinterOpts)
    ]
  }

  return cfg
}

export function extendEsbuildConfig (esbuildConf, quasarConfTarget, threadName) {
  const method = `extend${threadName}Conf`

  // example: quasarConf.ssr.extendSSRWebserverConf
  if (typeof quasarConfTarget[method] === 'function') {
    quasarConfTarget[method](esbuildConf)
  }

  const promise = extensionRunner.runHook(method, async hook => {
    log(`Extension(${hook.api.extId}): Extending "${threadName}" Esbuild config`)
    await hook.fn(esbuildConf, hook.api)
  })

  return promise.then(() => esbuildConf)
}

export { mergeViteConfig }
