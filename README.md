# bare-https

HTTPS library for JavaScript.

```
npm i bare-https
```

## Usage

``` js
const https = require('bare-https')

// Same API as Node.js

const options = {
  cert: fs.readFileSync('test/fixtures/cert.crt'),
  key: fs.readFileSync('test/fixtures/cert.key')
}

const server = https.createServer(options, function (req, res) {
  res.statusCode = 200
  res.setHeader('Content-Length', 10)
  res.write('hello world!')
  res.end()
})

server.listen(0, function () {
  console.log('server is bound on', server.address().port)
})
```

## License

Apache-2.0
