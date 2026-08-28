const test = require('brittle')
const fs = require('bare-fs')
const http = require('bare-http1')
const tcp = require('bare-tcp')
const tls = require('bare-tls')
const https = require('.')

const options = {
  cert: fs.readFileSync('test/fixtures/cert.crt'),
  key: fs.readFileSync('test/fixtures/cert.key')
}

test('basic', async (t) => {
  t.plan(18)

  const server = https
    .createServer(options)
    .on('listening', () => t.pass('server listening'))
    .on('connection', (socket) => {
      socket.on('close', () => t.pass('server socket closed'))
    })
    .on('request', function (req, res) {
      t.is(req.method, 'GET')
      t.is(req.url, '/something/?key1=value1&key2=value2&enabled')

      t.is(res.statusCode, 200, 'default status code')
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
      headers: { 'Content-Length': 12 },
      rejectUnauthorized: false
    },
    (client) => client.end('body message')
  )

  t.absent(reply.error)
  t.is(reply.response.statusCode, 200)
  t.alike(Buffer.concat(reply.response.chunks), Buffer.from('Hello world!'))

  server.close()
  server.on('close', () => t.pass('server closed'))
})

test('get', async (t) => {
  t.plan(4)

  const sub = t.test()
  sub.plan(2)

  const server = https
    .createServer(options, (req, res) => {
      t.is(req.url, '/path')

      res.end('response')
    })
    .listen(0)

  await waitForServer(server)

  const url = `https://localhost:${server.address().port}/path`
  const opts = { rejectUnauthorized: false, agent: false }

  https.get(url, opts, (res) => {
    res.on('data', (data) => sub.alike(data, Buffer.from('response')))
  })

  https.get(new URL(url), opts, (res) => {
    res.on('data', (data) => sub.alike(data, Buffer.from('response')))
  })

  await sub

  server.close(() => t.pass('server closed'))
  server.closeAllConnections()
})

test('sockets are encrypted on both sides', async (t) => {
  t.plan(4)

  const sub = t.test()
  sub.plan(2)

  const server = https
    .createServer(options, (req, res) => {
      sub.is(req.socket.encrypted, true, 'server socket encrypted')
      sub.is(req.socket, res.socket, 'request and response share a socket')

      res.end()
    })
    .listen(0)

  await waitForServer(server)

  const reply = await request({ ...requestOptions(server), agent: false })

  t.is(reply.error, null, 'no error')
  t.is(reply.socket.encrypted, true, 'client socket encrypted')

  await sub

  server.close(() => t.pass('server closed'))
})

test('certificate is verified by default', async (t) => {
  t.plan(3)

  const server = https.createServer(options, (req, res) => res.end()).listen(0)

  await waitForServer(server)

  const url = `https://localhost:${server.address().port}/`

  // The fixture certificate is signed by nobody, so nothing vouches for it
  // unless the request says it does not care.
  const req = https.get(url, () => t.fail('response received'))

  req.on('error', (err) => {
    t.ok(err, 'client errored')
    t.is(err.code, 'CERTIFICATE_VERIFY_FAILED')

    server.close(() => t.pass('server closed'))
    server.closeAllConnections()
  })
})

test('plaintext server is refused', async (t) => {
  t.plan(3)

  const server = http.createServer((req, res) => res.end('plain')).listen(0)

  await waitForServer(server)

  const reply = await request({ ...requestOptions(server), agent: false })

  t.absent(reply.response, 'no response')
  t.ok(reply.error, 'client errored')

  server.close(() => t.pass('server closed'))
  server.closeAllConnections()
})

test('request with a body', async (t) => {
  t.plan(4)

  const server = https
    .createServer(options, (req, res) => {
      t.is(req.method, 'POST')

      const chunks = []

      req
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => {
          t.alike(Buffer.concat(chunks), Buffer.from('body message'))

          res.end('response')
        })
    })
    .listen(0)

  await waitForServer(server)

  const reply = await request({ ...requestOptions(server), method: 'POST', agent: false }, (req) =>
    req.end('body message')
  )

  t.alike(Buffer.concat(reply.response.chunks), Buffer.from('response'))

  server.close(() => t.pass('server closed'))
})

test('chunked response', async (t) => {
  t.plan(3)

  const server = https
    .createServer(options, (req, res) => {
      res.write('one')
      res.write('two')
      res.end('three')
    })
    .listen(0)

  await waitForServer(server)

  const reply = await request({ ...requestOptions(server), agent: false })

  t.is(reply.response.headers['transfer-encoding'], 'chunked')
  t.alike(Buffer.concat(reply.response.chunks), Buffer.from('onetwothree'))

  server.close(() => t.pass('server closed'))
})

