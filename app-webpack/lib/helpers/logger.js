import {
  bgGreen, green,
  inverse,
  bgRed, red,
  bgYellow, yellow,
  white, black
} from 'kolorist'

import readline from 'readline'

/**
 * Main approach - App CLI related
 */

const dot = '•'
const banner = 'App ' + dot
const greenBanner = green(banner)
const redBanner = red(banner)
const yellowBanner = yellow(banner)

export const clearConsole = process.stdout.isTTY
  ? () => {
      // Fill screen with blank lines. Then move to 0 (beginning of visible part) and clear it
      const blank = '\n'.repeat(process.stdout.rows)
      console.log(blank)
      readline.cursorTo(process.stdout, 0, 0)
      readline.clearScreenDown(process.stdout)
    }
  : () => {}

export function log (msg) {
  console.log(msg ? ` ${greenBanner} ${msg}` : '')
}

export function warn (msg, pill) {
  if (msg !== void 0) {
    const pillBanner = pill !== void 0
      ? bgYellow(black('', pill, '')) + ' '
      : ''

    console.warn(` ${yellowBanner} ⚠️  ${pillBanner}${msg}`)
  }
  else {
    console.warn()
  }
}

export function fatal (msg, pill) {
  if (msg !== void 0) {
    const pillBanner = pill !== void 0
      ? errorPill(pill) + ' '
      : ''

    if (msg instanceof Error) {
      console.log()
      console.error(msg)
      console.error(`\n ${redBanner} ⚠️  ${pillBanner}Fatal error above.\n`)
    }
    else {
      console.error(`\n ${redBanner} ⚠️  ${pillBanner}${msg}\n`)
    }
  }
  else {
    console.log()
  }

  process.exit(1)
}

/**
 * Extended approach - Compilation status & pills
 */

export const successPill = msg => bgGreen(black('', msg, ''))
export const infoPill = msg => inverse('', msg, '')
export const errorPill = msg => bgRed(white('', msg, ''))
export const warningPill = msg => bgYellow(black('', msg, ''))

export function success (msg, title = 'SUCCESS') {
  console.log(` ${greenBanner} ${successPill(title)} ${green(dot + ' ' + msg)}`)
}

export function getSuccess (msg, title) {
  return ` ${greenBanner} ${successPill(title)} ${green(dot + ' ' + msg)}`
}

export function info (msg, title = 'INFO') {
  console.log(` ${greenBanner} ${infoPill(title)} ${green(dot)} ${msg}`)
}

export function getInfo (msg, title) {
  return ` ${greenBanner} ${infoPill(title)} ${green(dot)} ${msg}`
}

export function error (msg, title = 'ERROR') {
  console.log(` ${redBanner} ${errorPill(title)} ${red(dot + ' ' + msg)}`)
}

export function getError (msg, title = 'ERROR') {
  return ` ${redBanner} ${errorPill(title)} ${red(dot + ' ' + msg)}`
}

export function warning (msg, title = 'WARNING') {
  console.log(` ${yellowBanner} ${warningPill(title)} ${yellow(dot + ' ' + msg)}`)
}

export function getWarning (msg, title = 'WARNING') {
  return ` ${yellowBanner} ${warningPill(title)} ${yellow(dot + ' ' + msg)}`
}
