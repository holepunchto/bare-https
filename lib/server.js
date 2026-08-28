const TCPServer = require('bare-tcp').Server
const HTTPServerConnection = require('bare-http1').ServerConnection
const HTTPSSocket = require('./socket')

// A peer only needs a moment to send a request line and its headers, and never
// needs to keep the connection while it decides.
const DEFAULT_HEADERS_TIMEOUT = 60000

// A body may legitimately take a while to arrive, so this is only a backstop
// against one that never finishes.
const DEFAULT_REQUEST_TIMEOUT = 300000

// A connection with nothing on it costs the peer nothing to hold, so it is kept
// only long enough to be worth reusing for another request.
const DEFAULT_KEEP_ALIVE_TIMEOUT = 5000

// The request line and the headers have to be held whole before the request can
// be acted on, so what a peer may send before it says anything useful is capped.
// Zero disables either of them.
const DEFAULT_MAX_HEADER_SIZE = 16384
const DEFAULT_MAX_HEADERS_COUNT = 2000

// An upgrade body is held whole until the handover, with nothing reading it in
// the meantime to push back on it, so how much may be held is capped as well.
const DEFAULT_MAX_UPGRADE_BODY_SIZE = 65536

module.exports = class HTTPSServer extends TCPServer {
  constructor(opts = {}, onrequest) {
    if (typeof opts === 'function') {
      onrequest = opts
      opts = {}
    }

    const {
      readBufferSize,
      keepAlive,
      keepAliveInitialDelay,
      noDelay,
      maxConnections,
      headersTimeout = DEFAULT_HEADERS_TIMEOUT,
      requestTimeout = DEFAULT_REQUEST_TIMEOUT,
      keepAliveTimeout = DEFAULT_KEEP_ALIVE_TIMEOUT,
      maxHeaderSize = DEFAULT_MAX_HEADER_SIZE,
      maxHeadersCount = DEFAULT_MAX_HEADERS_COUNT,
      maxUpgradeBodySize = DEFAULT_MAX_UPGRADE_BODY_SIZE
    } = opts

    // Half open connections are not forwarded, as a client that has stopped
    // writing has nothing left to ask for.
    super({
      readBufferSize,
      keepAlive,
      keepAliveInitialDelay,
      noDelay,
      maxConnections,
      allowHalfOpen: false
    })

    this._timeout = 0

    // A request that is never finished would otherwise hold on to a connection
    // for as long as the peer cared to keep it, so the headers and the body are
    // each given a deadline, as is the wait for another request once one has
    // been answered. None of them count time spent waiting on this side. Zero
    // disables them.
    this._headersTimeout = headersTimeout
    this._requestTimeout = requestTimeout
    this._keepAliveTimeout = keepAliveTimeout

    this._maxHeaderSize = maxHeaderSize
    this._maxHeadersCount = maxHeadersCount
    this._maxUpgradeBodySize = maxUpgradeBodySize

    // The connections tracked by the TCP server are the sockets underneath the
    // TLS ones, so the encrypted socket is kept alongside each of them to be
    // able to find the connection that belongs to it.
    this._secureSockets = new WeakMap()

    this.on('connection', (socket) => {
      const secureSocket = new HTTPSSocket(socket, { ...opts, isServer: true })

      this._secureSockets.set(socket, secureSocket)

      new HTTPServerConnection(this, secureSocket, opts)
    })

    if (onrequest) this.on('request', onrequest)
  }

  get timeout() {
    return this._timeout
  }

  get headersTimeout() {
    return this._headersTimeout
  }

  set headersTimeout(value) {
    this._headersTimeout = value
  }

  get requestTimeout() {
    return this._requestTimeout
  }

  set requestTimeout(value) {
    this._requestTimeout = value
  }

  get keepAliveTimeout() {
    return this._keepAliveTimeout
  }

  set keepAliveTimeout(value) {
    this._keepAliveTimeout = value
  }

  get maxHeaderSize() {
    return this._maxHeaderSize
  }

  set maxHeaderSize(value) {
    this._maxHeaderSize = value
  }

  get maxHeadersCount() {
    return this._maxHeadersCount
  }

  set maxHeadersCount(value) {
    this._maxHeadersCount = value
  }

  get maxUpgradeBodySize() {
    return this._maxUpgradeBodySize
  }

  set maxUpgradeBodySize(value) {
    this._maxUpgradeBodySize = value
  }

  setTimeout(ms = 0, ontimeout) {
    if (ontimeout) this.on('timeout', ontimeout)

    this._timeout = ms

    return this
  }

  close(onclose) {
    super.close(onclose)

    this.closeIdleConnections()

    return this
  }

  closeIdleConnections() {
    for (const socket of this.connections) {
      const secureSocket = this._secureSockets.get(socket) || null

      const connection = secureSocket === null ? null : HTTPServerConnection.for(secureSocket)

      if (connection === null || connection.idle) socket.destroy()
    }
  }

  closeAllConnections() {
    for (const socket of this.connections) socket.destroy()
  }
}
