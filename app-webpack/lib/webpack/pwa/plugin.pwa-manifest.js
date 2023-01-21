
import webpack from 'webpack'

export class PwaManifestPlugin {
  constructor (cfg = {}) {
    this.manifest = JSON.stringify(cfg.pwa.manifest)
  }

  apply (compiler) {
    compiler.hooks.thisCompilation.tap('manifest.json', compilation => {
      compilation.emitAsset('manifest.json', new webpack.sources.RawSource(this.manifest))
    })
  }
}
