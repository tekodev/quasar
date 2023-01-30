
import { static: serveStatic } from 'express'

import appPaths from '../../app-paths.js'
import { entryPointMarkup } from '../../helpers/html-template.js'

/**
 * It is applied for dev only!
 */
export function cordovaPlatformInject (quasarConf) {
  return {
    name: 'quasar:cordova-platform-inject',
    enforce: 'pre',

    configureServer (server) {
      const folder = appPaths.resolve.cordova(`platforms/${ quasarConf.ctx.targetName }/platform_www`)
      server.middlewares.use('/', serveStatic(folder, { maxAge: 0 }))
    },

    transformIndexHtml: {
      enforce: 'pre',
      transform: html => html.replace(
        entryPointMarkup,
        `<script src="cordova.js"></script>${ entryPointMarkup }`
      )
    }
  }
}
