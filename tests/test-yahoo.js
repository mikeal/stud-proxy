var studproxy = require('../index')
  , request = require('request')
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
  
  request('https://localhost:8443/', function (e, resp, body) {
    console.error(resp)
    console.error(body)
  })
})
s.robin([['98.139.127.62', 80]])

