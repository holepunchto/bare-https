const tls = require('bare-tls')

module.exports = class HTTPSSocket extends tls.Socket {
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

