const schedule = require('node-schedule');
const controller = require('../controllers/hue');
const socketController = require('../controllers/socket');

const socketModuleIdentifier = 'lightState';

module.exports.socketActor = function (io) {

	const powerUpdate = schedule
	.scheduleJob('*/' + controller.pollLightStateEveryXSeconds + ' * * * * *', function () {
		//sendPowerUpdates(io);
	});
	
	// register events to send messages if the plug state changes
	monitorLightStates(io);
	
	// send the current state of all plugs so that the status is displayed correctly in the dashboard
	sendInitialLightStates(io);
	
	return powerUpdate;
}

module.exports.addSocketObserver = function (socket, io) {
	socket.on(socketModuleIdentifier, (command) => {
		// get name of plug and desired state
		if (!command || !command.name || !command.state) {
			const logMessage = '[Power] Received plug change command via socket but message is invalid';
			socketController.log(io, logMessage, false);
			return;
		}
		let pr;
		if (command.state === 'toggle') {
			pr = controller.togglePlugState(command.name);
		} else {
			const state = command.state === 'on'
			pr = controller.updatePlugState(command.name, state);
		}
		
		pr.then((newState) => socketController.log(io,
				'[Power] State change successful. New State for plug ' + command.name + ': ' + newState, false)
		).catch((err) => socketController.log(io,
				'[Power] State change NOT successful. Plug ' + command.name + ' - Error: ' + err, true));
	});
}

function monitorLightStates(io) {
	//
}

function sendInitialLightStates(io) {
	//
}

function sendLightUpdates(io) {
	controller.getLights()
	.then((lights) => {
	
	})
	.catch((err) => {
		socketController.log(io, 'Could not power history entries. Error: ' + err);
	});
}

function formatForDashboard(powerCache, deviceIndexName) {
	const powerHistoryValues = powerCache.powerHistories[deviceIndexName];
	let timeStamps = powerCache.timestamps;
	
	return {
		name: deviceIndexName,
		labels: timeStamps,
		values: powerHistoryValues
	};
}

