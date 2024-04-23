const Server = exports.Server = require('./lib/server')

exports.createServer = function createServer (opts, onrequest) {
  return new Server(opts, onrequest)
}
