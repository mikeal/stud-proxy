# stud-proxy 

[![Greenkeeper badge](https://badges.greenkeeper.io/mikeal/stud-proxy.svg)](https://greenkeeper.io/)

## Round Robin proxy/balancer for the [stud](https://github.com/bumptech/stud) TLS terminator

### Getting Started

Get [stud](https://github.com/bumptech/stud). Run with `--write-ip`, THIS IS NOT OPTIONAL.

```javascript
var s = studproxy()
s.listen(8000, function () {
  request('https://localhost:8443/', function (e, resp, body) {
    // Will return a response from a round robin host.
  })
})
s.robin([['98.139.127.62', 80]])
```

If you need to get your list of round robin hosts from a remote server `stud-proxy` will queue all the incoming requests and buffering the data in to memory until you set the round robin hosts.

```javascript
var s = studproxy()
s.listen(8000, function () {
  request('https://localhost:8443/', function (e, resp, body) {
    // Will return a response from a round robin host.
  })
})
setTimeout(function () {
  s.robin([['98.139.127.62', 80]])
}, 1000)
```

You can reset the round robin hosts at any time by calling `.robin()`.

If you don't want to do a simple round robin you can pass a custom handler.

```javascript
var s = studproxy(function (socket, ip, chunk) {
  console.error('New connection from '+ip)
  socket.pipe(net.connect(80)).pipe(socket)
  if (chunk) socket.write(chunk)
})
```

Keep in mind that this customization doesn't not include the connection queues and buffering available when using round robin.

## TODO

* Support IPv6
* Benchmarks (this is a pure TCP proxy so they'll be fairly impressive)
