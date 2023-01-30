
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import appPaths from '../app-paths.js'

export function fixAndroidCleartext (mode) {
  const androidManifestPath = appPaths.resolve[mode](
    mode === 'cordova'
      ? 'platforms/android/app/src/main/AndroidManifest.xml'
      : 'android/app/src/main/AndroidManifest.xml'
  )

  if (existsSync(androidManifestPath)) {
    // Enable cleartext support in manifest
    let androidManifest = readFileSync(androidManifestPath, 'utf8')

    if (androidManifest.indexOf('android:usesCleartextTraffic="true"') === -1) {
      androidManifest = androidManifest.replace(
        '<application',
        '<application\n        android:usesCleartextTraffic="true"'
      )

      writeFileSync(androidManifestPath, androidManifest, 'utf-8')
    }
  }
}
