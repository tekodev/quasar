import { readFileSync } from 'node:fs'

import { warn } from './logger.js'
import appPaths from '../app-paths.js'

export function appFilesValidations (cfg) {
  let file
  let content
  let error = false

  file = appPaths.resolve.app(cfg.sourceFiles.indexHtmlTemplate)
  content = readFileSync(file, 'utf-8')

  if (content.indexOf('<base href') > -1) {
    warn(`Please remove the <base> tag from /src/index.template.html
   This is taken care of by Quasar automatically.
  `)
    error = true
  }

  if (!/<div id=['"]q-app/.test(content)) {
    warn(`Please add back <div id="q-app"></div> to
    /src/index.template.html inside of <body>\n`)
    error = true
  }

  if (error === true) {
    process.exit(1)
  }
}
