const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const http = require('http');
const path = require('path');
const fs = require('fs');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

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

// set the base dir of the application so submodules can still use relative paths from the base directory.
global.__basedir = __dirname;

// Display welcome message
require('./misc').getWelcomeLogMessage();


// mongoose setup
console.log('######################################## DATABASE ########################################\n')
const database = require('./config/database');
database.connect(database.remoteUrl);
console.log('\n##########################################################################################\n\n')


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist')));


const server = http.createServer(app);

// ROUTES SETUP
// Load routes
console.log('######################################### ROUTES #########################################\n')
fs.readdirSync(__dirname + '/routes').forEach((file) => {
	const r = require('{0}/routes/{1}'.format(__dirname, file));
	const path = '/api/' + r.routePath;
	app.use(path, r);
	console.log('Add route: ' + path);
});

// 404: Not found
app.use(function(req, res, next){
	res.json(404, {ERROR: 'Page not found.'});
});

// 500: Error reporing
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.json(500, {ERROR: 'Internal server error.'} );
});

console.log('\n##########################################################################################\n\n')


// SOCKET SETUP
console.log('######################################### SOCKET #########################################\n')
const io = require('socket.io')(server);

// Load socket actors
const socketModules = [];
fs.readdirSync(__dirname + '/socket').forEach((file) => {
	const s = require('{0}/socket/{1}'.format(__dirname, file));
	s.socketActor(io);
	socketModules.push(s);
	console.log('Socket Actor {0} initialized.'.format(file));
});

const socketHandler = require('./services/controllers/socket').getSocketHandler(io, socketModules);


io.on('connection', socketHandler);

console.log('\n##########################################################################################\n\n')

console.log('################################# INITIALISATION FINISHED ################################\n')
server.listen(port, function () {
	console.log('HTTP server listening at http://%s:%s', '127.0.0.1', port);
});


module.exports = app;

