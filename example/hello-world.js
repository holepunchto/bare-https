const https = require('..')
const fs = require('bare-fs')

const options = {
  cert: fs.readFileSync('test/fixtures/cert.crt'),
  key: fs.readFileSync('test/fixtures/cert.key')
}

const server = https.createServer(options, function (req, res) {
  res.statusCode = 200
  res.setHeader('Content-Length', 12)
  res.write('hello world!')
  res.end()
})

server.on('connection', function (socket) {
  console.log('got socket')
  socket.on('close', function () {
    console.log('closed socket')
  })
})

server.listen(8080, function () {
  console.log(server.address())
})
