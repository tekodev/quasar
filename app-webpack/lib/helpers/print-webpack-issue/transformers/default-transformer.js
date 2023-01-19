
import defaultError from '../formatters/default-error.js'

export default function transform (error) {
  return error.__formatter === void 0
    ? {
        ...error,
        __severity: 0,
        __formatter: defaultError
      }
    : error
}
