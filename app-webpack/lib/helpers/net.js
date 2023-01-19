import os from 'os'
import net from 'net'

export function getExternalNetworkInterface () {
  const networkInterfaces = os.networkInterfaces()
  const devices = []

  for (let deviceName of Object.keys(networkInterfaces)) {
    const networkInterface = networkInterfaces[deviceName]

    for (let networkAddress of networkInterface) {
      if (!networkAddress.internal && networkAddress.family === 'IPv4') {
        devices.push({ deviceName, ...networkAddress })
      }
    }
  }

  return devices
}

export function getIPs () {
  const networkInterfaces = os.networkInterfaces()
  const list = []

  for (let deviceName of Object.keys(networkInterfaces)) {
    const networkInterface = networkInterfaces[deviceName]

    for (let networkAddress of networkInterface) {
      if (networkAddress.family === 'IPv4') {
        list.push(networkAddress.address)
      }
    }
  }

  return list
}

export async function findClosestOpenPort (port, host) {
  let portProposal = port

  do {
    if (await isPortAvailable(portProposal, host)) {
      return portProposal
    }
    portProposal++
  }
  while (portProposal < 65535)

  throw new Error('ERROR_NETWORK_PORT_NOT_AVAIL')
}

export async function isPortAvailable (port, host) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer()
      .once('error', err => {
        if (err.code === 'EADDRNOTAVAIL') {
          reject(new Error('ERROR_NETWORK_ADDRESS_NOT_AVAIL'))
        }
        else if (err.code === 'EADDRINUSE') {
          resolve(false) // host/port in use
        }
        else {
          reject(err)
        }
      })
      .once('listening', () => {
        tester.once('close', () => {
          resolve(true) // found available host/port
        })
        .close()
      })
      .on('error', err => {
        reject(err)
      })
      .listen(port, host)
  })
}
