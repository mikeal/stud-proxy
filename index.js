var net = require('net')
  , util = require('util')
  , lru = require('lru-cache')
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
        var ip = chunk.readUInt8(1) +'.'+ 
                 chunk.readUInt8(2) +'.'+ 
                 chunk.readUInt8(3) +'.'+ 
                 chunk.readUInt8(4)
        self.emit('route', socket, ip, chunk.length > 5 ? chunk.slice(5) : null )
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
  self.lru = lru({max:10000})
}
util.inherits(StudProxy, net.Server)

StudProxy.prototype.robin = function (hosts) {
  this._hosts = hosts
  this._hostStrings = hosts.map(function (h) { return h.join(':') })
  this.release()
}
StudProxy.prototype.release = function () {
  var self = this
  self.pending.forEach(function (socket) {
    var dest = self.routeRobin(socket)
    if (socket.buffers) {
      socket.buffers.forEach(function (chunk) {
        dest.write(chunk)
      })
      delete socket.buffers
    }
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
    console.error('no hosts.')
    // buffer requests in to memory
    this.pending.push(socket)
    socket.buffers = []
    socket._ip = ip
    if (chunk) socket.buffers.push(chunk)
    socket.on('data', function (chunk) {socket.buffers.push(chunk)})
    socket.on('end', function () {socket._end = true})
  } else {
    var host = self.lru.get(ip)
    if (!host) {
      host = self.getRobin()
      self.lru.set(ip, host)
    } else {
      if ( self._hostStrings.indexOf(host.join(':')) === -1 ) {
        host = self.getRobin()
        self.lru.set(ip, host)
      }
    }
    var dest = self.routeRobin(socket, host)
    if (chunk) socket.emit('data', chunk)
  }
}
StudProxy.prototype.getRobin = function () {
  var i = this.i
  if (i > this._hosts.length - 1) i = 0
  var host = this._hosts[i]
  this.i = i + 1
  return host
}

StudProxy.prototype.routeRobin = function (socket, ip) {
  var host = ip || this.getRobin()
  var dest = net.connect(host[1], host[0])

  socket.pipe(dest)
  dest.pipe(socket)
    
  return dest
}

module.exports = function (route) {
  return new StudProxy(route)
}
