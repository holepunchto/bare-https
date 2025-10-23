const tcp = require('bare-tcp')
const tls = require('bare-tls')
const http = require('bare-http1')

class HTTPSSocket extends tls.Socket {
  setKeepAlive(...args) {
    this.socket.setKeepAlive(...args)

    return this
  }

  setNoDelay(...args) {
    this.socket.setNoDelay(...args)

    return this
  }

  setTimeout(...args) {
    this.socket.setTimeout(...args)

    return this
  }

  ref() {
    this.socket.ref()

    return this
  }

  unref() {
    this.socket.unref()

    return this
  }
}

class HTTPSAgent extends http.Agent {
  createConnection(opts) {
    return new HTTPSSocket(super.createConnection(opts), opts)
  }

  static global = new this({ keepAlive: 1000, timeout: 5000 })
}

exports.Agent = HTTPSAgent

exports.globalAgent = HTTPSAgent.global

class HTTPSClientRequest extends http.ClientRequest {
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

exports.ClientRequest = HTTPSClientRequest

class HTTPSServer extends tcp.Server {
  constructor(opts = {}, onrequest) {
    if (typeof opts === 'function') {
      onrequest = opts
      opts = {}
    }

    super({ allowHalfOpen: false })

    this._timeout = 0

    this.on(
      'connection',
      (socket) =>
        new http.ServerConnection(this, new HTTPSSocket(socket, { ...opts, isServer: true }), opts)
    )

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

    for (const socket of this._connections) {
      const connection = http.ServerConnection.for(socket)

      if (connection === null || connection.idle) {
        socket.destroy()
      }
    }

    return this
  }
}

exports.Server = HTTPSServer

exports.createServer = function createServer(opts, onrequest) {
  return new HTTPSServer(opts, onrequest)
}

exports.request = function request(url, opts, onresponse) {
  if (typeof opts === 'function') {
    onresponse = opts
    opts = {}
  }

  if (typeof url === 'string') url = new URL(url)

  if (isURL(url)) {
    opts = opts ? { ...opts } : {}

    opts.host = url.hostname
    opts.path = url.pathname + url.search
    opts.port = url.port ? parseInt(url.port, 10) : defaultPort(url)
  } else {
    opts = url ? { ...url } : {}

    // For Node.js compatibility
    opts.host = opts.hostname || opts.host
    opts.port = typeof opts.port === 'string' ? parseInt(opts.port, 10) : opts.port
  }

  return new HTTPSClientRequest(opts, onresponse)
}

// https://url.spec.whatwg.org/#default-port
function defaultPort(url) {
  switch (url.protocol) {
    case 'ftp:':
      return 21
    case 'http:':
    case 'ws:':
      return 80
    case 'https:':
    case 'wss:':
      return 443
  }

  return null
}

// https://url.spec.whatwg.org/#api
function isURL(url) {
  return (
    url !== null &&
    typeof url === 'object' &&
    typeof url.protocol === 'string' &&
    typeof url.hostname === 'string' &&
    typeof url.pathname === 'string' &&
    typeof url.search === 'string'
  )
}
