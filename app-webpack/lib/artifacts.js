
import fs from 'node:fs'
import path from 'node:path'
import fse from 'fs-extra'

import appPaths from './app-paths.js'
import { log } from './helpers/logger.js'

const filePath = appPaths.resolve.app('.quasar/artifacts.json')

function exists () {
  return fs.existsSync(filePath)
}

function getArtifacts () {
  return exists()
    ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    : { folders: [] }
}

function save (content) {
  fse.mkdirp(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(content), 'utf-8')
}

export function add (entry) {
  const content = getArtifacts()

  if (!content.folders.includes(entry)) {
    content.folders.push(entry)
    save(content)
    log(`Added build artifact "${entry}"`)
  }
}

export function clean (folder) {
  if (folder.endsWith(path.join('src-cordova', 'www'))) {
    fse.emptyDirSync(folder)
  }
  else if (folder.endsWith(path.join('src-capacitor', 'www'))) {
    fse.emptyDirSync(folder)
    fse.copySync(
      appPaths.resolve.cli('templates/capacitor/www'),
      appPaths.capacitorDir
    )
  }
  else {
    fse.removeSync(folder)
  }

  log(`Cleaned build artifact: "${folder}"`)
}

export function cleanAll () {
  getArtifacts().folders.forEach(folder => {
    if (folder.endsWith(path.join('src-cordova', 'www'))) {
      fse.emptyDirSync(folder)
    }
    else {
      fse.removeSync(folder)
    }

    log(`Cleaned build artifact: "${folder}"`)
  })

  let folder = appPaths.resolve.app('.quasar')
  fse.removeSync(folder)
  log(`Cleaned build artifact: "${folder}"`)

  const distFolder = appPaths.resolve.app('dist')

  if (fs.existsSync(distFolder)) {
    fse.emptyDirSync(distFolder)
    log(`Emptied dist folder`)
  }
}
