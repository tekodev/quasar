
import { createServer } from 'vite'

import appPaths from '../../app-paths.js'
import { AppDevserver } from '../../app-devserver.js'
import { CapacitorConfigFile } from './config-file.js'
import { log, fatal } from '../../helpers/logger.js'
import { spawn } from '../../helpers/spawn.js'
import { onShutdown } from '../../helpers/on-shutdown.js'
import { openIDE } from '../../helpers/open-ide.js'
import { capacitorConfig } from './capacitor-config.js'

import { capBin } from './cap-cli.js'

export class CapacitorDevServer extends AppDevserver {
  #pid = 0
  #server
  #target
  #capacitorConfig = new CapacitorConfigFile()

  constructor (opts) {
    super(opts)

    this.registerDiff('capacitor', quasarConf => [
      quasarConf.metaConf.APP_URL,
      quasarConf.capacitor
    ])

    this.#target = opts.quasarConf.ctx.targetName

    if (this.#target === 'android') {
      require('../../helpers/fix-android-cleartext')('capacitor')
    }

    onShutdown(() => {
      this.#stopCapacitor()
    })
  }

  run (quasarConf, __isRetry) {
    const { diff, queue } = super.run(quasarConf, __isRetry)

    if (diff('vite', quasarConf)) {
      return queue(() => this.#runVite(quasarConf))
    }

    if (diff('capacitor', quasarConf)) {
      return queue(() => this.#runCapacitor(quasarConf))
    }
  }

  async #runVite (quasarConf) {
    if (this.#server) {
      this.#server.close()
    }

    const viteConfig = await capacitorConfig.vite(quasarConf)

    this.#server = await createServer(viteConfig)
    await this.#server.listen()
  }

  async #runCapacitor (quasarConf) {
    this.#stopCapacitor()
    this.#capacitorConfig.prepare(quasarConf)

    await this.#runCapacitorCommand(quasarConf.capacitor.capacitorCliPreparationParams)

    this.#capacitorConfig.prepareSSL(quasarConf.devServer.https !== false, this.#target)

    await openIDE('capacitor', quasarConf.bin, this.#target, true)
  }

  #stopCapacitor () {
    if (this.#pid) {
      log('Shutting down Capacitor process...')
      process.kill(this.#pid)
      this.#cleanup()
    }
  }

  #runCapacitorCommand (args) {
    return new Promise(resolve => {
      this.#pid = spawn(
        capBin,
        args,
        { cwd: appPaths.capacitorDir },
        code => {
          this.#cleanup()

          if (code) {
            fatal('Capacitor CLI has failed', 'FAIL')
          }

          resolve && resolve()
        }
      )
    })
  }

  #cleanup () {
    this.#pid = 0
    this.#capacitorConfig.reset()
  }
}
