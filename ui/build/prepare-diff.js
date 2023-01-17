import fs from 'node:fs'
import path from 'node:path'
import { default as fg } from 'fast-glob'
import { createPatch } from 'diff'
import { highlight } from 'cli-highlight'

const { sync: fastGlob } = fg
const rootFolder = new URL('..', import.meta.url).pathname
const resolve = _path => path.resolve(rootFolder, _path)
const relative = _path => path.relative(rootFolder, _path)

/**
 * Call this with the path to file (or folder) you want to track, before the file gets updated.
 * It will save the current contents and will print the diff before exiting the process.
 *
 * @param {string} locationPath
 */
export function prepareDiff (locationPath) {
  let absolutePath = resolve(locationPath)

  // If there is no "old" file/folder, then there is no diff (everything will be new)
  if (!fs.existsSync(absolutePath)) {
    return
  }

  // If it's a directory, then query all files in it
  if (fs.lstatSync(absolutePath).isDirectory()) {
    absolutePath += '/*'
  }

  const originalsMap = new Map()
  const originalFiles = fastGlob(absolutePath)

  // If no files, then there is no diff (everything will be new)
  if (originalFiles.length === 0) {
    return
  }

  // Read the current (old) contents
  originalFiles.forEach(filePath => {
    originalsMap.set(filePath, fs.readFileSync(filePath, { encoding: 'utf-8' }))
  })

  // Before exiting the process, read the new contents and output the diff
  process.on('exit', code => {
    if (code !== 0) { return }

    const currentFiles = fastGlob(absolutePath)
    const currentMap = new Map()

    let somethingChanged = false

    currentFiles.forEach(filePath => {
      const relativePath = relative(filePath)
      currentMap.set(filePath, true)

      if (originalsMap.has(filePath) === false) {
        console.log(`\n 📜 New file: ${ relativePath }`)
        somethingChanged = true
        return
      }

      const currentContent = fs.readFileSync(filePath, { encoding: 'utf-8' })
      const originalContent = originalsMap.get(filePath)

      if (originalContent !== currentContent) {
        const diffPatch = createPatch(filePath, originalContent, currentContent)

        console.log(`\n 📜 Changes for ${ relativePath }\n`)
        console.log(highlight(diffPatch, { language: 'diff' }))
        somethingChanged = true
      }
    })

    originalsMap.forEach((_, filePath) => {
      if (currentMap.has(filePath) === false) {
        console.log(`\n 📜 Removed file: ${ relative(filePath) }\n`)
        somethingChanged = true
      }
    })

    if (somethingChanged === false) {
      console.log('\n 📜 No changes detected.\n')
    }
  })
}
