const schedule = require('node-schedule');
const controller = require('../controllers/power');
const socketController = require('../controllers/socket');

const socketModuleIdentifier = 'plugState';

module.exports.socketActor = function (io) {
	socketController.log(io, '[Power] Socket Actor is initializing.', false);
	
	const powerUpdate = schedule
	.scheduleJob('*/' + controller.energyHistoryUpdateEveryXSeconds + ' * * * * *', function () {
		sendPowerUpdates(io);
	});
	
	// register events to send messages if the plug state changes
	monitorPlugStates(io);
	
	// send the current state of all plugs so that the status is displayed correctly in the dashboard
	sendInitialPlugStates(io);
	
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

function monitorPlugStates(io) {
	// get plugs
	const plugNames = controller.powerElements.plugs;
	for (const name of plugNames) {
		const powerOn = () => socketController.send(io, 'plugState_' + name, 1);
		const powerOff = () => socketController.send(io, 'plugState_' + name, 0);
		controller.registerPlugPowerEvent(name, powerOn, powerOff);
	}
}

function sendInitialPlugStates(io) {
	const plugNames = controller.powerElements.plugs;
	for (const name of plugNames) {
		controller.isPlugRelayOn(name)
		.then((isOn) => socketController.send(io, 'plugState_' + name, isOn))
		.catch((err) => socketController.log(io, '[Power] Could not get initial plug state for plug '
				+ name + '. Error: ' + err, true));
	}
}

function sendPowerUpdates(io) {
	controller.updatePowerState()
	.then((lastPowerStateBuffer) => {
	
		const aggregatedGraph = [];
		
		// send current power levels
		for (let i = 0; i < lastPowerStateBuffer.powerHistoryKeys.length; i++) {
			const name = lastPowerStateBuffer.powerHistoryKeys[i];
			const currentPower = lastPowerStateBuffer.powerStates[name];
			
			const graphValues = formatForDashboard(lastPowerStateBuffer, name);
			aggregatedGraph.push(graphValues);
			
			socketController.send(io, 'powerLevelValue_' + name, currentPower);
			socketController.send(io, 'powerLevelHistory_' + name, [graphValues]);
		}
		
		socketController.send(io, 'powerLevelHistory_Total', aggregatedGraph);
	})
	.catch((err) => {
		socketController.log(io, 'Could not power history entries. Error: ' + err);
	});
}

function formatForDashboard(powerCache, deviceIndexName) {
	const powerHistoryValues = powerCache.powerHistories[deviceIndexName];
	let timeStamps = powerCache.timestamps;
	
	// convert timestamps to full iso strings
	const serializedTimestamps = [];
	for(const ts of timeStamps){
		serializedTimestamps.push(ts.toISOString(true))
	}
	
	return {
		name: deviceIndexName,
		labels: serializedTimestamps,
		values: powerHistoryValues
	};
}

