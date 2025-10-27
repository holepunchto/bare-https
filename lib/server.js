const TCPServer = require('bare-tcp').Server
const HTTPServerConnection = require('bare-http1').ServerConnection
const HTTPSSocket = require('./socket')

module.exports = class HTTPSServer extends TCPServer {
  constructor(opts = {}, onrequest) {
    if (typeof opts === 'function') {
      onrequest = opts
      opts = {}
    }

    super({ allowHalfOpen: false })

    this._timeout = 0

    this.on('connection', (socket) => {
      new HTTPServerConnection(this, new HTTPSSocket(socket, { ...opts, isServer: true }), opts)
    })

    if (onrequest) this.on('request', onrequest)
  }

  get timeout() {
    return this._timeout || undefined // For Node.js compatibility
  }

  setTimeout(ms = 0, ontimeout) {
    if (ontimeout) this.on('timeout', ontimeout)

    this._timeout = ms

    return this
  }

  close(onclose) {
    super.close(onclose)

    for (const socket of this.connections) {
      const connection = HTTPServerConnection.for(socket)

      if (connection === null || connection.idle) {
        socket.destroy()
      }
    }

    return this
  }
}
