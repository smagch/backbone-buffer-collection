
/**
 * Module Dependencies
 */

var express = require('express')
  , http = require('http');

var app = express();
app.use(express.static(__dirname));
app.get('/', function (req, res) {
  res.redirect('/test/');
});
app.get('/color', require('./fixtures/route.color'));
http.createServer(app).listen(3000, function () {
  console.log('listen on 3000');
});