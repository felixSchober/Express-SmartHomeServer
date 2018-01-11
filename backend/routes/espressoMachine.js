const express = require('express');
const router = express.Router();
const path = require('path');
const EspressoMachine = require('./../models/espresso')
const moment = require('moment');
const power = require('./power');
const schedule = require('node-schedule');


let lastEspressoTime = moment().subtract(10, 'years');
const espressoPlugName = 'Espresso';
const espressoPowerThreshold = 1;

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
		
		const firstDayOfCurrentWeek = getFirstAndLastDayOfWeek().monday;
		let numberOfEspressos = 0;
		for (let i = espressoMachine.espressos.length - 1; i >= 0; i--) {
			const espresso = espressoMachine.espressos[i];
			if (espresso.created >= firstDayOfCurrentWeek) {
				numberOfEspressos++;
			} else {
				// we've gone to far in the past so let's stop here
				break;
			}
		}
		const response = {
			name: espressoMachine.name,
			since: firstDayOfCurrentWeek,
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
	power.getPowerForPlug(espressoPlugName, false, true).then((power) => {
		power = power.response.power;
		if (power > espressoPowerThreshold) {
			console.log('[Espresso]:\tDetected new Espresso. Current Power: ' + power);
			
			// Save to DB
			// get the espresso object from mongoose
			EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
				if (err) {
					console.error('[Espresso]:\tcheckIfNewEspressoHasBeenCreated - Could connect to DB. Error: ' + err);
				} else {
					// create espresso object for logging
					espressoMachine.espressos.push({});
					console.log('[Espresso]:\tNew Espresso : ' + espressoMachine.espressos[espressoMachine.espressos.length - 1])
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
			
			// schedule turn off in latest 5 minutes
			let now = moment();
			const turnOffDate = now.add(5, 'minutes').toDate();
			const job = schedule.scheduleJob(turnOffDate, turnMachineOffAgain);
			console.log('[Espresso]:\tCreated job to turn off machine in ' + moment(turnOffDate).fromNow());
			
		}
	})
}

const turnMachineOffAgain = function () {
	power.updatePlugState(espressoPlugName, false).then(function (result) {
		console.log('[Espresso]:\tMachine was turned off' + result);
	}).catch(function (err) {
		console.error('[Espresso]:\tturnMachineOffAgain - Could not turn off espresso. Error: ' + err);
	});
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
