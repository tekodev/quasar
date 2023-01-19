
import { removeFileLoaders } from '../utils.js'

export default function format (error, printLog, titleFn) {
  printLog(titleFn(removeFileLoaders(error.file)))
  printLog()
  printLog(error.message)
}
