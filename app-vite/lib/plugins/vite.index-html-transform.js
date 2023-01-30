
import { transformHtml } from '../helpers/html-template.js'

export function quasarVitePluginIndexHtmlTransform (quasarConf) {
  return {
    name: 'quasar:index-html-transform',
    enforce: 'pre',
    transformIndexHtml: {
      enforce: 'pre',
      transform: html => transformHtml(html, quasarConf)
    }
  }
}
