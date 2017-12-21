const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const { Client } = require('tplink-smarthome-api');
const energyModel = require('./../models/energy');

const client = new Client();

const energyHistoryUpdateEveryXSeconds = 10;
const energyHistoryEntriesPerHour = 60 * 60 / energyHistoryUpdateEveryXSeconds;

const plugs = {
	'Espresso': '192.168.178.62',
	'Media': '192.168.178.66',
	'Kitchen': '192.168.178.65',
	'Computer': '192.168.178.64',
	'hosts': ['192.168.178.62', '192.168.178.66', '192.168.178.65', '192.168.178.64'],
	'plugs': ['Espresso', 'Media', 'Kitchen', 'Computer'],
};

const lastPowerStateBuffer = {
	'flushCounter': 0,
	'powerStates': [0, 0, 0, 0],
	'powerHistories': {
		'Espresso': Array.apply(null, Array(energyHistoryEntriesPerHour)).map(Number.prototype.valueOf, 0),
		'Media': Array.apply(null, Array(energyHistoryEntriesPerHour)).map(Number.prototype.valueOf, 0),
		'Kitchen': Array.apply(null, Array(energyHistoryEntriesPerHour)).map(Number.prototype.valueOf, 0),
		'Computer': Array.apply(null, Array(energyHistoryEntriesPerHour)).map(Number.prototype.valueOf, 0),
	}
}

/* GET welcome message
 * /api/harmony/
 */
router.get('/', function(req, res, next) {
	
	res.send('HS110 Plug REST Api');
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
	for (let i = 0; i < lastPowerStateBuffer.powerStates.length; i++) {
		currentPower += lastPowerStateBuffer.powerStates[i];
	}
	
	res.status(200).send({success: true, power: currentPower});
});

router.get('/plugs/:plugName', function(req, res, next) {
	client.getDevice({host: plugs[req.params.plugName]})
	.then((device) => {
		
		// get plug state
		device.getSysInfo()
		.then(response => {
			res.send(response);
		})
		.catch((err) => {
			console.error('[POWER]:\trouter.get(\'/plugs/:plugName\', function(req, res, next) - Could not get power level from HS110 API. Error: ' + err);
			res.status(500).send({success: false, error: err, device: plugs[req.params.plugName]});
		});
		
	}).catch(function (err) {
		console.error('[POWER]:\trouter.get(\'/plugs/:plugName\', function(req, res, next) - Could not get device from HS110 API. Error: ' + err);
		res.status(500).send({success: false, error: err, device: plugs[req.params.plugName]});
	});
});

router.put('/plugs', function(req, res, next) {
	if (req === null || req.body === null || req.body.name === undefined || req.body.host === undefined) {
		console.error('[POWER]:\trouter.put(\'/plugs\', function(req, res, next) - The request was not formatted correctly');
		res.status(400).send({success: false, error: 'The request was not formatted correctly.'});
		return;
	}
	
	energyModel.create({
		name: req.body.name,
		host: req.body.host,
		energyLog: []
	}, function (err, plug) {
		if (err) {
			console.error('[POWER]:\trouter.put(\'/plugs/\', function(req, res, next) - Could not save plug to mongo db. Error: ' + err);
			res.status(500).send(err);
		}
		
		console.log('[Plugs]:\tCreated new plug');
		res.send(plug);
	});
});

router.get('/plugs/:plugName/state', function(req, res, next) {
	client.getDevice({host: plugs[req.params.plugName]})
	.then((device) => {
		
		device.getSysInfo()
		.then(response => {
			if (response.relay_state === 1) res.send({stateOn: true});
			else res.send({stateOn: false});
		}).catch(function (err) {
			console.error('[POWER]:\trouter.get(\'/plugs/:plugName/state\', function(req, res, next) - Could not get relay state of plug. Error: ' + err);
			res.status(500).send({success: false, error: err, device: plugs[req.params.plugName]});
		});
	})
	.catch(function (err) {
		console.error('[POWER]:\trouter.get(\'/plugs/:plugName/state\', function(req, res, next) - Could not get device from HS110 API. Error: ' + err);
		res.status(500).send({success: false, error: err, device: plugs[req.params.plugName]});
	});
});

router.get('/plugs/:plugName/powerState', function(req, res, next) {
	
	const plugName = req.params.plugName;
	const getLiveResults = req.query.live || false;
	
	if (!getLiveResults) {
		// get current index of plug so that we can save it in the buffer
		const plugIndex = plugs.plugs.indexOf(plugName);
		
		res.status(200)
		.send({success: true, device: plugs[plugName], power: lastPowerStateBuffer.powerStates[plugIndex]});
		return
	}
	
	getPowerForPlug(plugs[plugName], false, false)
	.then((response) => {
		res.status(200).send({success: true, device: plugs[plugName], state: response});
	})
	.catch(function (err) {
		console.error('[POWER]:\trouter.get(\'/plugs/:plugName/powerState\', function(req, res, next) - Could not get power for plug. Error: ' + err);
		res.status(500).send({success: false, error: err, device: plugs[plugName]});
	});
});

router.get('/plugs/:plugName/powerState/history', function(req, res, next) {
	
	const plugName = req.params.plugName;
	const getLiveResults = req.query.live || false;
	
	if (getLiveResults) {
		energyModel.getPlugEnergyHistory(plugName, function (err, plugDbDocument) {
			if (err) {
				console.error('[POWER]:\trouter.get(\'/plugs/:plugName/powerState/history\', function(req, res, next) - Could not get model from mongo db. Error: ' + err);
				res.status(500).send({success: false, device: plugName, history: lastPowerStateBuffer.powerHistories[plugName]});
				return;
			}
			
			let lastHour = plugDbDocument.energyLog.slice(-90);
			lastHour = lastHour.map(function (element) {
				return element.power;
			});
			res.status(200).send({success: true, device: plugName, history: lastHour});
		});
	} else {
		res.status(200).send({success: true, device: plugName, history: lastPowerStateBuffer.powerHistories[plugName]});
	}
});