test('large request and response body', async (t) => {
  t.plan(3)

  // Larger than a TLS record, so that it has to be split across several of them
  // on the way out and put back together on the way in.
  const body = Buffer.alloc(256 * 1024, 'x')

  const server = https
    .createServer(options, (req, res) => {
      const chunks = []

      req
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => {
          t.alike(Buffer.concat(chunks), body, 'request body intact')

          res.end(body)
        })
    })
    .listen(0)

  await waitForServer(server)

  const reply = await request({ ...requestOptions(server), method: 'POST', agent: false }, (req) =>
    req.end(body)
  )

  t.alike(Buffer.concat(reply.response.chunks), body, 'response body intact')

  server.close(() => t.pass('server closed'))
})

test('custom request headers', async (t) => {
  t.plan(3)

  const server = https
    .createServer(options, (req, res) => {
      t.is(req.headers['custom-header'], 'value')
      t.is(req.headers.host, `localhost:${server.address().port}`)

      res.end()
    })
    .listen(0)

  await waitForServer(server)

  await request({
    host: 'localhost',
    port: server.address().port,
    path: '/',
    headers: { 'custom-header': 'value' },
    rejectUnauthorized: false,
    agent: false
  })

  server.close(() => t.pass('server closed'))
})

test('socket reuse', async (t) => {
  t.plan(4)

  const server = https.createServer(options, (req, res) => res.end('response')).listen(0)

  await waitForServer(server)

  const agent = new https.Agent({ keepAlive: true })
  const opts = { ...requestOptions(server), agent }

  const first = await request(opts)
  const second = await request(opts)

  t.is(first.error, null, 'no error')
  t.is(second.error, null, 'no error')
  t.is(first.socket, second.socket, 'same socket')

  agent.destroy()

  server.close(() => t.pass('server closed'))
})

test('socket is not reused without an agent', async (t) => {
  t.plan(2)

  const server = https.createServer(options, (req, res) => res.end('response')).listen(0)

  await waitForServer(server)

  const opts = { ...requestOptions(server), agent: false }

  const first = await request(opts)
  const second = await request(opts)

  t.not(first.socket, second.socket, 'different sockets')

  server.close(() => t.pass('server closed'))
})

test('default agent uses port 443', (t) => {
  t.is(https.globalAgent.defaultPort, 443)
})

test('server has the same defaults as an HTTP server', async (t) => {
  t.plan(13)

  const server = https.createServer(options)

  t.is(server.headersTimeout, 60000, 'default headers timeout')
  t.is(server.requestTimeout, 300000, 'default request timeout')
  t.is(server.keepAliveTimeout, 5000, 'default keep-alive timeout')
  t.is(server.maxHeaderSize, 16384, 'default max header size')
  t.is(server.maxHeadersCount, 2000, 'default max headers count')
  t.is(server.maxUpgradeBodySize, 65536, 'default max upgrade body size')

  server.headersTimeout = 1000
  server.requestTimeout = 2000
  server.keepAliveTimeout = 3000
  server.maxHeaderSize = 4000
  server.maxHeadersCount = 5000
  server.maxUpgradeBodySize = 6000

  t.is(server.headersTimeout, 1000)
  t.is(server.requestTimeout, 2000)
  t.is(server.keepAliveTimeout, 3000)
  t.is(server.maxHeaderSize, 4000)
  t.is(server.maxHeadersCount, 5000)
  t.is(server.maxUpgradeBodySize, 6000)

  server.listen(0)

  await waitForServer(server)

  server.close(() => t.pass('server closed'))
})

test('idle connection is reclaimed once its keep-alive timeout expires', async (t) => {
  t.plan(3)

  const server = https
    .createServer({ ...options, keepAliveTimeout: 200 }, (req, res) => res.end('response'))
    .listen(0)

  await waitForServer(server)

  const agent = new https.Agent({ keepAlive: true })

  const reply = await request({ ...requestOptions(server), agent })

  t.is(reply.error, null, 'request answered')
  t.is(server.connections.size, 1, 'connection kept alive')

  // The connection is only holding on for another request that is not coming,
  // so it is given up once it has waited as long as it was told to.
  await waitForConnections(server)

  agent.destroy()

  server.close(() => t.pass('server closed'))
})

