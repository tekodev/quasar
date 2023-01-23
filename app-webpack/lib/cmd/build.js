
if (process.env.NODE_ENV === void 0) {
  process.env.NODE_ENV = 'production'
}

import parseArgs from 'minimist'

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    m: 'mode',
    T: 'target',
    A: 'arch',
    b: 'bundler',
    s: 'skip-pkg',
    i: 'ide',
    d: 'debug',
    h: 'help',
    P: 'publish'
  },
  boolean: ['h', 'd', 'u', 'i'],
  string: ['m', 'T', 'P'],
  default: {
    m: 'spa'
  }
})

if (argv.help) {
  console.log(`
  Description
    Builds distributables of your app.

  Usage
    $ quasar build
    $ quasar build -p <port number>

    $ quasar build -m ssr

    # alias for "quasar build -m cordova -T ios"
    $ quasar build -m ios

    # alias for "quasar build -m cordova -T android"
    $ quasar build -m android

    # passing extra parameters and/or options to
    # underlying "cordova" executable:
    $ quasar build -m ios -- some params --and options --here
    # when on Windows and using Powershell:
    $ quasar build -m ios '--' some params --and options --here

  Options
    --mode, -m      App mode [spa|ssr|pwa|cordova|capacitor|electron|bex] (default: spa)
    --target, -T    App target
                      - Cordova (default: all installed)
                        [android|ios]
                      - Capacitor
                        [android|ios]
                      - Electron with default "electron-packager" bundler (default: yours)
                        [darwin|win32|linux|mas|all]
                      - Electron with "electron-builder" bundler (default: yours)
                        [darwin|mac|win32|win|linux|all]
    --publish, -P   Also trigger publishing hooks (if any are specified)
                      - Has special meaning when building with Electron mode and using
                        electron-builder as bundler
    --debug, -d     Build for debugging purposes
    --skip-pkg, -s  Build only UI (skips creating Cordova/Capacitor/Electron executables)
                      - Cordova (it only fills in /src/cordova/www folder with the UI code)
                      - Capacitor (it only fills in /src/capacitor/www folder with the UI code)
                      - Electron (it only creates the /dist/electron/UnPackaged folder)
    --help, -h      Displays this message

    ONLY for Cordova and Capacitor mode:
    --ide, -i       Open IDE (Android Studio / XCode) instead of finalizing with a
                    terminal/console-only build

    ONLY for Electron mode:
    --bundler, -b   Bundler (electron-packager or electron-builder)
                      [packager|builder]
    --arch, -A      App architecture (default: yours)
                      - with default "electron-packager" bundler:
                          [ia32|x64|armv7l|arm64|mips64el|all]
                      - with "electron-builder" bundler:
                          [ia32|x64|armv7l|arm64|all]

    ONLY for electron-builder (when using "publish" parameter):
    --publish, -P  Publish options [onTag|onTagOrDraft|always|never]
                     - see https://www.electron.build/configuration/publish

  `)
  process.exit(0)
}

import { ensureArgv } from '../helpers/ensure-argv.js'
ensureArgv(argv, 'build')

import { ensureVueDeps } from '../helpers/ensure-vue-deps.js'
ensureVueDeps()

import { readFileSync } from 'node:fs'

console.log(
  readFileSync(
    new URL('../../assets/logo.art', import.meta.url),
    'utf8'
  )
)

import { displayBanner } from '../helpers/banner.js'
displayBanner(argv, 'build')

import { log, fatal } from '../helpers/logger.js'
import { printWebpackErrors } from '../helpers/print-webpack-issue/index.js'
import { webpackNames, splitWebpackConfig } from '../webpack/symbols.js'

import path from 'node:path'
import webpack from 'webpack'

function parseWebpackConfig (cfg, mode) {
  let data = splitWebpackConfig(cfg, mode)

  if (mode === 'pwa') {
    // CSW needs to be compiled separately, before UI
    data = data.filter(entry => entry.name !== webpackNames.pwa.csw)
  }

  return {
    configs: data.map(d => d.webpack),
    name: data.map(d => d.name),
    folder: data.map(d => d.webpack.output.path)
  }
}

async function finalizeBuild (mode, ctx, quasarConfFile) {
  let Runner

  if (['cordova', 'capacitor'].includes(mode)) {
    const { default: RunnerInstance } = await import(`../${ mode }/index.js`)
    Runner = RunnerInstance
  }
  else if (argv['skip-pkg'] !== true && mode === 'electron') {
    const { default: RunnerInstance } = await import('../electron/index.js')
    Runner = RunnerInstance
  }

  if (Runner !== void 0) {
    Runner.init(ctx)
    return Runner.build(quasarConfFile, argv)
  }

  return Promise.resolve()
}

