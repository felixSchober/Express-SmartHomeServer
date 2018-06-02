const schedule = require('node-schedule');
const controller = require('../controllers/hue');
const socketController = require('../controllers/socket');

const socketModuleIdentifier = 'lightState';
module.exports.socketName = 'Lights';

module.exports.socketActor = function (io) {

	const lightUpdate = schedule
	.scheduleJob('*/' + controller.pollLightStateEveryXSeconds + ' * * * * *', function () {
		sendLightStateUpdates(io);
	});

	return lightUpdate;
}

module.exports.sendInitialState = function(io) {
	// send the initial state of all lights so that the status is displayed correctly in the dashboard
	sendInitialLightStates(io);
}

module.exports.addSocketObserver = function (socket, io) {
	
	// LIGHT EVENTS
	socket.on(socketModuleIdentifier, (command) => {
		// get name of light and desired state
		if (command === null || command.name === null || command.state === null) {
			const logMessage = '[Lights] Received light change command via socket but message is invalid';
			socketController.log(io, logMessage, false);
			return;
		}
		let pr;
		if (command.state === 'toggle') {
			pr = controller.toggleLightState(command.name);
		} else {
			const state = command.state === 'on'
			pr = controller.setLightState(command.name, state);
		}
		
		pr.then((newState) => socketController.log(io,
				'[Lights] State change successful. New State for Light ' + command.name + ': ' + newState, false)
		).catch((err) => socketController.log(io,
				'[Lights] State change NOT successful. Light Name ' + command.name + ' - Error: ' + err, true));
	});
	
	// SCENE EVENTS
	socket.on(socketModuleIdentifier + '_scene', (command) => {
		// get name of light and desired state
		if (!command || !command.name || !command.state || !command.groupId || !command.sceneId) {
			const logMessage = '[Lights] Received scene change command via socket but message is invalid';
			socketController.log(io, logMessage, false);
			return;
		}
		let pr;
		if (command.state === 'toggle') {
			pr = controller.toggleScene(command.groupId, command.sceneId, true, 1000);
		} else {
			const state = command.state === 'on'
			pr = controller.setLightState(command.name, state);
		}
		
		pr.then((newState) => socketController.log(io,
				'[Lights] State change successful. New State for Light ' + command.name + ': ' + newState, false)
		).catch((err) => socketController.log(io,
				'[Lights] State change NOT successful. Light Name ' + command.name + ' - Error: ' + err, true));
	});
}

function sendLightStateUpdates(io) {
	controller.getCachedLightStateIfPossible()
	.then((result) => sendLightState(io, result))
	.catch((err) => socketController.log(io, 'Could not get light states ' + err, true));
}

function sendInitialLightStates(io) {
	controller.getLights()
	.then((result) => sendLightState(io, result))
	.catch((err) => socketController.log(io, 'Could not get initial light states ' + err, true));
}

function sendLightState(io, lightStates) {
	socketController.send(io, socketModuleIdentifier + '_CountTotal', lightStates.lightsCount);
	socketController.send(io, socketModuleIdentifier + '_CountOn', lightStates.lightsOnCount);
	socketController.send(io, socketModuleIdentifier + '_CountOff', lightStates.lightsOffCount);
	
	// send individual light states
	for(const l of lightStates.lights){
		socketController.send(io, socketModuleIdentifier + '_' + l.name, l.stateOn);
	}
}