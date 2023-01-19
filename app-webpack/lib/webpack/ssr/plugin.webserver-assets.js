
import { readFileSync} from 'node:fs'
import { sources } from 'webpack'

import appPaths from '../../app-paths.js'
import { getFixedDeps } from '../../helpers/get-fixed-deps.js'
import { getIndexHtml } from '../../ssr/html-template.js'

export class WebserverAssetsPlugin {
  constructor (cfg = {}) {
    this.cfg = cfg
    this.initPackageJson()
    this.initHtmlTemplate()
  }

  apply (compiler) {
    compiler.hooks.thisCompilation.tap('package.json', compilation => {
      compilation.emitAsset('package.json', new sources.RawSource(this.pkg))
      compilation.emitAsset('render-template.js', new sources.RawSource(this.htmlTemplate))
    })
  }

  initPackageJson () {
    const appPkg = JSON.parse(
      readFileSync(appPaths.resolve.app('package.json'), 'utf-8')
    )

    const cliPkg = JSON.parse(
      readFileSync(appPaths.resolve.cli('package.json'), 'utf-8')
    )

    if (appPkg.dependencies !== void 0) {
      delete appPkg.dependencies['@quasar/extras']
    }

    const appDeps = getFixedDeps(appPkg.dependencies || {})
    const cliDeps = getFixedDeps(cliPkg.dependencies)

    let pkg = {
      name: appPkg.name,
      version: appPkg.version,
      description: appPkg.description,
      author: appPkg.author,
      private: true,
      scripts: {
        start: 'node index.js'
      },
      dependencies: Object.assign(
        appDeps,
        {
          'compression': '^1.0.0',
          'express': '^4.0.0',
          '@quasar/ssr-helpers': cliDeps['@quasar/ssr-helpers']
        },
        this.cfg.build.transpile === true
          ? { '@quasar/babel-preset-app': cliDeps['@quasar/babel-preset-app'] }
          : {}
      ),
      engines: appPkg.engines,
      browserslist: appPkg.browserslist,
      quasar: { ssr: true }
    }

    if (this.cfg.ssr.extendPackageJson) {
      this.cfg.ssr.extendPackageJson(pkg)
    }

    this.pkg = JSON.stringify(pkg, null, 2)
  }

  initHtmlTemplate () {
    const htmlFile = appPaths.resolve.app(this.cfg.sourceFiles.indexHtmlTemplate)
    const renderTemplate = getIndexHtml(readFileSync(htmlFile, 'utf-8'), this.cfg)
    this.htmlTemplate = `module.exports=${renderTemplate.source}`
  }
}
