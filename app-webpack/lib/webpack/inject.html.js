const { join } from 'path')
const HtmlWebpackPlugin from 'html-webpack-plugin')

const appPaths from '../app-paths')
const HtmlAddonsPlugin from './plugin.html-addons').plugin

function getHtmlFilename (cfg) {
  if (cfg.ctx.mode.ssr && cfg.ctx.mode.pwa) {
    return cfg.ctx.dev
      ? cfg.build.ssrPwaHtmlFilename
      : join(cfg.build.distDir, 'www', cfg.build.ssrPwaHtmlFilename)
  }

  return cfg.ctx.dev
    ? cfg.build.htmlFilename
    : join(cfg.build.distDir, cfg.build.htmlFilename)
}

module.exports = function (chain, cfg, templateParam) {
  chain.plugin('html-webpack')
    .use(HtmlWebpackPlugin, [{
      filename: getHtmlFilename(cfg),
      template: appPaths.resolve.app(cfg.sourceFiles.indexHtmlTemplate),
      minify: cfg.__html.minifyOptions,
      templateParameters: templateParam || cfg.htmlVariables,
      chunksSortMode: 'none',
      // inject script tags for bundle
      inject: true,
      cache: true
    }])

  chain.plugin('html-addons')
    .use(HtmlAddonsPlugin, [ cfg ])
}
