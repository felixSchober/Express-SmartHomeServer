const hue = require('./hue');
const hueConfig = require('../../config/hue');
const { Client } = require('tplink-smarthome-api');
const energyModel = require('../../Models/mongo/energy');
const moment = require('moment');

const client = new Client();

// update every 10 seconds
const energyHistoryUpdateEveryXSeconds = 10;

// every minute -> 6 entries -> 360 energy entries per hour
const energyHistoryEntriesPerHour = 60 * 60 / energyHistoryUpdateEveryXSeconds;

// save the energy log to the db every 60 minutes
const saveToDbEveryXMinutes = 60;

const powerElements = {
	'Espresso': '192.168.178.62',
	'Media': '192.168.178.66',
	'Kitchen': '192.168.178.65',
	'Computer': '192.168.178.64',
	'hosts': ['192.168.178.62', '192.168.178.66', '192.168.178.65', '192.168.178.64'],
	'plugs': ['Espresso', 'Media', 'Kitchen', 'Computer'],
};

const lightsThatCountTowardsTotal = [
	'00:17:88:01:10:5c:37:d0-0b', // Eingang
	'00:17:88:01:10:5c:3c:f5-0b', // Kueche
	'00:17:88:01:10:51:b7:f6-0b', // Stehlampe Oben
	'00:17:88:01:10:31:10:71-0b', // Stehlampe Farbe
	'00:17:88:01:10:50:15:9d-0b', // Stehlampe Unten
	'00:17:88:01:00:cb:7d:95-0b', // Fenster
	'00:17:88:01:02:7b:29:94-0b', // Decke
	'7c:b0:3e:aa:00:a3:ca:f5-03', // Schrank
	'84:18:26:00:00:0c:6f:43-03'  // Arbeitsplatte
];

const lastPowerStateBuffer = {
	'powerStates': [0, 0, 0, 0, 0],
	'powerHistories': {
		'Espresso': Array.apply(null, Array(energyHistoryEntriesPerHour)).map(Number.prototype.valueOf, 0),
		'Media': Array.apply(null, Array(energyHistoryEntriesPerHour)).map(Number.prototype.valueOf, 0),
		'Kitchen': Array.apply(null, Array(energyHistoryEntriesPerHour)).map(Number.prototype.valueOf, 0),
		'Computer': Array.apply(null, Array(energyHistoryEntriesPerHour)).map(Number.prototype.valueOf, 0),
		'Lights': Array.apply(null, Array(energyHistoryEntriesPerHour)).map(Number.prototype.valueOf, 0),
	},
	'powerHistoryKeys': ['Espresso', 'Media', 'Kitchen', 'Computer', 'Lights'],
	'timestamps': generateInitialTimestamps()
}


function generateInitialTimestamps() {
	const result = [];
	
	// generate the oldest entry first
	for(let i = energyHistoryEntriesPerHour; i > 0; i--) {
		const secondsToSubtract = (i) * energyHistoryUpdateEveryXSeconds;
		const ts = moment().subtract(secondsToSubtract, 'seconds');
		result.push(ts);
	}
	return result;
}


/*
	###########################
				DB
	###########################
 */

function saveEnergyHistoryToDb(energyHistoryKey) {
	return new Promise(function (resolve, reject) {
		// log the current level into the database
		energyModel.getPlugEnergyHistory(energyHistoryKey, function (err, plugDbDocument) {
			if (err) {
				console.error('[POWER]:\tsaveEnergyHistoryToDb(' + energyHistoryKey + ') - mongo db Connection not successful. Error: ' + err);
				reject({error: err, device: energyHistoryKey});
			} else {
				if (plugDbDocument === null) {
					console.error('[POWER]:\tsaveEnergyHistoryToDb(' + energyHistoryKey + ') - Connection OK but result was null.');
					reject({device: energyHistoryKey});
				} else {
					// just to be save also mod currentHour to make sure we are in [0, 23]
					const currentHour = moment().hour() % 24;
					console.log('[POWER]:\tsaveEnergyHistoryToDb(' + energyHistoryKey + ') - Found plug db entry for ' + plugDbDocument.name + '. Creating log for hour ' + currentHour);
					
					// get the last entry (current day)
					const currentDayIndex = plugDbDocument.energyLog.length - 1
					plugDbDocument.energyLog[currentDayIndex][currentHour] = lastPowerStateBuffer.powerHistories[energyHistoryKey];
					plugDbDocument.save(function (err) {
						if (err) {
							console.error('[POWER]:\tsaveEnergyHistoryToDb(' + energyHistoryKey + ') - Could not save plug data to mongo db. Error: ' + err);
							reject({error: err, device: energyHistoryKey});
						} else {
							console.log('[POWER]:\tsaveEnergyHistoryToDb(' + energyHistoryKey + ') -\tSUCCESS');
							resolve({plugName: energyHistoryKey});
						}
					});
				}
			}
		});
	});
}

