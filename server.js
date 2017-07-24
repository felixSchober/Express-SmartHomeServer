var express = require('express');
var app = express();
var port = process.env.PORT || 8080;

var http = require('http');
var path = require('path');

var mongoose = require('mongoose');

var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');

// Routes
var index = require('./backend/routes/index');
var espressoMachine = require('./backend/routes/espressoMachine');
var database = require('./backend/database')

// mongoose setup
mongoose.connect(database.remoteUrl);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log('Connection to mongoose successful.')
});

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist')));
app.use(morgan('dev'));
// Routes

/* catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

*/
app.use('/api/espresso', espressoMachine);
app.use('*', index);

const server = http.createServer(app);


server.listen(port, function () {
	console.log('HTTP server listening at http://%s:%s', '127.0.0.1', port);
})

module.exports = app;
