
import { existsSync } from 'node:fs'
import { join, sep, normalize } from 'node:path'
import nodeExternals from 'webpack-node-externals'

import appPaths from '../../app-paths.js'
import { QuasarSSRServerPlugin } from './plugin.server-side.js'

function getModuleDirs () {
  const folders = []
  let dir = appPaths.resolve.app('..')

  while (dir.length && dir[dir.length - 1] !== sep) {
    const newFolder = join(dir, 'node_modules')
    if (existsSync(newFolder)) {
      folders.push(newFolder)
    }

    dir = normalize(join(dir, '..'))
  }

  return folders
}

const additionalModuleDirs = getModuleDirs()

export function injectSSRServer (chain, cfg) {
  chain.entry('app')
    .clear()
    .add(appPaths.resolve.app('.quasar/server-entry.js'))

  chain.resolve.alias.set('quasar$', 'quasar/dist/quasar.ssr-server.esm.prod.js')

  chain.target('node')
  chain.devtool('source-map')

  chain.output
    .filename('render-app.js')
    .chunkFilename(`chunk-[name].js`)

  chain.externals(nodeExternals({
    // do not externalize:
    //  1. vue files
    //  2. CSS files
    //  3. when importing directly from Quasar's src folder
    //  4. Quasar language files
    //  5. Quasar icon sets files
    //  6. Quasar extras
    allowlist: [
      /(\.(vue|css|styl|scss|sass|less)$|\?vue&type=style)/,
      ...cfg.build.transpileDependencies
    ],
    additionalModuleDirs
  }))

  chain.plugin('define')
    .tap(args => {
      return [{
        ...args[0],
        'process.env.CLIENT': false,
        'process.env.SERVER': true
      }]
    })

  if (cfg.ctx.prod) {
    chain.plugin('quasar-ssr-server')
      .use(QuasarSSRServerPlugin, [{
        filename: '../quasar.server-manifest.json'
      }])
  }
}