const savePowerStateToDb = function () {
	const promises = [];
	for (var i = 0; i < lastPowerStateBuffer.powerHistoryKeys.length; i++) {
		const historyKey = lastPowerStateBuffer.powerHistoryKeys[i];
		promises.push(saveEnergyHistoryToDb(historyKey));
	}
	
	Promise.all(promises)
	.then(function (results) {
		console.log('[POWER]:\tsavePowerStateToDb() - Update complete ' + results);
	})
	.catch(function (err) {
		console.error('[POWER]:\tsavePowerStateToDb() - For at least one element there was an error while saving to db. Error: ' + err);
	});
}

/*
	 ###########################
	   GET UPDATED POWER LEVELS
	 ###########################
 */

const updatePowerState = function () {
	const promises = [];
	for (let i = 0; i < powerElements.hosts.length; i++) {
		const powerElementName = powerElements.plugs[i];
		promises.push(getPowerForPlug(powerElementName, false));
	}
	
	// also push lights promise
	promises.push(getAggregatedPowerLevelForLights());
	
	return new Promise((resolve, reject) => {
		Promise.all(promises)
		.then(function (results) {
			for (let i = 0; i < results.length; i++) {
				const currentPowerElement = results[i];
				
				// if the currentPowerElement has an attribute plugName it's a plug.
				// otherwise it's a light and we can assume the index to be the last position
				let powerElementHistoryName = '';
				let powerLevel = 0;
				
				if (typeof currentPowerElement === 'object') {
					// get current index of plug so that we can save it in the buffer
					const powerElementIndex = powerElements.plugs.indexOf(currentPowerElement.plugName);
					if (powerElementIndex !== -1) {
						lastPowerStateBuffer.powerStates[powerElementIndex] = currentPowerElement.response.power;
					}
					powerElementHistoryName = currentPowerElement.plugName;
					powerLevel = currentPowerElement.response.power
				} else {
					powerElementHistoryName = 'Lights';
					powerLevel = currentPowerElement;
				}
				
				// push to back and remove the first element
				lastPowerStateBuffer.powerHistories[powerElementHistoryName].push(powerLevel);
				lastPowerStateBuffer.powerHistories[powerElementHistoryName].shift();
				
			}
			
			// push to back and remove the first (oldest) element.
			lastPowerStateBuffer.timestamps.push(moment());
			lastPowerStateBuffer.timestamps.shift();
			
			console.log('[POWER]:\tPower State update complete');
			resolve(lastPowerStateBuffer);
		})
		.catch(function (err) {
			console.error('[POWER]:\tupdatePowerStateAndSaveToDb() - For at least one plug there was an error while getting the data. Error: ' + err);
			reject('[POWER]:\tupdatePowerStateAndSaveToDb() - For at least one plug there was an error while getting the data. Error: ' + err);
		});
	});
}


/*
	###########################
	 GET POWER USAGE FOR DEVICES
 	###########################
 */

function getPowerForLights() {
	return new Promise(function (resolve, reject) {
		// get 'on' lights
		hue.getLights()
		.then((result) => {
			const lightsOn = result.lightsOn;
			
			if (lightsOn === undefined || lightsOn.length < 1) {
				resolve([]);
			} else {
				// create power mapping
				const lightPowerLevels = lightsOn.map((light) => {
					// search for light type first
					let powerLevel = hueConfig.lightTypePowerMapping[light.type];
					
					if (powerLevel > -1) light.power = powerLevel;
					else {
						// get individual power level per device id
						light.power = hueConfig.lightIdPowerMapping[light.uniqueId];
					}
					if (light.power === undefined || light.power === null) {
						const err = {
							message: 'power for light is undefined',
							light: light
						};
						console.error('[POWER]:\tgetPowerForLights() - Could not get power level for light ' + light.name);
						reject(err);
						return;
					}
					
					// scale power output linearly according to brightness level
					// plug units are not scalable
					if (hueConfig.lightsPowerLevelNotScalable.indexOf(light.type) === -1) {
						const brightnessScale = light.bri / hueConfig.maxBrightnessLevel;
						light.power *= brightnessScale;
					}
					
					return light;
				});
				resolve(lightPowerLevels);
			}
		})
		.catch(function (err) {
			console.error('[POWER]:\tgetPowerForLights() - Could not get lights from hue module {0}. Error: {1}'.format(err.light, err.message));
			reject('Could not get lights from hue module {0}. Error: {1}'.format(err.light, err.message));
		});
	});
}

const getAggregatedPowerLevelForLightsThatContributeToTotalPower = function () {
	return new Promise(function (resolve, reject) {
		getPowerForLights()
		.then((lights) => {
			// get lights that contribute to the total power level that are not already counted by the plugs
			let totalPower = 0.0
			for (let i = 0; i < lights.length; i++) {
				if (lightsThatCountTowardsTotal.indexOf(lights[i].id) !== -1) {
					totalPower += lights[i].power;
				}
			}
			resolve(totalPower);
		})
		.catch(function (err) {
			console.error('[POWER]:\tgetAggregatedPowerLevelForLightsThatContributeToTotalPower() - Could not get power levels for lights. Error: ' + err);
			reject(err);
		});
	});
}

