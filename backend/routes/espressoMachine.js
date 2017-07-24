var express = require('express');
var router = express.Router();
var EspressoMachine = require('./../models/espresso')


/* GET espresso status. */
router.get('/', function(req, res, next) {
	
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		if (err) res.send(err);
		
		res.json(espressoMachine);
	});
});

router.post('/', function (req, res, next) {
	
	// get the espresso object from mongoose
	EspressoMachine.getEspressoMachine(function (err, espressoMachine) {
		
		// create espresso object for logging
		espressoMachine.espressos.push({});
		console.log('New Espresso : ' + espressoMachine.espressos[espressoMachine.espressos.length - 1])
		espressoMachine.save(function (err) {
			if (err) {
				res.send(err);
			} else {
				console.log('Created espresso')
				res.json(espressoMachine.espressos[espressoMachine.espressos.length - 1]);
			}
		})
	});
})

router.post('/machine/', function (req, res, next) {
	EspressoMachine.create({
		name : 'Krupps Espresso',
		isOn : false,
		espressos: []
	}, function (err, espressoMachine) {
		if (err) res.send(err);
		res.json(espressoMachine);
	})
})

module.exports = router;
