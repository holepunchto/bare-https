const test = require('brittle')
const fs = require('bare-fs')
const https = require('.')

const options = {
  cert: fs.readFileSync('test/fixtures/cert.crt'),
  key: fs.readFileSync('test/fixtures/cert.key')
}

test('basic', async (t) => {
  t.plan(23)

  const server = https
    .createServer(options)
    .on('listening', () => t.pass('server listening'))
    .on('connection', (socket) => {
      t.ok(socket)

      socket.on('close', () => t.pass('server socket closed'))
    })
    .on('request', function (req, res) {
      t.ok(req)
      t.is(req.method, 'GET')
      t.is(req.url, '/something/?key1=value1&key2=value2&enabled')
      t.comment(req.headers.host)
      t.ok(req.socket)

      t.ok(res)
      t.is(res.statusCode, 200, 'default status code')
      t.ok(res.socket)
      t.is(res.req, req)
      t.is(res.headersSent, false, 'headers not flushed')

      t.is(req.socket, res.socket)

      res.setHeader('Content-Length', 12)
      t.is(res.getHeader('content-length'), 12)
      t.is(res.getHeader('Content-Length'), 12)

      req
        .on('close', () => t.pass('server request closed'))
        .on('data', (data) => t.alike(data, Buffer.from('body message')))

      res
        .on('close', function () {
          t.is(res.headersSent, true, 'headers flushed')
          t.pass('server response closed')
        })
        .end('Hello world!')
    })

  server.listen(0)
  await waitForServer(server)

  const reply = await request(
    {
      method: 'GET',
      host: server.address().address,
      port: server.address().port,
      path: '/something/?key1=value1&key2=value2&enabled',
      headers: { 'Content-Length': 12 }
    },
    (req) => {
      req.write('body message')
      req.end()
    }
  )

  t.absent(reply.error)
  t.is(reply.response.statusCode, 200)

  const body = Buffer.concat(reply.response.chunks)
  t.alike(body, Buffer.from('Hello world!'), 'client response ended')

  server.close()
  server.on('close', () => t.pass('server closed'))
})

function waitForServer(server) {
  return new Promise((resolve, reject) => {
    server.on('listening', done)
    server.on('error', done)

    function done(error) {
      server.removeListener('listening', done)
      server.removeListener('error', done)
      error ? reject(error) : resolve()
    }
  })
}

function request(opts, cb) {
  return new Promise((resolve) => {
    const client = https.request(opts)

    const result = { statusCode: 0, error: null, response: null }

    client.on('error', function (err) {
      result.error = err.message
    })

    client.on('response', function (res) {
      const r = (result.response = {
        statusCode: res.statusCode,
        headers: res.headers,
        ended: false,
        chunks: []
      })
      r.statusCode = res.statusCode
      res.on('data', (chunk) => r.chunks.push(chunk))
      res.on('end', () => {
        r.ended = true
      })
    })

    client.on('close', () => {
      if (result.response)
        result.response.chunks = result.response.chunks.map((c) => Buffer.from(c, 'hex'))
      resolve(result)
    })

    if (cb) {
      cb(client)
    } else {
      client.end()
    }
  })
}
