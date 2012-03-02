var net = require('net')
  , util = require('util')
  ;

function StudProxy (customRoute) {
  var self = this
  net.Server.call(self)
  if (customRoute) self.route = customRoute
  self.on('connection', function (socket) {
    var c
    var listener = function (chunk) {
      // This is almost never called, the first chunk is almost always discreet.
      if (c) {
        n = new Buffer(c.length + chunk.length)
        n.write(c)
        n.write(chunk)
        chunk = n
      }

      if (chunk[0] === 2 && chunk.length >= 5) {
        // IPv4
        var ip = [chunk.readInt8(1), chunk.readInt8(2), chunk.readInt8(3), chunk.readInt8(4)]
        if (ip[1] < 0) ip[1] = ip[1] + 256
        if (ip[2] < 0) ip[2] = ip[2] + 256
        if (ip[3] < 0) ip[3] = ip[3] + 256
        self.emit('route', socket, ip.join('.'), chunk.length > 5 ? chunk.slice(5) : null )
      }

      // TODO: Add IPv6 Support

      // This almost never get called, the first chunk is almost always discreet.
      if (chunk.length < 5) {
        c = chunk
        socket.once(listener)
      }
    }
    socket.once('data', listener)
  })
  self.on('route', function () {
    self.route.apply(self, arguments)
  })
  self.pending = []
  self.i = 0
}
util.inherits(StudProxy, net.Server)

StudProxy.prototype.robin = function (hosts) {
  this._hosts = hosts
  this.release()
}
StudProxy.prototype.release = function () {
  var self = this
  self.pending.forEach(function (socket) {
    var dest = self.routeRobin(socket)
    socket.buffers.forEach(function (chunk) {
      dest.write(chunk)
    })
    delete socket.buffers
    if (socket._error) socket.emit('error', socket._error)
    if (socket._end) dest.end()
  })
}
StudProxy.prototype.route = function (socket, ip, chunk) {
  var self = this
  socket.on('error', function (e) {
    if (socket.buffers) socket._error = e
    else self.emit('socketError', e, socket)
  })
  if (!this._hosts) {
    // buffer requests in to memory
    this.pending.append(socket)
    socket.buffers = []
    socket._ip = ip
    if (chunk) socket.buffers.append(chunk)
    socket.on('data', function (chunk) {socket.buffers.append()})
    socket.on('end', function () {socket._end = true})
  } else {
    var dest = self.routeRobin(socket)
    if (chunk) socket.write(chunk)
  }
}
StudProxy.prototype.routeRobin = function (socket) {
  var i = this.i
  if (i > this._hosts.length - 1) i = 0
  var host = this._hosts[i]
  var dest = net.connect(host[1], host[0])
  socket.pipe(dest)
  dest.pipe(socket)
  this.i = i + 1
  return dest
}

module.exports = function (route) {
  return new StudProxy(route)
}
