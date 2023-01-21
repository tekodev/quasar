
import fs from 'node:fs'
import { join } from 'node:path'
import webpack from 'webpack'
import WebpackDevServer from 'webpack-dev-server'
import chokidar from 'chokidar'

import express from 'express'
import createRenderer from '@quasar/ssr-helpers/create-renderer.js'

import { getClientManifest } from './webpack/ssr/plugin.client-side.js'
import { getServerManifest } from './webpack/ssr/plugin.server-side.js'
import { doneExternalWork } from './webpack/plugin.progress.js'
import { webpackNames } from './webpack/symbols.js'

import appPaths from './app-paths.js'
import { getPackage } from './helpers/get-package.js'
import { openBrowser } from './helpers/open-browser.js'
import { getOuchInstance } from './helpers/cli-error-handling.js'

import { getIndexHtml } from './ssr/html-template.js'

const ouchInstance = await getOuchInstance()
const { renderToString } = await getPackage('@vue/server-renderer')

const banner = '[Quasar Dev Webserver]'
const compiledMiddlewareFile = appPaths.resolve.app('.quasar/ssr/compiled-middlewares.mjs')
const renderError = ({ err, req, res }) => {
  ouchInstance.handleException(err, req, res, () => {
    console.error(`${banner} ${req.url} -> error during render`)
    console.error(err.stack)
  })
}

const doubleSlashRE = /\/\//g

let openedBrowser = false

export class DevServer {
  constructor (quasarConfFile) {
    this.quasarConfFile = quasarConfFile
    this.setInitialState()
  }

  setInitialState () {
    this.handlers = []

    this.htmlWatcher = null
    this.webpackServer = null
  }