test('close server with an idle keep-alive connection', async (t) => {
  t.plan(3)

  const server = https.createServer(options, (req, res) => res.end('response')).listen(0)

  await waitForServer(server)

  const agent = new https.Agent({ keepAlive: true })

  const reply = await request({ ...requestOptions(server), agent })

  t.is(reply.error, null, 'request answered')
  t.is(server.connections.size, 1, 'connection kept alive')

  server.close(() => t.pass('server closed'))

  agent.destroy()
})

test('close server while a response is in flight', async (t) => {
  t.plan(4)

  const server = https
    .createServer(options, (req, res) => {
      // Closed from inside the handler, which must not cut short the response
      // the handler is about to write.
      server.close(() => t.pass('server closed'))

      setTimeout(() => res.end('late response'), 100)
    })
    .listen(0)

  await waitForServer(server)

  const reply = await request({ ...requestOptions(server), agent: false })

  t.is(reply.error, null, 'no error')
  t.is(reply.response.statusCode, 200, 'response received')
  t.alike(Buffer.concat(reply.response.chunks), Buffer.from('late response'), 'body intact')
})

test('close all connections with a request that is never answered', async (t) => {
  t.plan(4)

  const sub = t.test()
  sub.plan(1)

  const server = https.createServer(options, () => sub.pass('request received')).listen(0)

  await waitForServer(server)

  const reply = request({ ...requestOptions(server), agent: false })

  await sub

  server.close(() => t.pass('server closed'))
  server.closeAllConnections()

  const { error, response } = await reply

  t.absent(response, 'no response')
  t.ok(error, 'client errored')
})

test('destroy request', async (t) => {
  t.plan(3)

  const server = https
    .createServer(options, (req, res) => {
      req.on('close', () => t.pass('server request closed')).destroy()
    })
    .listen(0)

  await waitForServer(server)

  const reply = await request({ ...requestOptions(server), agent: false })

  t.ok(reply.error, 'client errored')

  server.close(() => t.pass('server closed'))
  server.closeAllConnections()
})

test('socket options are delegated to the socket underneath', async (t) => {
  t.plan(3)

  const sub = t.test()
  sub.plan(6)

  const server = https
    .createServer(options, (req, res) => {
      const socket = req.socket

      sub.is(socket.setNoDelay(true), socket, 'setNoDelay returns the socket')
      sub.is(socket.socket.noDelay, true)

      sub.is(socket.setKeepAlive(true, 100), socket, 'setKeepAlive returns the socket')
      sub.is(socket.socket.keepAlive, true)
      sub.is(socket.socket.keepAliveInitialDelay, 100)

      sub.is(socket.unref().ref(), socket, 'ref and unref return the socket')

      res.end()
    })
    .listen(0)

  await waitForServer(server)

  const reply = await request({ ...requestOptions(server), agent: false })

  t.is(reply.error, null, 'no error')

  await sub

  server.close(() => t.pass('server closed'))
})

test('create server with only a request handler', async (t) => {
  t.plan(2)

  const server = https.createServer(() => t.fail('no request expected'))

  t.is(server.listenerCount('request'), 1, 'request handler registered')

  server.listen(0)

  await waitForServer(server)

  server.close(() => t.pass('server closed'))
})

test('server setTimeout', (t) => {
  t.plan(3)

  const server = https.createServer(options)

  t.is(server.timeout, 0, 'no timeout by default')
  t.is(server.setTimeout(5000), server, 'setTimeout returns the server')
  t.is(server.timeout, 5000)
})

// Everything here goes over TLS, so a caller that asked for a scheme that does
// not is refused rather than quietly given one that does.
test('a request for a plaintext scheme is refused', async (t) => {
  t.plan(4)

  t.exception(
    () => https.request('http://example.com/', { agent: false }),
    /INVALID_PROTOCOL/,
    'http refused'
  )

  t.exception(
    () => https.request({ protocol: 'ws:', host: 'example.com', agent: false }),
    /INVALID_PROTOCOL/,
    'ws refused'
  )

  const server = https.createServer(options, (req, res) => res.end('ok')).listen(0)

  await waitForServer(server)

  const url = `https://localhost:${server.address().port}/`

  const reply = await request({ ...new URL(url), ...requestOptions(server), agent: false })

  t.is(reply.response.statusCode, 200, 'https is served')

  server.close(() => t.pass('server closed'))
  server.closeAllConnections()
})

