
import { existsSync } from 'node:fs'

import appPaths from '../app-paths.js'

const appFile = {
  scss: existsSync(appPaths.resolve.src('css/quasar.variables.scss')),
  sass: existsSync(appPaths.resolve.src('css/quasar.variables.sass'))
}

const quasarSrcExt = (() => {
  for (const ext of Object.keys(appFile)) {
    if (appFile[ext]) {
      return ext === 'scss' ? 'sass' : ext
    }
  }

  return 'css'
})()

export const cssVariables = {
  quasarSrcExt,
  appFile,
  codePrefixes: {
    scss: (() => {
      const ext = appFile.scss
        ? 'scss'
        : (appFile.sass ? 'sass' : false)

      return ext !== false
        ? `@import '~src/css/quasar.variables.${ext}', 'quasar/src/css/variables.sass';\n`
        : `@import 'quasar/src/css/variables.sass';\n`
    })(),

    sass: (() => {
      const ext = appFile.sass
        ? 'sass'
        : (appFile.scss ? 'scss' : false)

      return ext !== false
        ? `@import '~src/css/quasar.variables.${ext}', 'quasar/src/css/variables.sass'\n`
        : `@import 'quasar/src/css/variables.sass'\n`
    })()
  }
}