  listen () {
    const cfg = this.quasarConfFile.quasarConf
    const webpackConf = this.quasarConfFile.webpackConf

    const webserverCompiler = webpack(webpackConf.webserver)
    const serverCompiler = webpack(webpackConf.serverSide)

    let clientCompiler, serverManifest, clientManifest, renderTemplate, renderWithVue, webpackServerListening = false

    async function startClient () {
      if (clientCompiler) {
        clientManifest = void 0
        await new Promise(resolve => {
          clientCompiler.close(resolve)
        })
      }

      clientCompiler = webpack(webpackConf.clientSide)
      clientCompiler.hooks.thisCompilation.tap('quasar-ssr-server-plugin', compilation => {
        compilation.hooks.processAssets.tapAsync(
          { name: 'quasar-ssr-server-plugin', state: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
          (_, callback) => {
            if (compilation.errors.length === 0) {
              clientManifest = getClientManifest(compilation)
              update()
            }

            callback()
          }
        )
      })
    }

    let tryToFinalize = () => {
      if (serverManifest && clientManifest && webpackServerListening === true) {
        tryToFinalize = () => {}

        if (openedBrowser === false) {
          openedBrowser = true

          if (cfg.__devServer.open) {
            openBrowser({ url: cfg.build.APP_URL, opts: cfg.__devServer.openOptions })
          }
        }
      }
    }

    const publicPath = cfg.build.publicPath
    const resolveUrlPath = publicPath === '/'
      ? url => url || '/'
      : url => url ? (publicPath + url).replace(doubleSlashRE, '/') : publicPath

    const rootFolder = appPaths.appDir
    const publicFolder = appPaths.resolve.app('public')

    function resolvePublicFolder () {
      return join(publicFolder, ...arguments)
    }

    const serveStatic = (path, opts = {}) => {
      return express.static(resolvePublicFolder(path), {
        ...opts,
        maxAge: opts.maxAge === void 0
          ? cfg.ssr.maxAge
          : opts.maxAge
      })
    }

    const templatePath = appPaths.resolve.app(cfg.sourceFiles.indexHtmlTemplate)

    function updateTemplate () {
      renderTemplate = getIndexHtml(fs.readFileSync(templatePath, 'utf-8'), cfg)
    }

    this.htmlWatcher = chokidar.watch(templatePath).on('change', () => {
      updateTemplate()
      console.log(`${banner} index.template.html template updated.`)
    })

    updateTemplate()

    const renderOptions = {
      vueRenderToString: renderToString,
      basedir: appPaths.resolve.app('.'),
      manualStoreSerialization: cfg.ssr.manualStoreSerialization === true
    }

    const update = () => {
      if (serverManifest && clientManifest) {
        Object.assign(renderOptions, {
          serverManifest,
          clientManifest
        })

        const renderer = createRenderer(renderOptions)

        renderWithVue = ssrContext => {
          const startTime = Date.now()

          return renderer(ssrContext, renderTemplate)
            .then(html => {
              console.log(`${banner} ${ssrContext.req.url} -> request took: ${Date.now() - startTime}ms`)
              return html
            })
        }

        tryToFinalize()
      }
    }

    webserverCompiler.hooks.done.tap('done-compiling', stats => {
      if (stats.hasErrors() === false) {
        if (this.destroyed === true) { return }

        const middlewareFile = compiledMiddlewareFile // TODO: + '?t=' + Date.now()

        // TODO:
        import(compiledMiddlewareFile).then(({ default: injectMiddleware }) => {
          startWebpackServer()
            .then(app => {
              if (this.destroyed === true) { return }

              return injectMiddleware({
                app,
                resolve: {
                  urlPath: resolveUrlPath,
                  root () { return join(rootFolder, ...arguments) },
                  public: resolvePublicFolder
                },
                publicPath,
                folders: {
                  root: rootFolder,
                  public: publicFolder
                },
                render: ssrContext => renderWithVue(ssrContext),
                serve: {
                  static: serveStatic,
                  error: renderError
                }
              })
            })
            .then(() => {
              if (this.destroyed === true) { return }

              webpackServerListening = true
              tryToFinalize()
              doneExternalWork(webpackNames.ssr.webserver)
            })
        })
      }
    })

    this.handlers.push(
      webserverCompiler.watch({}, () => {})
    )

    serverCompiler.hooks.thisCompilation.tap('quasar-ssr-server-plugin', compilation => {
      compilation.hooks.processAssets.tapAsync(
        { name: 'quasar-ssr-server-plugin', state: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        (_, callback) => {
          if (compilation.errors.length === 0) {
            serverManifest = getServerManifest(compilation)
            update()
          }

          callback()
        }
      )
    })

    this.handlers.push(
      serverCompiler.watch({}, () => {})
    )

    const startWebpackServer = async () => {
      if (this.destroyed === true) { return }

      if (this.webpackServer !== null) {
        const server = this.webpackServer
        this.webpackServer = null
        webpackServerListening = false

        await server.stop()
      }

      if (this.destroyed === true) { return }

      await startClient()

      if (this.destroyed === true) { return }

      return new Promise(resolve => {
        this.webpackServer = new WebpackDevServer({
          ...cfg.devServer,

          setupMiddlewares: (middlewares, opts) => {
            const { app } = opts

            if (cfg.build.ignorePublicFolder !== true) {
              app.use(resolveUrlPath('/'), serveStatic('.', { maxAge: 0 }))
            }

            const newMiddlewares = cfg.devServer.setupMiddlewares(middlewares, opts)

            if (this.destroyed !== true) {
              resolve(app)
            }

            return newMiddlewares
          }
        }, clientCompiler)

        this.webpackServer.start()
      })
    }
  }

  stop () {
    this.destroyed = true

    if (this.htmlWatcher !== null) {
      this.htmlWatcher.close()
    }

    if (this.webpackServer !== null) {
      this.handlers.push({
        // normalize to syntax of the other handlers
        close: doneFn => {
          this.webpackServer.stop().finally(() => { doneFn() })
        }
      })
    }

    return Promise.all(
      this.handlers.map(handler => new Promise(resolve => { handler.close(resolve) }))
    ).finally(() => {
      this.setInitialState()
    })
  }
}
