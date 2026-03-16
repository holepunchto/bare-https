const HTTPAgent = require('bare-http1').Agent
const HTTPSSocket = require('./socket')

class HTTPSAgent extends HTTPAgent {
  constructor(opts = {}) {
    super({ defaultPort: 443, ...opts })
  }

  createConnection(opts) {
    return new HTTPSSocket(super.createConnection(opts), opts)
  }
}

HTTPSAgent.global = new HTTPSAgent({ keepAlive: 1000, timeout: 5000 })

module.exports = HTTPSAgent
