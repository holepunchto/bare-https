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

server.listen(8080, function () {
  console.log(server.address())

  const client = https.request({ port: 8080 }, res => {
    let data = ''
    res
      .on('end', () => console.log(data))
      .on('data', (chunk) => {
        data += chunk
      })
  })
  client.end()
})
