const moment = require('moment');
const fs = require('fs');
const send = function (io, topic, message) {
	io.emit('message', {topic: topic, data: message});
};

const log = function (io, logMessage, isError) {
	const message = {
		time: moment(),
		message: logMessage,
		isError: isError };
	
	io.emit('log', message);
	
	if (isError) {
		console.error(logMessage);
	} else {
		console.log(logMessage);
	}
};

// This function is used as the socket io handler. The way it is setup it will get the io reference when the function
// is requested and the socket reference when the socket is created.
module.exports.getSocketHandler = function (io) {
	return function (socket) {
		
		const handshake = socket.handshake;
		const clientIp = handshake.address;
		
		console.log('[Socket] Client with ip {0} connected.'.format(clientIp));
		io.emit('welcome', {});
		
		// Setup default handlers
		socket.on('error', socketOnErrorHandler);
		socket.on('disconnect', socketOnDisconnectHandler);
		
		// set up socket observers
		fs.readdirSync(__basedir + '/socket').forEach((file) => {
			const socketModule = require('{0}/socket/{1}'.format(__basedir, file));
			socketModule.addSocketObserver(socket, io);
			console.log('\t[Socket] Socket Observer from {0} initialized.'.format(file));
		});
	}
}

function socketOnErrorHandler(error) {
	console.error('[Socket] Error in socket pipeline: ' + error);
}

function socketOnDisconnectHandler(clientIp) {
	console.log('[Socket] Client with ip {0} disconnected.'.format(clientIp));
}

module.exports.send = send;
module.exports.log = log;