// A URL writes an IPv6 address inside brackets, which belong to how a host is
// written in a URL rather than to the address itself.
test('a request to an IPv6 URL resolves', async (t) => {
  t.plan(4)

  const server = https
    .createServer(options, (req, res) => res.end(req.headers.host))
    .listen(0, '::1')

  await waitForServer(server)

  const { port } = server.address()

  // Resolved rather than rejected on failure, so that a host the resolver
  // cannot make sense of reads as a failed assertion rather than as a rejection
  // that takes the run with it.
  const reply = await new Promise((resolve) => {
    const client = https.request(
      `https://[::1]:${port}/`,
      { rejectUnauthorized: false, agent: false },
      (res) => {
        let body = ''

        res.on('data', (data) => (body += data))
        res.on('end', () => resolve({ body, error: null }))
      }
    )

    client.on('error', (err) => resolve({ body: null, error: err.code }))
    client.end()
  })

  t.is(reply.error, null, 'the URL form reached the server')
  t.is(reply.body, `[::1]:${port}`, 'and the host header keeps its brackets')

  const direct = await request({ host: '::1', port, rejectUnauthorized: false, agent: false })

  t.is(direct.response.statusCode, 200, 'and the options form still works')

  server.close(() => t.pass('server closed'))
  server.closeAllConnections()
})

// The connection reads the limit off whichever server it was made for, so one
// that does not carry it refuses every upgrade that brings a body along.
test('an upgrade with a body is handed over', async (t) => {
  t.plan(3)

  const server = https.createServer(options, (req, res) => res.end('ordinary')).listen(0)

  server.on('upgrade', (req, socket, head) => {
    const chunks = []

    req
      .on('data', (data) => chunks.push(data))
      .on('end', () => {
        t.alike(Buffer.concat(chunks), Buffer.from('body'), 'the body arrived')
        t.alike(head, Buffer.from('after'), 'and so did what followed it')

        socket.end(Buffer.from('HTTP/1.1 101 Switching Protocols\r\n\r\n'))
      })
  })

  await waitForServer(server)

  const socket = new tls.Socket(
    tcp.createConnection(server.address().port, server.address().address),
    { rejectUnauthorized: false }
  )

  const answered = new Promise((resolve) => {
    const chunks = []

    socket
      .on('error', () => {})
      .on('data', (data) => {
        chunks.push(data)

        resolve(Buffer.concat(chunks).toString())
      })
  })

  socket.write(
    Buffer.from(
      'GET /ws HTTP/1.1\r\n' +
        'Host: localhost\r\n' +
        'Connection: Upgrade\r\n' +
        'Upgrade: websocket\r\n' +
        'Content-Length: 4\r\n' +
        '\r\n' +
        'bodyafter'
    )
  )

  t.ok((await answered).startsWith('HTTP/1.1 101 '), 'the connection was handed over')

  socket.destroy()

  server.closeAllConnections()
  server.close()
})

// The credentials a URL carries are of no use to the peer where they are, so
// they are sent as a header, as Node.js does.
test('credentials carried by a URL are sent as an authorization header', async (t) => {
  t.plan(3)

  const seen = []

  const server = https
    .createServer(options, (req, res) => {
      seen.push(req.headers.authorization)

      res.end('response')
    })
    .listen(0)

  await waitForServer(server)

  const url = `https://user:pass@localhost:${server.address().port}/`

  await new Promise((resolve) => {
    https
      .get(url, { rejectUnauthorized: false, agent: false }, (res) => {
        res.resume().on('end', resolve)
      })
      .on('error', resolve)
  })

  await request({ ...requestOptions(server), auth: 'user:pass' })
  await request(requestOptions(server))

  t.is(seen[0], 'Basic dXNlcjpwYXNz', 'the credentials in the URL reach the peer')
  t.is(seen[1], 'Basic dXNlcjpwYXNz', 'and so do the ones named alongside it')
  t.is(seen[2], undefined, 'a request that names none sends none')

  server.closeAllConnections()
  server.close()
})

function requestOptions(server) {
  return {
    host: server.address().address,
    port: server.address().port,
    path: '/',
    rejectUnauthorized: false
  }
}

function waitForConnections(server, size = 0) {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (server.connections.size !== size) return

      clearInterval(timer)
      resolve()
    }, 20)
  })
}

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

    // Assigned by the agent while the request is being constructed, so it is
    // already in hand here.
    const result = { statusCode: 0, error: null, response: null, socket: client.socket }

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
      if (result.response) {
        result.response.chunks = result.response.chunks.map((c) => Buffer.from(c, 'hex'))
      }

      resolve(result)
    })

    if (cb) {
      cb(client)
    } else {
      client.end()
    }
  })
}
