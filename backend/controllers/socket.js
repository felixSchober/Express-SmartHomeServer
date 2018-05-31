const moment = require('moment');

module.exports.send = function (io, topic, message) {
	io.emit('message', {topic: topic, data: message});
};

module.exports.log = function (io, logMessage, isError) {
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