const tcp = require('bare-tcp')
const tls = require('bare-tls')
const http = require('bare-http1')

const Agent = exports.Agent = class HTTPSAgent extends http.Agent {
  createConnection (opts) {
    return new tls.Socket(super.createConnection(opts), opts)
  }

  static global = new this({ keepAlive: 1000, timeout: 5000 })
}

exports.globalAgent = Agent.global

const Server = exports.Server = class HTTPSServer extends tcp.Server {
  constructor (opts = {}, onrequest) {
    if (typeof opts === 'function') {
      onrequest = opts
      opts = {}
    }

    super({ allowHalfOpen: false })

    this.on('connection', (socket) => new http.ServerConnection(this, new tls.Socket(socket, { ...opts, isServer: true }), opts))

    if (onrequest) this.on('request', onrequest)
  }
}

exports.createServer = function createServer (opts, onrequest) {
  return new Server(opts, onrequest)
}

exports.request = function request (url, opts, onresponse) {
  if (typeof opts === 'function') {
    onresponse = opts
    opts = {}
  }

  if (typeof url === 'string') url = new URL(url)

  if (URL.isURL(url)) {
    opts = opts ? { ...opts } : {}

    opts.host = url.hostname
    opts.path = url.pathname + url.search
    opts.port = url.port ? parseInt(url.port, 10) : defaultPort(url)
  } else {
    opts = url ? { ...url } : {}
  }

  opts.agent = opts.agent === false ? new Agent() : opts.agent || Agent.global

  return new http.ClientRequest(opts, onresponse)
}

// https://url.spec.whatwg.org/#default-port
function defaultPort (url) {
  switch (url.protocol) {
    case 'ftp:': return 21
    case 'http:':
    case 'ws:': return 80
    case 'https:':
    case 'wss:': return 443
  }

  return null
}
