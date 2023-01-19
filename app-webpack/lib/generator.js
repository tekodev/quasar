
import fs from 'node:fs'
import path from 'node:path'
import { removeSync } from 'fs-extra'
import { compileTemplate } from 'lodash/template.js'

import appPaths from './app-paths.js'

const quasarFolder = appPaths.resolve.app('.quasar')

export class Generator {
  constructor (quasarConfFile) {
    const { ctx } = quasarConfFile.quasarConf

    this.alreadyGenerated = false
    this.quasarConfFile = quasarConfFile

    const paths = [
      'app.js',
      'client-entry.js',
      'client-prefetch.js',
      'quasar-user-options.js'
    ]

    if (ctx.mode.ssr) {
      paths.push(
        'server-entry.js',
        'ssr-middlewares.js'
      )

      if (ctx.prod) {
        paths.push(
          'ssr-prod-webserver.js',
          'ssr-fallback-production-export.js'
        )
      }
    }

    this.files = paths.map(file => {
      const content = fs.readFileSync(
        appPaths.resolve.cli(`templates/entry/${file}`),
        'utf-8'
      )

      const filename = path.basename(file)

      return {
        filename,
        dest: path.join(quasarFolder, filename),
        template: compileTemplate(content)
      }
    })
  }

  build () {
    const data = this.quasarConfFile.quasarConf

    // ensure .quasar folder
    if (!fs.existsSync(quasarFolder)) {
      fs.mkdirSync(quasarFolder)
    }
    else if (!fs.lstatSync(quasarFolder).isDirectory()) {
      removeSync(quasarFolder)
      fs.mkdirSync(quasarFolder)
    }

    this.files.forEach(file => {
      fs.writeFileSync(file.dest, file.template(data), 'utf-8')
    })

    if (!this.alreadyGenerated) {
      const then = Date.now() / 1000 - 120

      this.files.forEach(file => {
        fs.utimes(file.dest, then, then, function (err) { if (err) throw err })
      })

      this.alreadyGenerated = true
    }
  }
}
