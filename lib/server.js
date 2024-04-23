const TCPServer = require('bare-tcp').Server
const TLSSocket = require('bare-tls').Socket
const HTTPServerConnection = require('bare-http1').ServerConnection

module.exports = class HTTPSServer extends TCPServer {
  constructor (opts = {}, onrequest) {
    if (typeof opts === 'function') {
      onrequest = opts
      opts = {}
    }

    super({ allowHalfOpen: false })

    this.on('connection', (socket) => new HTTPServerConnection(this, new TLSSocket(socket, { ...opts, isServer: true }), opts))

    if (onrequest) this.on('request', onrequest)
  }
}
