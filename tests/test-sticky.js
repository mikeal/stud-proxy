var studproxy = require('../index')
  , request = require('request')
  , http = require('http')
  , child_process = require('child_process')
  , path = require('path')
  ;

// Test Configuration
var stud = path.resolve(__dirname, '..', '..', 'stud', 'stud')
  , config = path.resolve(__dirname, '..', 'stud.conf')
  ;

var s = studproxy()
s.listen(8000, function () {
  // Start stud
  var c = child_process.spawn(stud, ['--config='+config])
  c.on('exit', function (code) {
    console.error('Stud has exited w/ status code: '+code)
  })

  // See subprocess output
  c.stdout.pipe(process.stdout)
  c.stderr.pipe(process.stderr)
  
  var ports = [8990, 8991]
  
  http.createServer(function (req, res) {
    res.statusCode = 200
    res.setHeader('content-type', 'text/plain')
    res.end(ports[0].toString())
  }).listen(ports[0], function () {
    http.createServer(function (req, res) {
      res.statusCode = 200
      res.setHeader('content-type', 'text/plain')
      res.end(ports[1].toString())
    }).listen(ports[1], function () {
      
      s.robin([['127.0.0.1', ports[0]], ['127.0.0.1', ports[1]]])
        
      request('https://localhost:8443/', function (e, resp, body) {
        if (e) throw e
        var b = body
        
        console.log('first request success')
                
        request('https://localhost:8443/', function (e, resp, body) {
          if (e) throw e
          if (b !== body) throw new Error('sticky sessions are not working.')
          
          console.log('sticky sessions work')
          
          s.robin([['127.0.0.1', ports[0]]])
          
          request('https://localhost:8443/', function (e, resp, body) {
            if (e) throw e
            if (parseInt(body) !== ports[0]) throw new Error('sticky sessions are not being removed working.')
            
            console.log('changes to LRU work.')
            
            process.exit(0)
          })
        })
      })
      
    })
  })
  
})






