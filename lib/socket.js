const TLSSocket = require('bare-tls').Socket

module.exports = class HTTPSSocket extends TLSSocket {
  constructor(socket, opts) {
    super(socket, opts)

    socket.on('connect', this._onsocketconnect.bind(this))
    socket.on('timeout', this._onsockettimeout.bind(this))
  }

  setKeepAlive(...args) {
    this.socket.setKeepAlive(...args)

    return this
  }

  setNoDelay(...args) {
    this.socket.setNoDelay(...args)

    return this
  }

  setTimeout(ms, ontimeout) {
    if (ontimeout) {
      if (ms === 0) this.off('timeout', ontimeout)
      else this.once('timeout', ontimeout)
    }

    this.socket.setTimeout(ms)

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

  _onsocketconnect() {
    this.emit('connect')
  }

  _onsockettimeout() {
    this.emit('timeout')
  }
}
