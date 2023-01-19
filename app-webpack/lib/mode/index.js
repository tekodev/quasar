
import { fatal } from '../helpers/logger.js'

export async function getMode (mode) {
  if (!['pwa', 'cordova', 'capacitor', 'electron', 'ssr', 'bex'].includes(mode)) {
    fatal(`Unknown mode specified: ${mode}`)
  }

  const { Mode } = await import(`./mode-${mode}.js`)
  return new Mode()
}
