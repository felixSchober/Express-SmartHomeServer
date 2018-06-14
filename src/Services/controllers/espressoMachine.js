const path = require('path');
const EspressoMachine = require('../../Models/mongo/espresso')
const moment = require('moment');
const powerController = require('./power');
const schedule = require('node-schedule');
const misc = require('../../misc');
const config = require('../../config/espresso');

let lastEspressoTime = moment().subtract(10, 'years');
let turnOffMachineInXSeconds = -1;

const getEspressoMachineFromDB = function () {

}

const checkIfNewEspressoHasBeenCreated = function () {
	// do not create new espresso if last one has been created only 5 minutes ago
	const now = moment();
	const timeDiff = now.diff(lastEspressoTime, 'minutes');
	if (timeDiff < 6) return;
	
	// check current power state
	power.getPowerForPlug(config.espressoPlugName, false, true).then((power) => {
		power = power.response.power;
		if (power > config.espressoPowerThreshold) {
			misc.pushDataToDashboardWidget('Espresso', config.currentStatusWidgetId, 'ON', 'Text');
			console.log('[Espresso]:\tDetected new Espresso. Current Power: ' + power);
			
			// Save to DB
			// get the espresso object from mongoose
			EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
				if (err) {
					console.error('[Espresso]:\tcheckIfNewEspressoHasBeenCreated - Could connect to DB. Error: ' + err);
				} else {
					// create espresso object for logging
					const espressoObject = {created: new Date()};
					espressoMachine.espressos.push(espressoObject);
					console.log('[Espresso]:\tNew Espresso : ' + espressoMachine.espressos[espressoMachine.espressos.length - 1]);
					
					// count espressos this week and push to dashboard
					const numberOfEspressosThisWeek = getNumberOfEspressosThisWeek(espressoMachine.espressos);
					const totalNumberOfEspressos = espressoMachine.espressos.length;
					
					misc.pushDataToDashboardWidget('Espresso', config.espressoWeeklyWidgetId, numberOfEspressosThisWeek, 'Number');
					misc.pushDataToDashboardWidget('Espresso', config.espressoTotalWidgetId, totalNumberOfEspressos, 'Number');
					
					espressoMachine.save(function (err) {
						if (err) {
							console.error('[Espresso]:\tcheckIfNewEspressoHasBeenCreated - Could not create espresso object. Error: ' + err);
						} else {
							console.log('[Espresso]:\tCreated espresso object');
							lastEspressoTime = moment();
						}
					});
				}
			});
			
			// turn machine off in 5 minutes with a "silent" job
			let now = moment();
			const turnOffDate = now.add(5, 'minutes').toDate();
			const job = schedule.scheduleJob(turnOffDate, turnMachineOffAgain);
			console.log('[Espresso]:\tCreated (silent) job to turn off machine in ' + moment(turnOffDate).fromNow());
		}
	})
}

const initializeMachineTurnOffCountdown = function (inXSeconds) {
	// has the countdown not been initialized yet?
	if (turnOffMachineInXSeconds === -1) {
		turnOffMachineInXSeconds = inXSeconds;
		machineTurnOffCountdown();
	} else {
		turnOffMachineInXSeconds += inXSeconds;
	}
}

function machineTurnOffCountdown() {
	notifyWidgetsOfMachineCountdown(turnOffMachineInXSeconds);
	//should we turn it off?
	if (turnOffMachineInXSeconds <= 0) {
		turnMachineOffAgain();
		turnOffMachineInXSeconds = -1;
	} else {
		// reduce countdown and wait one second
		turnOffMachineInXSeconds--;
		setTimeout(machineTurnOffCountdown, 1000);
	}
}

// DEPRECATED
function notifyWidgetsOfMachineCountdown(countdownValue) {
	misc.pushDataToDashboardWidget('Espresso', config.plus10WidgetId, countdownValue, 'Number');
	misc.pushDataToDashboardWidget('Espresso', config.plus50WidgetId, countdownValue, 'Number');
	misc.pushDataToDashboardWidget('Espresso', config.cleanStatusWidgetId, countdownValue, 'Number');
	
	if (countdownValue <= 0) {
		misc.pushDataToDashboardWidget('Espresso', config.currentStatusWidgetId, 'OFF', 'Text');
	} else {
		misc.pushDataToDashboardWidget('Espresso', config.currentStatusWidgetId, 'ON', 'Text');
	}
}

