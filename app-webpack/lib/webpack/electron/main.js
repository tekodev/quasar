
import appPaths from '../../app-paths.js'
import { createNodeChain } from './create-node-chain.js'

export async function injectElectronMain (cfg, configName) {
  const chain = await createNodeChain('main', cfg, configName)

  chain.entry('electron-main')
    .add(appPaths.resolve.app(
      cfg.sourceFiles.electronMain
    ))

  if (cfg.ctx.prod) {
    const { ElectronPackageJsonPlugin } = await import('./plugin.electron-package-json.js')

    // write package.json file
    chain.plugin('package-json')
      .use(ElectronPackageJsonPlugin, [ cfg ])

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

    const { default: CopyWebpackPlugin } = await import('copy-webpack-plugin.js')
    chain.plugin('copy-webpack')
      .use(CopyWebpackPlugin, [{ patterns }])
  }

  return chain
}
