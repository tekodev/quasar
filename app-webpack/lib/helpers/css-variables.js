import { existsSync } from 'node:fs'
import { join } from 'node:path'

import appPaths from '../app-paths.js'

function getFilePath (relativePath) {
  return new URL(relativePath, import.meta.url).pathname
}

export const cssVariables = {
  quasarSrcExt: 'css',

  appFile: {
    scss: existsSync(appPaths.resolve.src('css/quasar.variables.scss')),
    sass: existsSync(appPaths.resolve.src('css/quasar.variables.sass'))
  },

  loaders: {
    scss: getFilePath('../webpack/loader.quasar-scss-variables'),
    sass: getFilePath('../webpack/loader.quasar-sass-variables')
  }
}

for (const ext of Object.keys(cssVariables.appFile)) {
  if (cssVariables.appFile[ext]) {
    cssVariables.quasarSrcExt = ext === 'scss' ? 'sass' : ext
    break
  }
}
