const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const http = require('http');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const agenda = require('./recurringUpdates');

// add string format capability
if (!String.prototype.format) {
	String.prototype.format = function() {
		let args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] !== 'undefined'
					? args[number]
					: match
					;
		});
	};
}

// socket
const powerSocket = require('./socket/power');

const database = require('./config/database');

// mongoose setup
database.connect(database.remoteUrl);


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist')));

// Load routes
require('fs').readdirSync(__dirname + '/routes').forEach((file) => {
	const r = require('{0}/routes/{1}'.format(__dirname, file));
	const path = '/api/' + r.routePath;
	app.use(path, r);
	console.log('Add route: ' + path);
});



const server = http.createServer(app);

// socket setup
const io = require('socket.io')(server);

// add socket


io.on('connection', (socket) => {
	console.log('Client connected...');
	
	io.emit('welcome', {});
	
	// set up socket modules
	powerSocket.socketActor(io);
	powerSocket.socketObserver(socket, io);
	
	/*
	setInterval(function () {
		io.emit('message', {topic: 'TestTemperatureWidget1', data: Math.random() * 100});
		io.emit('message', {topic: 'A', data: Math.random() * 100});
		
	}, 5000);
	*/
	
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
	
	socket.on('message', (message) => {
		console.log("Message Received: " + message);
		//io.emit('message', {type:'new-message', text: message});
	});
});

server.listen(port, function () {
	console.log('HTTP server listening at http://%s:%s', '127.0.0.1', port);
});


module.exports = app;

