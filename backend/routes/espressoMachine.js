const express = require('express');
const router = express.Router();
const path = require('path');
const EspressoMachine = require('./../models/espresso')
const moment = require('moment');
const power = require('./power');
const schedule = require('node-schedule');
const misc = require('./../misc');
const config = require('./../config/espresso');

let lastEspressoTime = moment().subtract(10, 'years');
let turnOffMachineInXSeconds = -1;

/* GET espresso status.
 * /api/espresso/
 */
router.get('/machine', function(req, res, next) {
	
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		if (err) {
			console.error('[Espresso]:\trouter.get(\'/machine\', function(req, res, next) - Error: ' + err);
			res.status(500).send(err);
			return;
		}
		
		res.send(espressoMachine);
	});
});

/* POST Creates new Espresso Machine
 * /api/espresso/machine/
 */
router.post('/machine/', function (req, res, next) {
	
	EspressoMachine.create({
		name : 'Krupps Espresso',
		isOn : false,
		espressos: []
	}, function (err, espressoMachine) {
		if (err) {
			console.error('[Espresso]:\trouter.post(\'/machine\', function(req, res, next) - Error: ' + err);
			res.status(500).send(err);
			return;
		}
		
		console.log('[Espresso]:\tCreated new espresso machine');
		res.json(espressoMachine);
	})
})

/* POST Creates new Espresso Machine
 * /api/espresso/machine/
 */
router.put('/machine/:name/espresso', function (req, res, next) {
	const machineName = req.params.name;
	
	// Save to DB
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		if (err) {
			console.error('[Espresso]:\trouter.put(\'/machine/:name/espresso\', function(req, res, next) - Could connect to DB. Error: ' + err);
			res.status(500).send(err);
		} else {
			// create espresso object for logging
			espressoMachine.espressos.push({});
			console.log('[Espresso]:\trouter.put(\'/machine/:name/espresso\', function(req, res, next) - New Espresso : ' + espressoMachine.espressos[espressoMachine.espressos.length - 1])
			espressoMachine.save(function (err) {
				if (err) {
					console.error('[Espresso]:\trouter.put(\'/machine/:name/espresso\', function(req, res, next) - Could not create espresso object. Error: ' + err);
					res.status(500).send(err);
				} else {
					console.log('[Espresso]:\trouter.put(\'/machine/:name/espresso\', function(req, res, next) - Created espresso object');
					res.status(201).send(espressoMachine.espressos[espressoMachine.espressos.length - 1])
				}
			});
		}
	});
})


router.post('/machine/:name/state/toggle', function (req, res, next) {
	const machineName = req.params.name;
	
	// make a "callback" possible which means that the status is pushed here back to the dashboard
	const widgetIdsToPush = req.body.widgetIds || [];
	
	console.log('[Espresso]:\trouter.post(\'/machine/:name/state/toggle\', function(req, res, next) - Toggle machine state');
	
	isEspressoMachineOn()
	.then((machineInOn) => {
		
		// turn on/off machine
		power.updatePlugState(config.espressoPlugName, !machineInOn)
		.then((response) => {
			const newStatusText = machineInOn ? 'OFF' : 'ON';
			
			// push the new state to the widgets
			for (var i = 0; i < widgetIdsToPush.length; i++) {
				console.log('[Hue]:\trouter.post(\'/groups/:groupId/scenes/:sceneId/toggle\', function(req, res, next) - Pushing new hue state (' + newStatusText + ') to widget id : ' + widgetIdsToPush[i]);
				misc.pushDataToDashboardWidget('Espresso', widgetIdsToPush[i], newStatusText, 'Text');
			}
			// TODO: send new status
			res.send(response);
		})
		.catch(function (err) {
			console.error('[Espresso]:\trouter.post(\'/machine/:name/state/toggle\', function(req, res, next) - Could not set new plug state. Error: ' + err);
			res.status(500).send({error: err, message: 'Could not set new plug state.'});
		});
	})
	.catch(function (err) {
		console.error('[Espresso]:\trouter.post(\'/machine/:name/state/toggle\', function(req, res, next) - Could not get plug state. Error: ' + err);
		res.status(500).send({error: err, message: 'Could not get plug state.'});
	});
});

router.post('/machine/:name/state/countdown/:seconds', function (req, res, next) {
	const timeToToggle = parseInt(req.params.seconds);
	initializeMachineTurnOffCountdown(timeToToggle);
	res.status(200).send({seconds: turnOffMachineInXSeconds});
});

router.get('/machine/:name/state/countdown/', function (req, res, next) {
	res.status(200).send({seconds: turnOffMachineInXSeconds});
});

router.get('/machine/:name/state/', function (req, res, next) {
	if (turnOffMachineInXSeconds > 0) {
		res.status(200).send({state: true});
	} else {
		isEspressoMachineOn()
		.then((isMachineOn) => {
			res.status(200).send({state: isMachineOn});
		})
		.catch(function (err) {
			console.error('[Espresso]:\trouter.get(\'/machine/:name/state/\', function(req, res, next) - Could not get plug state for espresso machine. Error: ' + err);
			res.status(500).send({error: err, message: 'Could not get plug state.'});
		});
	}
});


/* GET total number of espressos drunk
 * /api/espresso/statistic/total
 */
router.get('/statistic/total/', function(req, res, next) {
	
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		if (err) {
			console.error('[Espresso]:\trouter.get(\'/statistic/total/\', function(req, res, next) - Error: ' + err);
			res.status(500).send(err);
			return;
		}
		
		const numberOfEspressos = espressoMachine.espressos.length;
		const response = {
			name: espressoMachine.name,
			value: numberOfEspressos
		}
		res.status(200).send(response);
	});
});

/* GET number of espressos drunk this week
 * /api/espresso/statistic/total
 */
router.get('/statistic/week/', function(req, res, next) {
	
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		if (err) {
			console.error('[Espresso]:\trouter.get(\'/statistic/week/\', function(req, res, next) - Error: ' + err);
			res.status(500).send(err);
			return;
		}
		const numberOfEspressos = getNumberOfEspressosThisWeek(espressoMachine.espressos);
		const response = {
			name: espressoMachine.name,
			value: numberOfEspressos
		}
		res.status(200).send(response);
	});
});

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

function initializeMachineTurnOffCountdown(inXSeconds) {
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
		power.updatePlugState(config.espressoPlugName, false).then(function (result) {
			console.log('[Espresso]:\tMachine was turned off' + result);
		}).catch(function (err) {
			console.error('[Espresso]:\tturnMachineOffAgain - Could not turn off espresso. Error: ' + err);
		});
	} else {
		console.log('[Espresso]:\tMachine should be turned off but there is still countdown remaining');
	}
}

function isEspressoMachineOn() {
	return new Promise(function (resolve, reject) {
		power.getPowerForPlug(config.espressoPlugName, false)
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

function getNumberOfEspressosThisWeek(espressoList) {
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


function getFirstAndLastDayOfWeek() {
	var today, todayNumber, mondayNumber, sundayNumber, monday, sunday;
	today = new Date();
	todayNumber = today.getDay();
	mondayNumber = 1 - todayNumber;
	sundayNumber = 7 - todayNumber;
	monday = new Date(today.getFullYear(), today.getMonth(), today.getDate()+mondayNumber);
	sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate()+sundayNumber );
	
	return {monday: monday, sunday: sunday};
}

module.exports = router;
module.exports.checkIfNewEspressoHasBeenCreated = checkIfNewEspressoHasBeenCreated;
