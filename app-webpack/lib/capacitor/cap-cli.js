
import appPaths from '../app-paths.js'
import { getPackagePath } from '../helpers/get-package-path.js'
import { getPackageMajorVersion } from '../helpers/get-package-major-version.js'

export const capBin = getPackagePath('@capacitor/cli/bin/capacitor', appPaths.capacitorDir)
export const capVersion = getPackageMajorVersion('@capacitor/cli', appPaths.capacitorDir)
