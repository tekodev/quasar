
import appPaths from '../../app-paths.js'
import { injectHtml } from '../inject.html.js'

const capNodeModules = appPaths.resolve.capacitor('node_modules')

export function injectCapacitor (chain, cfg) {
  // need to also look into /src-capacitor
  // for deps like @capacitor/core
  chain.resolve.modules
    .merge([ capNodeModules ])

  chain.resolveLoader.modules
    .merge([ capNodeModules ])

  injectHtml(chain, cfg)
}
