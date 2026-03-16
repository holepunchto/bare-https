const HTTPClientRequest = require('bare-http1').ClientRequest
const HTTPSAgent = require('./agent')

module.exports = class HTTPSClientRequest extends HTTPClientRequest {
  constructor(opts = {}, onresponse = null) {
    if (typeof opts === 'function') {
      onresponse = opts
      opts = {}
    }

    opts = opts ? { ...opts } : {}

    opts.agent = opts.agent === false ? new HTTPSAgent() : opts.agent || HTTPSAgent.global

    super(opts, onresponse)
  }
}
