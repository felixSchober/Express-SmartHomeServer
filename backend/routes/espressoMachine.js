const express = require('express');
const router = express.Router();
const path = require('path');
const EspressoMachine = require('./../models/espresso')
const moment = require('moment');
const power = require('./power');
const schedule = require('node-schedule');
const config = require('./../config/espresso');
const controller = require('../controllers/espressoMachine');

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
	
	controller.toggleMachine()
	.then((response) => res.send(response))
	.catch(function (err) {
		console.error('[Espresso]:\trouter.post(\'/machine/:name/state/toggle\', function(req, res, next) - Could not get plug state. Error: ' + err);
		res.status(500).send({error: err, message: 'Could not get plug state.'});
	});
});

router.post('/machine/:name/state/countdown/:seconds', function (req, res, next) {
	const timeToToggle = parseInt(req.params.seconds);
	controller.initializeMachineTurnOffCountdown(timeToToggle);
	res.status(200).send({seconds: timeToToggle});
});

router.get('/machine/:name/state/countdown/', function (req, res, next) {
	let countdownState = controller.turnOffMachineInXSeconds;
	if (countdownState <= 0) {
		countdownState = 0;
	}
	res.status(200).send({seconds: countdownState});
});

router.get('/machine/:name/state/', function (req, res, next) {
	if (controller.turnOffMachineInXSeconds > 0) {
		res.status(200).send({state: true});
	} else {
		controller.isEspressoMachineOn()
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
	controller.getNumberOfEspressosThisWeek()
	.then((result) => {
		res.send({value: result});
	})
	.catch((err) => {
		console.error(err);
		res.status(500).send(err);
	})
});

module.exports = router;
