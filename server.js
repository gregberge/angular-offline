var path = require('path');
var express = require('express');

var app = express();

app.use(express.static(path.join(__dirname, 'example')));
app.use('/angular-offline.js', express.static(path.join(__dirname, 'angular-offline.js'), {etag: false, maxAge: 30000000}));
app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));
app.get('/test.json', function (req, res) {
  res.send({foo: 'bar'});
});
app.post('/test.json', function (req, res) {
  res.send({foo: 'bar'});
});

app.listen(process.env.PORT || 3000);
console.log('Server is listening, http://localhost:3000/');