router.post('/plugs/:plugName/state', function (req, res) {
	if (req !== null && req.body !== null && req.body.stateOn === null) {
		console.error('[POWER]:\trouter.post(\'/plugs/:plugName/state\', function(req, res, next) - The request was not formatted correctly. Error: ' + err);
		res.status(400).send({success: false, error: 'The request was not formatted correctly.'});
		return;
	}
	
	const stateOn = req.body.stateOn;
	updatePlugState(req.params.plugName, stateOn)
	.then((result) => {
		res.status(200).send({success: true, device: plugs[req.params.plugName], stateOn: result.stateOn});
	})
	.catch(function (err) {
		console.error('[POWER]:\trouter.post(\'/plugs/:plugName/state\', function(req, res, next) - Could not update plug state. Error: ' + err);
		res.status(500).send({success: false, error: err, device: plugs[req.params.plugName]});
	});
});

function updatePowerStateAndSaveToDb() {
	
	// save to db every 40 seconds
	const shouldSaveToDb = lastPowerStateBuffer.flushCounter % 4 === 0;
	
	if (shouldSaveToDb) lastPowerStateBuffer.flushCounter = 1;
	else lastPowerStateBuffer.flushCounter++;
	
	const promises = [];
	for (var i = 0; i < plugs.hosts.length; i++) {
		const plugName = plugs.plugs[i];
		promises.push(getPowerForPlug(plugName, shouldSaveToDb, false));
	}
	
	Promise.all(promises)
	.then(function (results) {
		for (var i = 0; i < results.length; i++) {
			const currentPlug = results[i];
			
			// get current index of plug so that we can save it in the buffer
			const plugIndex = plugs.plugs.indexOf(currentPlug.plugName);
			if (plugIndex !== -1) {
				lastPowerStateBuffer.powerStates[plugIndex] = currentPlug.response.power;
			}
			
			lastPowerStateBuffer.powerHistories[currentPlug.plugName].push(currentPlug.response.power);
			
			// if the list becomes to long remove the front of the list
			if (lastPowerStateBuffer.powerHistories[currentPlug.plugName].length > energyHistoryEntriesPerHour) {
				lastPowerStateBuffer.powerHistories[currentPlug.plugName].shift()
			}
		}
		console.log('[Plugs]:\tPower State update complete')
	})
	.catch(function (err) {
		console.error('[POWER]:\tupdatePowerStateAndSaveToDb() - For at least on plug there was an error while getting the data. Error: ' + err);
	});
}

const updatePlugState = function (plugName, stateOn) {
	return new Promise(function (resolve, reject) {
		
		client.getDevice({host: plugs[plugName]})
		.then((device) => {
			device.setPowerState(stateOn);
			resolve({stateOn: stateOn});
		})
		.catch(function (err) {
			console.error('[POWER]:\tupdatePlugState() - Could not get device from HS110 API. Error: ' + err);
			reject(err);
		});
	})
	
}

const getPowerForPlug = function(plugName, saveDb, useBuffer) {
	
	if (useBuffer !== undefined && useBuffer === true) {
		// get current index of plug so that we can save it in the buffer
		const plugIndex = plugs.plugs.indexOf(plugName);
		
		// always return a promise
		return new Promise(function (resolve, reject) {
			resolve(lastPowerStateBuffer.powerStates[plugIndex]);
		});
	}
	
	console.log('[Plugs]:\tGet power level for plug ' + plugName);
	
	return new Promise(function (resolve, reject) {
		const plugHost = plugs[plugName];
		client.getDevice({host: plugHost})
		.then((device) => {
			device.emeter.getRealtime().then((response) => {
				
				if (saveDb !== undefined && saveDb === true) {
					// log the current level into the database
					energyModel.getPlugEnergyHistory(plugName, function (err, plugDbDocument) {
						if (err) {
							console.error('[POWER]:\tgetPowerForPlug(' + plugName + ', ' + saveDb + ', ' + useBuffer + ') - mongo db Connection not successful. Error: ' + err);
							reject({error: err, device: plugs[plugName], state: response});
						} else {
							console.log('[Plugs]:\tFound plug db entry for ' + plugDbDocument.name);
							plugDbDocument.energyLog.push(response);
							plugDbDocument.save(function (err) {
								if (err) {
									console.error('[POWER]:\tgetPowerForPlug(' + plugName + ', ' + saveDb + ', ' + useBuffer + ') - Could not save plug data to mongo db. Error: ' + err);
									reject({error: err, device: plugs[plugName], state: response});
								} else {
									console.log('[Plugs]:\tCreated power state log');
									resolve({plugName: plugName, response: response});
								}
							});
						}
					});
				} else {
					resolve({plugName: plugName, response: response});
				}
			})
			.catch(function (err) {
				reject(err);
			});
		})
		.catch(function (err) {
			reject(err);
		});
	});
}

module.exports = router;
module.exports.updatePowerStateAndSaveToDb = updatePowerStateAndSaveToDb;
module.exports.getPowerForPlug = getPowerForPlug;
module.exports.updatePlugState = updatePlugState;
module.exports.energyHistoryEntriesPerHour = energyHistoryEntriesPerHour;
module.exports.energyHistoryUpdateEveryXSeconds = energyHistoryUpdateEveryXSeconds;