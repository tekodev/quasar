import fs from 'node:fs'
import path from 'node:path'
import zlib from 'zlib'
import { green, blue, red, magenta, gray, underline } from 'kolorist'
import { table } from 'table'

import { version } from './version.js'

const kebabRegex = /[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g
const tableData = []

process.on('exit', code => {
  if (code === 0 && tableData.length > 0) {
    tableData.sort((a, b) => {
      return a[ 0 ] === b[ 0 ]
        ? a[ 1 ] < b[ 1 ] ? -1 : 1
        : a[ 0 ] < b[ 0 ] ? -1 : 1
    })

    tableData.unshift([
      underline('Ext'),
      underline('Filename'),
      underline('Size'),
      underline('Gzipped')
    ])

    const output = table(tableData, {
      columns: {
        0: { alignment: 'right' },
        1: { alignment: 'left' },
        2: { alignment: 'right' },
        3: { alignment: 'right' }
      }
    })

    console.log()
    console.log(` Summary of Quasar v${ version }:`)
    console.log(output)
  }
})

function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}

export function createFolder (folder) {
  const dir = new URL(path.join('..', folder), import.meta.url)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
}

function getDestinationInfo (dest) {
  if (dest.endsWith('.json')) {
    return {
      banner: gray('[json]'),
      tableEntryType: gray('json'),
      toTable: false
    }
  }

  if (dest.endsWith('.js') || dest.endsWith('.mjs')) {
    return {
      banner: green('[js]  '),
      tableEntryType: green('js'),
      toTable: dest.indexOf('dist/quasar') > -1
    }
  }

  if (dest.endsWith('.css') || dest.endsWith('.styl') || dest.endsWith('.sass')) {
    return {
      banner: blue('[css] '),
      tableEntryType: blue('css'),
      toTable: true
    }
  }

  if (dest.endsWith('.ts')) {
    return {
      banner: magenta('[ts]  '),
      tableEntryType: magenta('ts'),
      toTable: false
    }
  }

  logError(`Unknown file type using buildUtils.writeFile: ${ dest }`)
  process.exit(1)
}

export function writeFile (dest, code, zip) {
  const { banner, tableEntryType, toTable } = getDestinationInfo(dest)

  const fileSize = getSize(code)
  const filePath = path.relative(process.cwd(), dest)

  return new Promise((resolve, reject) => {
    function report (gzippedString, gzippedSize) {
      console.log(`${ banner } ${ filePath.padEnd(49) } ${ fileSize.padStart(8) }${ gzippedString || '' }`)

      if (toTable) {
        tableData.push([
          tableEntryType,
          filePath,
          fileSize,
          gzippedSize || '-'
        ])
      }

      resolve(code)
    }

    fs.writeFile(dest, code, err => {
      if (err) return reject(err)
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          const size = getSize(zipped)
          report(` (gzipped: ${ size.padStart(8) })`, size)
        })
      }
      else {
        report()
      }
    })
  })
}

export function readFile (file) {
  return fs.readFileSync(file, 'utf-8')
}

export function writeFileIfChanged (dest, newContent, zip) {
  let currentContent = ''
  try {
    currentContent = fs.readFileSync(dest, 'utf-8')
  }
  catch (e) {}

  return newContent.split(/[\n\r]+/).join('\n') !== currentContent.split(/[\n\r]+/).join('\n')
    ? writeFile(dest, newContent, zip)
    : Promise.resolve()
}

export function convertToCjs (content, banner = '') {
  return banner + content
    .replace(/export default {/, 'module.exports = {')
    .replace(/import {/g, 'const {')
    .replace(/} from '(.*)'/g, (_, pkg) => `} from '${ pkg }')`)
}

export function logError (err) {
  console.error('\n' + red('[Error]'), err)
  console.log()
}

export function kebabCase (str) {
  return str.replace(
    kebabRegex,
    match => '-' + match.toLowerCase()
  ).substring(1)
}

export function clone (data) {
  const str = JSON.stringify(data)

  if (str) {
    return JSON.parse(str)
  }
}
