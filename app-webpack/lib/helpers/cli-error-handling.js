import prettyError from 'pretty-error'

const pe = prettyError.start()

pe.skipPackage('regenerator-runtime')
pe.skipPackage('babel-runtime')
pe.skipNodeFiles()

let ouchInstance

export async function getOuchInstance () {
  if (ouchInstance) {
    return ouchInstance
  }

  pe.stop()

  const Ouch = await import('ouch')
  ouchInstance = (new Ouch()).pushHandler(
    new Ouch.handlers.PrettyPageHandler('orange', null, 'sublime')
  )

  return ouchInstance
}
