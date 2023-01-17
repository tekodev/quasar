import rimraf from 'rimraf'

export function clean () {
  const folder = new URL('../dist/*', import.meta.url).pathname
  rimraf.sync(folder)
  console.log(' 💥 Cleaned build artifacts.\n')
}
