import path from 'node:path'
import sass from 'sass'
import rtl from 'postcss-rtlcss'
import postcss from 'postcss'
import cssnano from 'cssnano'
import autoprefixer from 'autoprefixer'

import { buildConf } from './build.conf.js'
import * as buildUtils from './build.utils.js'
import { prepareDiff } from './prepare-diff.js'

const nano = postcss([
  cssnano({
    preset: [ 'default', {
      mergeLonghand: false,
      convertValues: false,
      cssDeclarationSorter: false,
      reduceTransforms: false
    } ]
  })
])

function getConcatenatedContent (src, noBanner) {
  return new Promise(resolve => {
    let code = noBanner !== true
      ? buildConf.banner
      : ''

    src.forEach(file => {
      code += buildUtils.readFile(file) + '\n'
    })

    code = code
      // remove imports
      .replace(/@import\s+'[^']+'[\s\r\n]+/g, '')
      // remove comments
      .replace(/(\/\*[\w'-.,`\s\r\n*@]*\*\/)|(\/\/[^\r\n]*)/g, '')
      // remove unnecessary newlines
      .replace(/[\r\n]+/g, '\r\n')

    resolve(code)
  })
}

function generateUMD (code, middleName, ext = '') {
  return buildUtils.writeFile(`dist/quasar${ middleName }${ ext }.css`, code, true)
    .then(code => nano.process(code, { from: void 0 }))
    .then(code => buildUtils.writeFile(`dist/quasar${ middleName }${ ext }.prod.css`, code.css, true))
}

function renderAsset (cssCode, middleName = '') {
  return postcss([ autoprefixer ]).process(cssCode, { from: void 0 })
    .then(code => {
      code.warnings().forEach(warn => {
        console.warn(warn.toString())
      })
      return code.css
    })
    .then(code => Promise.all([
      generateUMD(code, middleName),
      postcss([ rtl({}) ]).process(code, { from: void 0 })
        .then(code => generateUMD(code.css, middleName, '.rtl'))
    ]))
}

function generateBase (source) {
  const src = new URL(path.join('..', source), import.meta.url).pathname
  const sassDistDest = new URL('../dist/quasar.sass', import.meta.url).pathname

  const result = sass.renderSync({ file: src })

  // remove @charset declaration -- breaks Vite usage
  const cssCode = result.css.toString().replace('@charset "UTF-8";', '')
  const depsList = result.stats.includedFiles

  return Promise.all([
    renderAsset(cssCode),

    getConcatenatedContent(depsList)
      .then(code => buildUtils.writeFile(sassDistDest, code))
  ])
}

function generateAddon (source) {
  const src = new URL(path.join('..', source), import.meta.url).pathname

  const result = sass.renderSync({ file: src })
  const cssCode = result.css.toString()

  return renderAsset(cssCode, '.addon')
}

export function buildCss (withDiff) {
  if (withDiff === true) {
    prepareDiff('dist/quasar.sass')
  }

  Promise
    .all([
      generateBase('src/css/index.sass'),
      generateAddon('src/css/flex-addon.sass')
    ])
    .catch(e => {
      console.error(e)
      process.exit(1)
    })
}
