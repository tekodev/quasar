
import { build as viteBuild } from 'vite'
import esbuild from 'esbuild'

import { clean } from './artifacts.js'
import { progress } from './helpers/logger.js'

export class AppTool {
  argv

  constructor (argv) {
    this.argv = argv
  }

  async buildWithVite (threadName, viteConfig) {
    // ensure clean build
    clean(viteConfig.build.outDir)

    const done = progress(
      'Compiling of ___ with Vite in progress...',
      threadName
    )

    await viteBuild(viteConfig)
    done('___ compiled with success')
  }

  async watchWithEsbuild (threadName, esbuildConfig, onRebuildSuccess) {
    let resolve, esbuildCtx

    if (esbuildConfig.plugins === void 0) {
      esbuildConfig.plugins = []
    }

    esbuildConfig.plugins.push({
      name: 'quasar:on-rebuild',
      setup (build) {
        let isFirst = true
        let done

        build.onStart(() => {
          done = progress(
            'Compiling of ___ with Esbuild in progress...',
            threadName
          )
        })

        build.onEnd(result => {
          if (result.errors.length !== 0) {
            return
          }

          done('___ compiled with success')

          if (isFirst === true) {
            isFirst = false
            resolve()
            return
          }

          onRebuildSuccess()
        })
      }
    })

    esbuildCtx = await esbuild.context(esbuildConfig)
    await esbuildCtx.watch()

    return new Promise(res => {
      resolve = () => {
        res(esbuildCtx)
      }
    })
  }

  async buildWithEsbuild (threadName, esbuildConfig) {
    const done = progress(
      'Compiling of ___ with Esbuild in progress...',
      threadName
    )

    const result = await esbuild.build(esbuildConfig)

    done('___ compiled with success')
    return result
  }
}