async function build () {
  if (argv.mode !== 'spa') {
    const { installMissing } = await import('../mode/install-missing.js')
    await installMissing(argv.mode, argv.target)
  }

  const { QuasarConfFile } = await import('../quasar-conf-file.js')
  const { Generator } = await import('../generator.js')
  const { clean, add } = await import('../artifacts.js')
  const { getQuasarCtx } = await import('../helpers/get-quasar-ctx.js')
  const { extensionRunner } = await import('../app-extension/extensions-runner.js')
  const { regenerateTypesFeatureFlags } = await import('../helpers/types-feature-flags.js')

  const ctx = getQuasarCtx({
    mode: argv.mode,
    target: argv.target,
    arch: argv.arch,
    bundler: argv.bundler,
    debug: argv.debug,
    prod: true,
    publish: argv.publish
  })

  // register app extensions
  await extensionRunner.registerExtensions(ctx)

  const quasarConfFile = new QuasarConfFile(ctx, argv)

  try {
    await quasarConfFile.prepare()
  }
  catch (e) {
    console.error(e)
    fatal('quasar.config file has JS errors', 'FAIL')
  }

  await quasarConfFile.compile()

  const generator = new Generator(quasarConfFile)
  const quasarConf = quasarConfFile.quasarConf
  const webpackConf = quasarConfFile.webpackConf

  await regenerateTypesFeatureFlags(quasarConf)

  let outputFolder = quasarConf.build.packagedDistDir || quasarConf.build.distDir

  clean(quasarConf.build.distDir)
  if (quasarConf.build.packagedDistDir) {
    clean(quasarConf.build.packagedDistDir)
  }

  generator.build()

  if (typeof quasarConf.build.beforeBuild === 'function') {
    await quasarConf.build.beforeBuild({ quasarConf })
  }

  // run possible beforeBuild hooks
  await extensionRunner.runHook('beforeBuild', async hook => {
    log(`Extension(${hook.api.extId}): Running beforeBuild hook...`)
    await hook.fn(hook.api, { quasarConf })
  })

  // using quasarConfFile.ctx instead of argv.mode
  // because SSR might also have PWA enabled but we
  // can only know it after parsing the quasar.config.js file
  if (quasarConfFile.ctx.mode.pwa === true) {
    // need to build the custom service worker before renderer
    const { default: Runner } = await import('../pwa/index.js')
    Runner.init(ctx)
    await Runner.build(quasarConfFile, argv)
  }

  let webpackData = parseWebpackConfig(webpackConf, argv.mode)

  webpack(webpackData.configs, async (err, stats) => {
    if (err) {
      console.error(err.stack || err)

      if (err.details) {
        console.error(err.details)
      }

      process.exit(1)
    }

    add(quasarConf.build.distDir)
    if (quasarConf.build.packagedDistDir) {
      add(quasarConf.build.packagedDistDir)
    }

    const statsArray = stats.stats

    statsArray.forEach((stats, index) => {
      if (stats.hasErrors() !== true) {
        return
      }

      const summary = printWebpackErrors(webpackData.name[index], stats)
      console.log()
      fatal(`for "${webpackData.name[index]}" with ${summary}. Please check the log above.`, 'COMPILATION FAILED')
    })

    const { printWebpackStats } = await import('../helpers/print-webpack-stats.js')

    console.log()
    statsArray.forEach((stats, index) => {
      printWebpackStats(stats, webpackData.folder[index], webpackData.name[index])
    })

    // free up memory
    webpackData = void 0

    await finalizeBuild(argv.mode, ctx, quasarConfFile)

    outputFolder = argv.mode === 'cordova'
      ? path.join(outputFolder, '..')
      : outputFolder

    displayBanner(argv, 'build', { outputFolder, transpileBanner: quasarConf.__transpileBanner })

    if (typeof quasarConf.build.afterBuild === 'function') {
      await quasarConf.build.afterBuild({ quasarConf })
    }

    // run possible beforeBuild hooks
    await extensionRunner.runHook('afterBuild', async hook => {
      log(`Extension(${hook.api.extId}): Running afterBuild hook...`)
      await hook.fn(hook.api, { quasarConf })
    })

    if (argv.publish !== void 0) {
      const opts = {
        arg: argv.publish,
        distDir: outputFolder,
        quasarConf
      }

      if (typeof quasarConf.build.onPublish === 'function') {
        await quasarConf.build.onPublish(opts)
      }

      // run possible onPublish hooks
      await extensionRunner.runHook('onPublish', async hook => {
        log(`Extension(${hook.api.extId}): Running onPublish hook...`)
        await hook.fn(hook.api, opts)
      })
    }
  })
}

build()
