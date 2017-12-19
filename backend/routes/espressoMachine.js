const express = require('express');
const router = express.Router();
const path = require('path');
const EspressoMachine = require('./../models/espresso')
const PythonShell = require('python-shell');
const moment = require('moment');
const hs110Plugs = require('./hs110Plugs');
const schedule = require('node-schedule');


let lastEspressoTime = moment().subtract(10, 'years');
const espressoPlugName = 'Espresso';
const espressoPowerThreshold = 1;

/* GET espresso status.
 * /api/espresso/
 */
router.get('/', function(req, res, next) {
	
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		if (err) {
			res.send(err);
			return;
		}
		
		res.json(espressoMachine);
	});
});
/* POST New Espresso
 * /api/espresso/
 */
router.post('/', function (req, res, next) {
	
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		const pythonScriptPath = path.resolve(__dirname, '..', 'python', 'espresso');
		const pythonScriptOptions = {
			mode: 'text',
			scriptPath: pythonScriptPath,
			args: []
		};
		var pythonShell = new PythonShell('__main__.py', pythonScriptOptions)
		
		pythonShell.on('message', function (message) {
			console.log('[Espresso]:\t' + message)
		});
		
		pythonShell.end(function (err) {
			if (err) {
				console.error('[Espresso]:\t' + err.stack)
				callback(err.message, null);
				return;
			}
			console.log('[Espresso]:\tPython terminated');
		});
		
		// create espresso object for logging
		espressoMachine.espressos.push({});
		console.log('[Espresso]:\tNew Espresso : ' + espressoMachine.espressos[espressoMachine.espressos.length - 1])
		espressoMachine.save(function (err) {
			if (err) {
				res.send(err);
			} else {
				console.log('[Espresso]:\tCreated espresso object')
				res.json(espressoMachine.espressos[espressoMachine.espressos.length - 1]);
			}
		})
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
		if (err) res.send(err);
		
		console.log('[Espresso]:\tCreated new espresso machine');
		res.json(espressoMachine);
	})
})

/* GET total number of espressos drunk
 * /api/espresso/statistic/total
 */
router.get('/statistic/total/', function(req, res, next) {
	
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		if (err) res.send(err);
		
		const numberOfEspressos = espressoMachine.espressos.length;
		const response = {
			name: espressoMachine.name,
			value: numberOfEspressos
		}
		res.json(response);
	});
});

/* GET number of espressos drunk this week
 * /api/espresso/statistic/total
 */
router.get('/statistic/week/', function(req, res, next) {
	console.log('Got /statistic/week/ request');
	
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		if (err) res.send(err);
		
		const firstDayOfCurrentWeek = getFirstAndLastDayOfWeek().monday;
		var numberOfEspressos = 0;
		for (var i = espressoMachine.espressos.length - 1; i >= 0; i--) {
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
		res.json(response);
	});
});

const checkIfNewEspressoHasBeenCreated = function () {
	// do not create new espresso if last one has been created only 5 minutes ago
	const now = moment();
	const timeDiff = now.diff(lastEspressoTime, 'minutes');
	if (timeDiff < 6) return;
	
	// check current power state
	hs110Plugs.getPowerForPlug(espressoPlugName, false, true).then((power) => {
		if (power > espressoPowerThreshold) {
			console.log('[Espresso]:\tDetected new Espresso. Current Power: ' + power);
			
			// Save to DB
			// get the espresso object from mongoose
			EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
				if (err) {
					console.error('[Espresso]:\tCould connect to DB ' + err);
				} else {
					// create espresso object for logging
					espressoMachine.espressos.push({});
					console.log('[Espresso]:\tNew Espresso : ' + espressoMachine.espressos[espressoMachine.espressos.length - 1])
					espressoMachine.save(function (err) {
						if (err) {
							console.error('[Espresso]:\tCould not create espresso object ' + err);
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
	hs110Plugs.updatePlugState(espressoPlugName, false).then(function (result) {
		console.log('[Espresso]:\tMachine was turned off' + result);
	}).catch(function (err) {
		console.error('[Espresso]:\tCould not turn off espresso' + err);
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
