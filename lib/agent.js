const HTTPAgent = require('bare-http1').Agent
const HTTPSSocket = require('./socket')

module.exports = class HTTPSAgent extends HTTPAgent {
  createConnection(opts) {
    return new HTTPSSocket(super.createConnection(opts), opts)
  }

  static global = new this({ keepAlive: 1000, timeout: 5000 })
}
