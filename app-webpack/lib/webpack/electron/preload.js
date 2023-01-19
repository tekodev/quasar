
const appPaths from '../../app-paths')
const createNodeChain from './create-node-chain')

module.exports = function (cfg, configName) {
  const chain = createNodeChain('preload', cfg, configName)

  chain.entry('electron-preload')
    .add(appPaths.resolve.app(
      cfg.sourceFiles.electronPreload
    ))

  return chain
}
