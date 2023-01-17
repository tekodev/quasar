process.env.NODE_ENV = 'production'

import { green } from 'kolorist'
import { createFolder } from './build.utils.js'

import { version } from './version.js'
import { clean } from './script.clean.js'
import { buildJavascript } from './script.build.javascript.js'
import { buildCss } from './script.build.css.js'

const type = process.argv[ 2 ]
const subtype = process.argv[ 3 ]

/*
  Build:
  * all: yarn build     / npm run build
  * js:  yarn build js  / npm run build js
  * css: yarn build css / npm run build css
 */

console.log()

if (!type) {
  clean()
}
else if ([ 'js', 'css' ].includes(type) === false) {
  console.error(` Unrecognized build type specified: ${ type }`)
  console.error(' Available: js | css')
  console.error()
  process.exit(1)
}

console.log(` 📦 Building Quasar ${ green('v' + version) }...\n`)

createFolder('dist')

if (!type || type === 'js') {
  createFolder('dist/vetur')
  createFolder('dist/api')
  createFolder('dist/transforms')
  createFolder('dist/lang')
  createFolder('dist/icon-set')
  createFolder('dist/types')
  createFolder('dist/ssr-directives')

  buildJavascript(subtype || 'full')
}

if (!type || type === 'css') {
  buildCss(/* with diff */ type === 'css')
}
