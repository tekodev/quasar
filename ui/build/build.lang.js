import path from 'node:path'
import fs from 'node:fs'
import glob from 'fast-glob'

import { logError, writeFileIfChanged } from './build.utils.js'

const rootFolder = new URL('..', import.meta.url).pathname
const resolve = file => path.resolve(rootFolder, file)

function parse (prop, txt) {
  const
    propIndex = txt.indexOf(prop),
    startIndex = txt.indexOf('\'', propIndex) + 1

  let stopIndex = txt.indexOf('\'', startIndex)

  while (txt.charAt(stopIndex - 1) === '\\') {
    stopIndex = txt.indexOf('\'', stopIndex + 1)
  }

  return txt.substring(startIndex, stopIndex).replace('\\', '')
}

export function buildLang () {
  const languages = []
  const promises = []

  try {
    glob.sync(resolve('lang/*.js'))
      .forEach(file => {
        const content = fs.readFileSync(file, 'utf-8')
        const isoName = parse('isoName', content)
        const nativeName = parse('nativeName', content)
        languages.push({ isoName, nativeName })
      })

    const langFile = resolve('lang/index.json')
    const newLangJson = JSON.stringify(languages, null, 2)

    promises.push(
      writeFileIfChanged(langFile, newLangJson)
    )

    return Promise.all(promises)
  }
  catch (err) {
    logError('build.lang.js: something went wrong...')
    console.log()
    console.error(err)
    console.log()
    process.exit(1)
  }
}
