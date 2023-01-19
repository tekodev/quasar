
import { readFileSync } from 'node:fs'
import webpack from 'webpack'
import WebpackChain from 'webpack-chain'

import { ExpressionDependencyPlugin } from './plugin.expression-dependency.js'
import { parseBuildEnv } from '../../helpers/parse-build-env.js'
import { injectNodeBabel } from '../inject.node-babel.js'
import { injectNodeTypescript } from '../inject.node-typescript.js'

import appPaths from '../../app-paths.js'
import { WebpackProgressPlugin } from '../plugin.progress.js'

const tempElectronDir = '.quasar/electron'

export async function createNodeChain (nodeType, cfg, configName) {
  const { dependencies:appDeps = {} } = JSON.parse(
    readFileSync(appPaths.resolve.app('package.json'), 'utf-8')
  )

  const { dependencies:cliDeps = {} } = JSON.parse(
    readFileSync(appPaths.resolve.cli('package.json'), 'utf-8')
  )

  const chain = new WebpackChain()
  const resolveModules = [
    'node_modules',
    appPaths.resolve.app('node_modules'),
    appPaths.resolve.cli('node_modules')
  ]

  chain.target(`electron-${nodeType}`)
  chain.mode(cfg.ctx.dev ? 'development' : 'production')
  chain.node
    .merge({
      __dirname: cfg.ctx.dev,
      __filename: cfg.ctx.dev
    })

  chain.output
    .filename(`electron-${nodeType}.js`)
    .libraryTarget('commonjs2')
    .path(
      cfg.ctx.dev
        ? appPaths.resolve.app(tempElectronDir)
        : cfg.build.distDir
    )

  chain.externals([
    ...Object.keys(cliDeps),
    ...Object.keys(appDeps)
  ])

  chain.plugin('expression-dependency')
    .use(ExpressionDependencyPlugin)

  injectNodeBabel(cfg, chain)
  injectNodeTypescript(cfg, chain)

  chain.module.rule('node')
    .test(/\.node$/)
    .use('node-loader')
      .loader('node-loader')

  chain.resolve.modules
    .merge(resolveModules)

  chain.resolve.extensions
    .merge([ '.js', '.json', '.node' ])

  chain.resolveLoader.modules
    .merge(resolveModules)

  chain.plugin('progress')
    .use(WebpackProgressPlugin, [{ name: configName, cfg }])

  const env = {
    ...cfg.build.env,
    QUASAR_ELECTRON_PRELOAD: cfg.ctx.dev
      ? appPaths.resolve.app(`${tempElectronDir}/electron-preload.js`)
      : 'electron-preload.js',
    QUASAR_PUBLIC_FOLDER: cfg.ctx.dev
      ? appPaths.resolve.app('public')
      : '.'
  }

  chain.plugin('define')
    .use(webpack.DefinePlugin, [
      parseBuildEnv(env, cfg.__rootDefines)
    ])

  // we include it already in cfg.build.env
  chain.optimization
    .nodeEnv(false)

  if (cfg.ctx.prod) {
    chain.optimization
      .concatenateModules(true)

    if (cfg.ctx.debug) {
      // reset default webpack 4 minimizer
      chain.optimization.minimizers.delete('js')
      // also:
      chain.optimization.minimize(false)
    }

    if (cfg.build.minify) {
      const { default: TerserPlugin } = await import('terser-webpack-plugin')

      chain.optimization
        .minimizer('js')
        .use(TerserPlugin, [{
          terserOptions: cfg.build.uglifyOptions,
          extractComments: false,
          parallel: true
        }])
    }
  }

  return chain
}
