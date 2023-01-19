
import appPaths from '../../app-paths.js'
import { createNodeChain } from './create-node-chain.js'

export async function injectElectronPreload (cfg, configName) {
  const chain = await createNodeChain('preload', cfg, configName)

  chain.entry('electron-preload')
    .add(appPaths.resolve.app(
      cfg.sourceFiles.electronPreload
    ))

  return chain
}
