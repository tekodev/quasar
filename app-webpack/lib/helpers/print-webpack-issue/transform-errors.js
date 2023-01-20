/**
 * Initially forked from friendly-errors-webpack-plugin 2.0.0-beta.2
 */

import { extractWebpackError } from './extract-webpack-error.js'
import transformersList from './transformers/index.js'

export function transformErrors (errors) {
  const transform = (error, transformer) => transformer(error)
  const applyTransformations = error => transformersList.reduce(transform, error)

  return errors.map(extractWebpackError).map(applyTransformations)
}
