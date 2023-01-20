import { existsSync } from 'node:fs'

import appPaths from '../app-paths.js'

export const cssVariables = {
  quasarSrcExt: 'css',

  appFile: {
    scss: existsSync(appPaths.resolve.src('css/quasar.variables.scss')),
    sass: existsSync(appPaths.resolve.src('css/quasar.variables.sass'))
  }
}

for (const ext of Object.keys(cssVariables.appFile)) {
  if (cssVariables.appFile[ext]) {
    cssVariables.quasarSrcExt = ext === 'scss' ? 'sass' : ext
    break
  }
}
