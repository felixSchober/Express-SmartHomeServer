const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const energyModel = require('../models/mongo/energy');
const moment = require('moment');
const controller = require('../services/controllers/power');


/* GET welcome message
 * /api/harmony/
 */
router.get('/', function(req, res, next) {
	res.send('Power REST Api');
	next(req, res);
});

router.get('/total', function(req, res, next) {
	let currentPower = 0.0;
	
	// for the calculation take
	//		Media
	//		Kitchen
	//		Computer
	//		Lights (not included in total power)
	currentPower += controller.lastPowerStateBuffer.powerStates[1];
	currentPower += controller.lastPowerStateBuffer.powerStates[2];
	currentPower += controller.lastPowerStateBuffer.powerStates[3];
	
	controller.getAggregatedPowerLevelForLightsThatContributeToTotalPower()
	.then((lightsPower) => {
		currentPower += lightsPower;
		res.status(200).send({success: true, power: currentPower});
	}).catch(function (err) {
		console.error('[POWER]:\trouter.get(\'/total\', function(req, res, next) - Could not get power information for lights. Error: ' + err);
		res.status(500).send({success: true, power: currentPower});
	});
});

router.get('/plugs/', function(req, res, next) {
	
	// get the plugs object from mongoose
	energyModel.getAllPlugs(function (err, plugs) {
		if (err) {
			console.error('[POWER]:\trouter.get(\'/plugs/\', function(req, res, next) - Could not get plugs. Error: ' + err);
			res.status(500).send({success: false, error: err});
			return;
		}
		
		res.status(200).send({success: true, plugs: plugs});
	});
});

router.get('/plugs/powerState', function(req, res, next) {
	let currentPower = 0.0;
	for (let i = 0; i < controller.lastPowerStateBuffer.powerStates.length; i++) {
		currentPower += controller.lastPowerStateBuffer.powerStates[i];
	}
	
	res.status(200).send({success: true, power: currentPower});
	next(req, res);
});

router.get('/plugs/:plugName', function(req, res, next) {
	controller.getRawPlugState(req.params.plugName)
	.then(response => {
		res.send(response);
	})
	.catch(function (err) {
		console.error('[POWER]:\trouter.get(\'/plugs/:plugName\', function(req, res, next) - Could not get device from HS110 API. Error: ' + err);
		res.status(500).send({success: false, error: err, device: controller.powerElements[req.params.plugName]});
	});
});

// DEPRECATED (put plug into db)
router.put('/plugs', function(req, res, next) {
	if (req === null || req.body === null || req.body.name === undefined || req.body.host === undefined) {
		console.error('[POWER]:\trouter.put(\'/plugs\', function(req, res, next) - The request was not formatted correctly');
		res.status(400).send({success: false, error: 'The request was not formatted correctly.'});
		return;
	}
	
	energyModel.create({
		name: req.body.name,
		host: req.body.host,
		energyLog: [
			{Logs: [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []]}
		]
	}, function (err, plug) {
		if (err) {
			console.error('[POWER]:\trouter.put(\'/plugs/\', function(req, res, next) - Could not save plug to mongo db. Error: ' + err);
			res.status(500).send(err);
		}
		
		console.log('[POWER]:\tCreated new plug');
		res.send(plug);
	});
});

router.get('/plugs/:plugName/state', function(req, res, next) {
	controller.isPlugRelayOn(req.params.plugName)
	.then((isOn) => {
		res.send({stateOn: isOn});
	})
	.catch(function (err) {
		console.error('[POWER]:\trouter.get(\'/plugs/:plugName/state\', function(req, res, next) - Could not get device from HS110 API. Error: ' + err);
		res.status(500).send({success: false, error: err, device: req.params.plugName});
	});
});

router.get('/plugs/:plugName/powerState', function(req, res, next) {
	
	const plugName = req.params.plugName;
	const getLiveResults = req.query.live || false;
	
	if (!getLiveResults) {
		// get current index of plug so that we can save it in the buffer
		const plugIndex = controller.powerElements.plugs.indexOf(plugName);
		
		res.status(200)
		.send({success: true, device: controller.powerElements[plugName], power: controller.lastPowerStateBuffer.powerStates[plugIndex]});
		return
	}
	
	controller.getPowerForPlug(plugName, false)
	.then((response) => {
		res.status(200).send({success: true, device: controller.powerElements[plugName], state: response});
	})
	.catch(function (err) {
		console.error('[POWER]:\trouter.get(\'/plugs/:plugName/powerState\', function(req, res, next) - Could not get power for plug. Error: ' + err);
		res.status(500).send({success: false, error: err, device: controller.powerElements[plugName]});
	});
});

// DEPRECATED (get history from db)
router.get('/plugs/:plugName/powerState/history', function(req, res, next) {
	
	const plugName = req.params.plugName;
	const getLiveResults = req.query.live || false;
	
	if (getLiveResults) {
		energyModel.getPlugEnergyHistory(plugName, function (err, plugDbDocument) {
			if (err) {
				console.error('[POWER]:\trouter.get(\'/plugs/:plugName/powerState/history\', function(req, res, next) - Could not get model from mongo db. Error: ' + err);
				res.status(500).send({success: false, device: plugName, history: controller.lastPowerStateBuffer.powerHistories[plugName]});
				return;
			}
			
			let lastHour = plugDbDocument.energyLog.slice(-90);
			lastHour = lastHour.map(function (element) {
				return element.power;
			});
			res.status(200).send({success: true, device: plugName, history: lastHour});
		});
	} else {
		res.status(200).send({success: true, device: plugName, history: controller.lastPowerStateBuffer.powerHistories[plugName]});
	}
});

router.post('/plugs/:plugName/state', function (req, res) {
	if (req !== null && req.body !== null && req.body.stateOn === null) {
		console.error('[POWER]:\trouter.post(\'/plugs/:plugName/state\', function(req, res, next) - The request was not formatted correctly. Error: ' + err);
		res.status(400).send({success: false, error: 'The request was not formatted correctly.'});
		return;
	}
	
	const stateOn = req.body.stateOn;
	controller.updatePlugState(req.params.plugName, stateOn)
	.then((result) => {
		res.status(200).send({success: true, device: controller.powerElements[req.params.plugName], stateOn: result.stateOn});
	})
	.catch(function (err) {
		console.error('[POWER]:\trouter.post(\'/plugs/:plugName/state\', function(req, res, next) - Could not update plug state. Error: ' + err);
		res.status(500).send({success: false, error: err, device: controller.powerElements[req.params.plugName]});
	});
});

router.get('/lights/powerState', function(req, res, next) {
	
	const getLiveResults = req.query.live || false;
	
	if (!getLiveResults) {
		const index = controller.lastPowerStateBuffer.powerStates.length - 1
		
		// get current index of plug so that we can save it in the buffer
		res.status(200)
		.send({success: true, power: controller.lastPowerStateBuffer.powerStates[index]});
		return;
	}
	
	
	// get 'live' results
	controller.getAggregatedPowerLevelForLights()
	.then((power) => {
		res.status(200).send({success: true, state: power});
	})
	.catch(function (err) {
		console.error('[POWER]:\trouter.get(\'/lights/powerState\', function(req, res, next) - Could not get power level for lights. Error: ' + err);
		res.status(500).send({success: false, error: err});
	});
});

router.get('/lights/powerState/history', function(req, res, next) {
	res.status(200).send({success: true, history: controller.lastPowerStateBuffer.powerHistories['Lights']});
});


module.exports = router;
module.exports.routePath = 'power';
