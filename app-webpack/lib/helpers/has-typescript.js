import { existsSync} from 'node:fs'
import appPaths from '../app-paths.js'

export const hasTypescript = existsSync(appPaths.resolve.app('tsconfig.json'))