const getAggregatedPowerLevelForLights = function () {
	return new Promise(function (resolve, reject) {
		getPowerForLights()
		.then((lights) => {
			// get lights that contribute to the total power level that are not already counted by the plugs
			let totalPower = 0.0
			for (let i = 0; i < lights.length; i++) {
				totalPower += lights[i].power;
			}
			resolve(totalPower);
		})
		.catch(function (err) {
			console.error('[POWER]:\tgetAggregatedPowerLevelForLights() - Could not get power levels for lights. Error: ' + err);
			reject(err);
		});
	});
}

const getPowerForPlug = function(plugName, useBuffer) {
	
	if (useBuffer !== undefined && useBuffer === true) {
		// get current index of plug so that we can save it in the buffer
		const plugIndex = powerElements.plugs.indexOf(plugName);
		
		// always return a promise
		return new Promise(function (resolve, reject) {
			resolve(lastPowerStateBuffer.powerStates[plugIndex]);
		});
	}
	
	console.log('[POWER]:\tGet live power level for plug ' + plugName);
	
	return new Promise(function (resolve, reject) {
		const plugHost = powerElements[plugName];
		client.getDevice({host: plugHost})
		.then((device) => {
			device.emeter.getRealtime().then((response) => {
				resolve({plugName: plugName, response: response});
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

const getRawPlugState = function (plugName) {
	return new Promise((resolve, reject) => {
		client.getDevice({host: powerElements[plugName]})
		.then((device) => {
			
			// get plug state
			device.getSysInfo()
			.then(response => {
				resolve(response);
			})
			.catch((err) => {
				console.error('[POWER]:\tgetRawPlugState(' + plugName + ') - Could not get power level from HS110 API. Error: ' + err);
				reject({success: false, error: err, device: powerElements[plugName]});
			});
		}).catch(function (err) {
			console.error('[POWER]:\tgetRawPlugState(' + plugName + ') - Could not get device from HS110 API. Error: ' + err);
			reject({success: false, error: err, device: powerElements[req.params.plugName]});
		});
	});
}

const isPlugRelayOn = function (plugName) {
	return new Promise((resolve, reject) => {
		getRawPlugState(plugName)
		.then((response) => {
			if (response.relay_state === 1) resolve(true);
			else resolve(false);
		}).catch(function (err) {
			console.error('[POWER]:\tgetPlugState(' + plugName + ') - Could not get device from HS110 API. Error: ' + err);
			reject({success: false, error: err, device: powerElements[plugName]});
		});
	});
}

/*
	 ###########################
	 	  UPDATE PLUG STATE
	 ###########################
 */

const updatePlugState = function (plugName, stateOn) {
	return new Promise(function (resolve, reject) {
		
		client.getDevice({host: powerElements[plugName]})
		.then((device) => {
			// do not wait for promise to complete
			//noinspection JSIgnoredPromiseFromCall
			device.setPowerState(stateOn);
			resolve({stateOn: stateOn});
		})
		.catch(function (err) {
			console.error('[POWER]:\tupdatePlugState() - Could not get device from HS110 API. Error: ' + err);
			reject(err);
		});
	});
}

const togglePlugState = function (plugName) {
	return new Promise(function (resolve, reject) {
		
		client.getDevice({host: powerElements[plugName]})
		.then((device) => {
			device.togglePowerState()
			.then((newState) => resolve(newState))
			.catch((err) => reject(err));
		})
		.catch(function (err) {
			console.error('[POWER]:\ttogglePlugState() - Could not get device from HS110 API. Error: ' + err);
			reject(err);
		});
	})
}

const registerPlugPowerEvent = function(plugName, callbackOn, callbackOff) {
	client.getDevice({host: powerElements[plugName]})
	.then((device) => {
		device.on('power-on', callbackOn);
		device.on('power-off', callbackOff);
		console.log('[Power] registerPlugPowerEvent({0}, {1}, {2}) - registered plug state changes'
		.format(plugName, callbackOn, callbackOff));
	})
	.catch(function (err) {
		console.error('[POWER]:\tregisterPlugPowerEvent({0}, {1}, {2}) - Could not get device from HS110 API. ' +
				'Error: {3}'.format(plugName, callbackOn, callbackOff, err));
	});
}

module.exports.updatePowerState = updatePowerState;
module.exports.togglePlugState = togglePlugState;
module.exports.getPowerForPlug = getPowerForPlug;
module.exports.updatePlugState = updatePlugState;
module.exports.energyHistoryEntriesPerHour = energyHistoryEntriesPerHour;
module.exports.energyHistoryUpdateEveryXSeconds = energyHistoryUpdateEveryXSeconds;
// module.exports.savePowerStateToDb = savePowerStateToDb - do not save anymore
module.exports.lastPowerStateBuffer = lastPowerStateBuffer;
module.exports.getRawPlugState = getRawPlugState;
module.exports.isPlugRelayOn = isPlugRelayOn;
module.exports.powerElements = powerElements;
module.exports.registerPlugPowerEvent = registerPlugPowerEvent;
module.exports.getAggregatedPowerLevelForLightsThatContributeToTotalPower = getAggregatedPowerLevelForLightsThatContributeToTotalPower;