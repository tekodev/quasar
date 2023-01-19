
import { dirname } from 'node:path'

export function getCallerPath () {
  const _prepareStackTrace = Error.prepareStackTrace
	Error.prepareStackTrace = (_, stack) => stack
	const stack = new Error().stack.slice(1)
  Error.prepareStackTrace = _prepareStackTrace
  const file = stack[1].getFileName()
  return dirname(
    file.startsWith('file://') ? file.slice(7) : file
  )
}
