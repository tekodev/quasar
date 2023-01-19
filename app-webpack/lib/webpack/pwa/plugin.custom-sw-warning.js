
const msgRE = /^InjectManifest has been called multiple times/

const filterFn = warn => !(
  warn.name === 'Error' &&
  msgRE.test(warn.message) === true
)

export class CustomSwWarningPlugin {
  apply (compiler) {
    compiler.hooks.done.tap('pwa-custom-sw-warning', stats => {
      stats.compilation.warnings = stats.compilation.warnings.filter(filterFn)
    })
  }
}
