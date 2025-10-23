const TLSSocket = require('bare-tls').Socket

module.exports = class HTTPSSocket extends TLSSocket {
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
