
import { join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

import appPaths from '../../app-paths.js'
import { AppBuilder } from '../../app-builder.js'
import { ssrConfig } from './ssr-config.js'
import { getFixedDeps } from '../../helpers/get-fixed-deps.js'
import { getProdSsrTemplateFn, transformProdSsrPwaOfflineHtml } from '../../helpers/html-template.js'
import { appPackageJson } from '../../helpers/app-package-json.js'

import { injectPwaManifest, buildPwaServiceWorker } from '../pwa/utils.js'

export class SsrBuilder extends AppBuilder {
  async build () {
    await this.#buildWebserver()
    await this.#copyWebserverFiles()
    await this.#writePackageJson()

    if (this.quasarConf.ssr.pwa === true) {
      // also update pwa-builder.js when changing here
      injectPwaManifest(this.quasarConf)
    }

    const viteClientConfig = await ssrConfig.viteClient(this.quasarConf)
    await this.buildWithVite('SSR Client', viteClientConfig)

    this.moveFile(
      viteClientConfig.build.outDir + '/ssr-manifest.json',
      'quasar.manifest.json'
    )

    await this.#writeRenderTemplate(viteClientConfig.build.outDir)

    if (this.quasarConf.ssr.pwa === true) {
      // we need to detour the distDir temporarily
      const originalDistDir = this.quasarConf.build.distDir
      this.quasarConf.build.distDir = join(this.quasarConf.build.distDir, 'client')

      // also update pwa-builder.js when changing here
      writeFileSync(
        join(this.quasarConf.build.distDir, this.quasarConf.pwa.manifestFilename),
        JSON.stringify(
          this.quasarConf.htmlVariables.pwaManifest,
          null,
          this.quasarConf.build.minify !== false ? void 0 : 2
        ),
        'utf-8'
      )

      // also update pwa-builder.js when changing here
      if (this.quasarConf.pwa.workboxMode === 'injectManifest') {
        const esbuildConfig = await ssrConfig.customSw(this.quasarConf)
        await this.buildWithEsbuild('injectManifest Custom SW', esbuildConfig)
      }

      // also update pwa-builder.js when changing here
      const workboxConfig = await ssrConfig.workbox(this.quasarConf)
      await buildPwaServiceWorker(this.quasarConf.pwa.workboxMode, workboxConfig)

      // restore distDir
      this.quasarConf.build.distDir = originalDistDir
    }

    const viteServerConfig = await ssrConfig.viteServer(this.quasarConf)
    await this.buildWithVite('SSR Server', viteServerConfig)

    this.printSummary(this.quasarConf.build.distDir, true)
  }

  async #buildWebserver () {
    const esbuildConfig = await ssrConfig.webserver(this.quasarConf)
    await this.buildWithEsbuild('SSR Webserver', esbuildConfig)
  }

  async #copyWebserverFiles () {
    const patterns = [
      '.npmrc',
      '.yarnrc'
    ].map(filename => ({
      from: filename,
      to: '.'
    }))

    this.copyFiles(patterns)
  }

  async #writePackageJson () {
    const { dependencies: cliDeps } = JSON.parse(
      readFileSync(appPaths.resolve.cli('package.json'), 'utf-8')
    )

    const appDeps = getFixedDeps(appPackageJson.dependencies || {})

    const pkg = {
      name: appPackageJson.name,
      version: appPackageJson.version,
      description: appPackageJson.description,
      author: appPackageJson.author,
      private: true,
      scripts: {
        start: 'node index.js'
      },
      dependencies: Object.assign(appDeps, {
        'compression': cliDeps.compression,
        'express': cliDeps.express
      }),
      engines: appPackageJson.engines,
      browserslist: appPackageJson.browserslist,
      quasar: { ssr: true }
    }

    if (this.quasarConf.ssr.manualStoreSerialization !== true) {
      pkg.dependencies['serialize-javascript'] = cliDeps['serialize-javascript']
    }

    if (typeof this.quasarConf.ssr.extendPackageJson === 'function') {
      this.quasarConf.ssr.extendPackageJson(pkg)
    }

    this.writeFile('package.json', JSON.stringify(pkg, null, 2))
  }

  async #writeRenderTemplate (clientDir) {
    const htmlFile = join(clientDir, 'index.html')
    const html = this.readFile(htmlFile)

    const templateFn = getProdSsrTemplateFn(html, this.quasarConf)

    this.writeFile('render-template.js', `module.exports=${templateFn.source}`)

    if (this.quasarConf.ssr.pwa === true) {
      this.writeFile(
        `client/${this.quasarConf.ssr.ssrPwaHtmlFilename}`,
        transformProdSsrPwaOfflineHtml(html, this.quasarConf)
      )
    }

    this.removeFile(htmlFile)
  }
}
