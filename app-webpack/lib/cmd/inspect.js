
import parseArgs from 'minimist'

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    c: 'cmd',
    m: 'mode',

    d: 'depth',
    p: 'path',

    h: 'help'
  },
  boolean: ['h'],
  string: ['c', 'm', 'p'],
  default: {
    c: 'dev',
    m: 'spa',
    d: 5
  }
})

if (argv.help) {
  console.log(`
  Description
    Inspect Quasar generated Webpack config

  Usage
    $ quasar inspect
    $ quasar inspect -c build
    $ quasar inspect -m electron -p 'module.rules'

  Options
    --cmd, -c        Quasar command [dev|build] (default: dev)
    --mode, -m       App mode [spa|ssr|pwa|bex|cordova|capacitor|electron] (default: spa)
    --depth, -d      Number of levels deep (default: 5)
    --path, -p       Path of config in dot notation
                        Examples:
                          -p module.rules
                          -p plugins
    --help, -h       Displays this message
  `)
  process.exit(0)
}

import { ensureArgv } from '../helpers/ensure-argv.js'
ensureArgv(argv, 'inspect')

import { banner } from '../helpers/banner.js'
banner(argv, argv.cmd)

import { log, fatal } from '../helpers/logger.js'
import { getMode } from '../mode/index.js'

import QuasarConfFile from '../quasar-conf-file.js'
import { splitWebpackConfig } from '../webpack/symbols.js'

import util from 'node:util'
import { getProperty } from 'dot-prop'

const depth = parseInt(argv.depth, 10) || Infinity

async function inspect () {
  if (argv.mode !== 'spa') {
    const mode = await getMode(argv.mode)
    if (mode.isInstalled !== true) {
      fatal('Requested mode for inspection is NOT installed.')
    }
  }

  const { extensionRunner } = await import('../app-extension/extensions-runner.js')
  const { getQuasarCtx } = await import('../helpers/get-quasar-ctx.js')

  const ctx = getQuasarCtx({
    mode: argv.mode,
    target: argv.mode === 'cordova' || argv.mode === 'capacitor'
      ? 'android'
      : void 0,
    debug: argv.debug,
    dev: argv.cmd === 'dev',
    prod: argv.cmd === 'build'
  })

  // register app extensions
  await extensionRunner.registerExtensions(ctx)

  const quasarConfFile = new QuasarConfFile(ctx)

  try {
    await quasarConfFile.prepare()
  }
  catch (e) {
    console.log(e)
    fatal('quasar.config.js has JS errors', 'FAIL')
  }

  await quasarConfFile.compile()

  const cfgEntries = splitWebpackConfig(quasarConfFile.webpackConf, argv.mode)

  if (argv.path) {
    cfgEntries.forEach(entry => {
      entry.webpack = getProperty(entry.webpack, argv.path)
    })
  }

  cfgEntries.forEach(cfgEntry => {
    console.log()
    log(`Showing Webpack config for "${cfgEntry.name}" with depth of ${depth}`)
    console.log()
    console.log(
      util.inspect(cfgEntry.webpack, {
        showHidden: true,
        depth: depth,
        colors: true,
        compact: false
      })
    )
  })

  console.log(`\n  Depth used: ${depth}. You can change it with "-d" parameter.\n`)
}

inspect()
