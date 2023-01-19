const appPaths from '../../app-paths')
const createNodeChain from './create-node-chain')

module.exports = function (cfg, configName) {
  const chain = createNodeChain('main', cfg, configName)

  chain.entry('electron-main')
    .add(appPaths.resolve.app(
      cfg.sourceFiles.electronMain
    ))

  if (cfg.ctx.prod) {
    const ElectronPackageJson from './plugin.electron-package-json')

    // write package.json file
    chain.plugin('package-json')
      .use(ElectronPackageJson, [ cfg ])

    const patterns = [
      appPaths.resolve.app('.npmrc'),
      appPaths.resolve.app('package-lock.json'),
      appPaths.resolve.app('.yarnrc'),
      appPaths.resolve.app('yarn.lock'),
    ].map(filename => ({
      from: filename,
      to: '.',
      noErrorOnMissing: true
    }))

    patterns.push({
      from: appPaths.resolve.electron('icons'),
      to: './icons',
      noErrorOnMissing: true
    })

    const CopyWebpackPlugin from 'copy-webpack-plugin')
    chain.plugin('copy-webpack')
      .use(CopyWebpackPlugin, [{ patterns }])
  }

  return chain
}
