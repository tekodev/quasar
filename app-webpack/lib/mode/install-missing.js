
import { warn } from '../helpers/logger.js'
import { getMode } from './index.js'

export async function installMissing (mode, target) {
  const Mode = await getMode(mode)

  if (Mode.isInstalled) {
    if (['cordova', 'capacitor'].includes(mode)) {
      await Mode.addPlatform(target)
    }
    return
  }

  warn(`Quasar ${mode.toUpperCase()} is missing. Installing it...`)
  await Mode.add(target)
}
