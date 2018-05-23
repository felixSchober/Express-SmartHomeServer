const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const http = require('http');
const path = require('path');


const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const agenda = require('./backend/recurringUpdates');

// Routes
const index = require('./backend/routes/index');
const espressoMachine = require('./backend/routes/espressoMachine');
const hue = require('./backend/routes/hue');
const harmony = require('./backend/routes/harmony');
const power = require('./backend/routes/power');
const calendar = require('./backend/routes/calendar');
const mvg = require('./backend/routes/mvg');
const database = require('./backend/config/database');

// mongoose setup
database.connect(database.remoteUrl);


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
app.use('/api/hue', hue)
app.use('/api/harmony', harmony);
app.use('/api/power', power);
app.use('/api/calendar', calendar);
app.use('/api/mvg', mvg);
app.use('*', index);

const server = http.createServer(app);

// socket setup
const io = require('socket.io')(server);


io.on('connection', (socket) => {
	console.log('Client connected...');
	
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
	
	socket.on('message', (message) => {
		console.log("Message Received: " + message);
		io.emit('message', {type:'new-message', text: message});
	});
	
	
});

server.listen(port, function () {
	console.log('HTTP server listening at http://%s:%s', '127.0.0.1', port);
});


module.exports = app;
