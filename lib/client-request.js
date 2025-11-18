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
    const host = (opts.host = opts.host || 'localhost')
    const port = (opts.port = opts.port || 443)
    opts.headers = { host: host + (port === 443 ? '' : ':' + port), ...opts.headers }

    super(opts, onresponse)
  }
}
