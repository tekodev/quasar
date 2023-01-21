
import babelSyntax from './babel-syntax.js'
import moduleNotFound from './module-not-found.js'
import esLintError from './eslint-error.js'
import stringError from './string-error.js'
import defaultTransformer from './default-transformer.js'

export default [
  babelSyntax,
  moduleNotFound,
  esLintError,
  stringError,
  defaultTransformer
]