const turnMachineOffAgain = function () {
	// only turn off if no countdown is remaining
	if (turnOffMachineInXSeconds <= 0) {
		powerController.updatePlugState(config.espressoPlugName, false).then(function (result) {
			console.log('[Espresso]:\tMachine was turned off' + result);
		}).catch(function (err) {
			console.error('[Espresso]:\tturnMachineOffAgain - Could not turn off espresso. Error: ' + err);
		});
	} else {
		console.log('[Espresso]:\tMachine should be turned off but there is still countdown remaining');
	}
}

const isEspressoMachineOn = function () {
	return new Promise((resolve, reject) => {
		powerController.getPowerForPlug(config.espressoPlugName, false)
		.then((response) => {
			const powerWattage = response.response.power;
			
			// machine is on if the plug uses more than 0.5 watts
			resolve(powerWattage > 0.5);
		})
		.catch(function (err) {
			console.error('[Espresso]:\tisEspressoMachineOn() - Could not get plug state. Error: ' + err);
			reject(err);
		});
	});
}

const toggleMachine = function () {
	return new Promise((resolve, reject) => {
		console.log('[Espresso]:\ttoggleMachine - Toggle machine state');
		
		isEspressoMachineOn()
		.then((machineInOn) => {
			
			// turn on/off machine
			powerController.updatePlugState(config.espressoPlugName, !machineInOn)
			.then((response) => {
				resolve(response);
			})
			.catch(function (err) {
				console.error('[Espresso]:\ttoggleMachine - Could not set new plug state. Error: ' + err);
				reject({error: err, message: 'Could not set new plug state.'});
			});
		})
		.catch(function (err) {
			console.error('[Espresso]:\ttoggleMachine - Could not get plug state. Error: ' + err);
			reject({error: err, message: 'Could not get plug state.'});
		});
	});
}

const getTotalNumberOfEspressos = function () {
	return new Promise((resolve, reject) => {
		// get the espresso object from mongoose
		EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
			if (err) {
				console.error('[Espresso]:\tgetTotalNumberOfEspressos - Error: ' + err);
				reject(err);
				return;
			}
			
			const numberOfEspressos = espressoMachine.espressos.length;
			const response = {
				name: espressoMachine.name,
				value: numberOfEspressos
			}
			resolve(response);
		});
	});
}

const getNumberOfEspressosThisWeekFromList = function(espressoList) {
	const firstDayOfCurrentWeek = getFirstAndLastDayOfWeek().monday;
	let numberOfEspressos = 0;
	for (let i = espressoList.length - 1; i >= 0; i--) {
		const espresso = espressoList[i];
		if (espresso.created >= firstDayOfCurrentWeek) {
			numberOfEspressos++;
		} else {
			// TODO: reenable that!
			// we've gone to far in the past so let's stop here
			//break;
		}
	}
	return numberOfEspressos;
}

const getNumberOfEspressosThisWeek = function () {
	return new Promise((resolve, reject) => {
		// get the espresso object from mongoose
		EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
			if (err) {
				console.error('[Espresso]:\tgetNumberOfEspressosThisWeek - Error: ' + err);
				reject(err);
				return;
			}
			const numberOfEspressos = getNumberOfEspressosThisWeekFromList(espressoMachine.espressos);
			resolve(numberOfEspressos);
		});
	});
}

function getFirstAndLastDayOfWeek() {
	let today, todayNumber, mondayNumber, sundayNumber, monday, sunday;
	today = new Date();
	todayNumber = today.getDay();
	mondayNumber = 1 - todayNumber;
	sundayNumber = 7 - todayNumber;
	monday = new Date(today.getFullYear(), today.getMonth(), today.getDate()+mondayNumber);
	sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate()+sundayNumber );
	
	return {monday: monday, sunday: sunday};
}

module.exports.toggleMachine = toggleMachine;
module.exports.initializeMachineTurnOffCountdown = initializeMachineTurnOffCountdown;
module.exports.turnOffMachineInXSeconds = turnOffMachineInXSeconds;
module.exports.isEspressoMachineOn = isEspressoMachineOn;
module.exports.getTotalNumberOfEspressos = getTotalNumberOfEspressos;
module.exports.getNumberOfEspressosThisWeek = getNumberOfEspressosThisWeek;