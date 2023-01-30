
import debounce from 'lodash/debounce.js'
import chokidar from 'chokidar'
import { copySync } from 'fs-extra'

import appPaths from '../../app-paths.js'
import { AppDevserver } from '../../app-devserver.js'
import { bexConfig } from './bex-config.js'
import { createManifest, copyBexAssets } from './utils.js'
import { clean, add } from '../../artifacts.js'

export class BexDevServer extends AppDevserver {
  #uiWatchers = []
  #scriptWatchers = []

  constructor (opts) {
    super(opts)

    this.registerDiff('bexScripts', quasarConf => [
      quasarConf.eslint,
      quasarConf.build.env,
      quasarConf.build.rawDefine,
      quasarConf.bex.contentScripts,
      quasarConf.bex.extendBexScriptsConf,
      quasarConf.bex.extendBexManifest
    ])

    this.registerDiff('distDir', quasarConf => [
      quasarConf.build.distDir
    ])
  }

  run (quasarConf, __isRetry) {
    const { diff, queue } = super.run(quasarConf, __isRetry)

    if (diff('distDir', quasarConf)) {
      this.#uiWatchers.forEach(watcher => { watcher.close() })
      this.#uiWatchers = []

      this.#scriptWatchers.forEach(watcher => { watcher.close() })
      this.#scriptWatchers = []

      clean(quasarConf.build.distDir)
      add(quasarConf.build.distDir)

      // execute diffs so we don't duplicate compilations
      diff('bexScripts', quasarConf)
      diff('vite', quasarConf)

      return queue(() => {
        return this.#compileScripts(quasarConf)
          .then(() => this.#compileUI(quasarConf, queue))
      })
    }

    if (diff('bexScripts', quasarConf)) {
      return queue(() => this.#compileScripts(quasarConf))
    }

    if (diff('vite', quasarConf)) {
      return queue(() => this.#compileUI(quasarConf, queue))
    }
  }

  async #compileScripts (quasarConf) {
    this.#scriptWatchers.forEach(watcher => { watcher.close() })
    this.#scriptWatchers = []

    const rebuilt = () => {
      this.printBanner(quasarConf)
    }

    const backgroundConfig = await bexConfig.backgroundScript(quasarConf)
    await this.buildWithEsbuild('Background Script', backgroundConfig, rebuilt)
      .then(result => { this.#scriptWatchers.push({ close: result.stop }) })

    for (const name of quasarConf.bex.contentScripts) {
      const contentConfig = await bexConfig.contentScript(quasarConf, name)

      await this.buildWithEsbuild(`Content Script (${name})`, contentConfig, rebuilt)
        .then(result => { this.#scriptWatchers.push({ close: result.stop }) })
    }

    const domConfig = await bexConfig.domScript(quasarConf)
    await this.buildWithEsbuild('Dom Script', domConfig, rebuilt)
      .then(result => { this.#scriptWatchers.push({ close: result.stop }) })
  }

  async #compileUI (quasarConf, queue) {
    this.#uiWatchers.forEach(watcher => { watcher.close() })
    this.#uiWatchers = []

    const viteConfig = await bexConfig.vite(quasarConf)
    await this.buildWithVite('BEX UI', viteConfig)

    this.#runWatchers(quasarConf, viteConfig, queue)
    this.printBanner(quasarConf)
  }

  #runWatchers (quasarConf, viteConfig, queue) {
    this.#uiWatchers = [
      this.#getViteWatcher(quasarConf, viteConfig, queue),
      this.#getBexAssetsDirWatcher(quasarConf),
      this.#getBexManifestWatcher(quasarConf)
    ]

    if (quasarConf.build.ignorePublicFolder !== true) {
      this.#uiWatchers.push(
        this.#getPublicDirWatcher(quasarConf)
      )
    }
  }

  #getViteWatcher (quasarConf, viteConfig, queue) {
    const watcher = chokidar.watch([
      appPaths.srcDir,
      appPaths.resolve.app('index.html')
    ], {
      ignoreInitial: true
    })

    const rebuild = debounce(() => {
      queue(() => {
        return this.buildWithVite('BEX UI', viteConfig)
          .then(() => { this.printBanner(quasarConf) })
      })
    }, 1000)

    watcher.on('add', rebuild)
    watcher.on('change', rebuild)
    watcher.on('unlink', rebuild)

    return watcher
  }

  #getPublicDirWatcher (quasarConf) {
    const watcher = chokidar.watch(appPaths.publicDir, { ignoreInitial: true })

    const copy = debounce(() => {
      copySync(appPaths.publicDir, quasarConf.build.distDir)
      this.printBanner(quasarConf)
    }, 1000)

    watcher.on('add', copy)
    watcher.on('change', copy)

    return watcher
  }

  #getBexAssetsDirWatcher (quasarConf) {
    const folders = copyBexAssets(quasarConf)
    const watcher = chokidar.watch(folders, { ignoreInitial: true })

    const copy = debounce(() => {
      copyBexAssets(quasarConf)
      this.printBanner(quasarConf)
    }, 1000)

    watcher.on('add', copy)
    watcher.on('change', copy)

    return watcher
  }

  #getBexManifestWatcher (quasarConf) {
    const { err, filename } = createManifest(quasarConf)

    if (err !== void 0) { process.exit(1) }

    const watcher = chokidar.watch(filename, { ignoreInitial: true })

    watcher.on('change', debounce(() => {
      createManifest(quasarConf)
      this.printBanner(quasarConf)
    }, 1000))

    return watcher
  }
}
