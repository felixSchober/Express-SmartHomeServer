const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const hueConfig = require('./../config/hue')


/* GET all sensors
 * /api/hue/
 */
router.get('/sensors', function(req, res, next) {
	
	doHueGetRequest('sensors')
	.then((result) => {
		res.status(200).send(result.data);
	})
	.catch((err) => {
		console.error('[Hue]:\trouter.get(\'/sensors\', function(req, res, next) - Error: ' + err);
		res.status(500).send(err);
	});
});

/* GET all lights
 * /api/hue/lights
 */
router.get('/lights', function(req, res, next) {
	getLights()
	.then((lights) => {
		res.status(200).send(lights);
	})
	.catch((err) => {
		console.error('[Hue]:\trouter.get(\'/lights\', function(req, res, next) - Error: ' + err);
		res.status(500).send(err);
	});
});

/* GET motionSensor temperature data
 * /api/hue/motion/kitchen/
 */
router.get('/sensors/:motionSensorName/temperature/', function(req, res, next) {
	const motionSensorName = req.params.motionSensorName;
	if (motionSensorName === null
			|| motionSensorName === undefined
			|| motionSensorName === ''
			|| hueConfig.hueMotionSensorNameIdMapping[motionSensorName] === null
			|| hueConfig.hueMotionSensorNameIdMapping[motionSensorName] === undefined) {
		console.error('[Hue]:\trouter.get(\'/sensors/:motionSensorName/temperature/\', function(req, res, next) - Error: motionSensorName is not set correctly.' + motionSensorName);
		res.status(400).send({error: 'Param motionSensorName is not set correctly.'});
	} else {
		const sensorId = hueConfig.hueMotionSensorNameIdMapping[motionSensorName];
		const path = 'sensors/' + sensorId
		
		doHueGetRequest(path)
		.then((result) => {
			const data = result.data;
			const temperature = data.state.temperature / 100;
			const response = {temperature: temperature, lastUpdated: data.state.lastupdated};

			res.send(response);
		})
		.catch((err) => {
			console.error('[Hue]:\trouter.get(\'/sensors/:motionSensorName/temperature/\', function(req, res, next) - Error: ' + err);
			res.status(500).send(err);
		});
	}
});

function doHueGetRequest(path) {
	const options = {
		uri: 'http://' + hueConfig.hueIp + ':80/api/' + hueConfig.hueUser + '/' + path,
		method: 'GET'
	}
	return misc.performRequest(options, '[HUE]', true, true);
}

const getLights = function () {
	return new Promise(function (resolve, reject) {
		
		// get the lights from the HUE rest api
		doHueGetRequest('lights').then((result) => {
			const data = result.data;
			
			
			const keys = Object.keys(data);
			const lights = [];
			const lights_on = [];
			const lights_off = [];
			
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				console.log('[Hue]:\tLight ID ' + key);
				
				const light = {
					id: key,
					stateOn: data[key].state.on,
					bri: data[key].state.bri,
					name: data[key].name,
					type: data[key].type,
					id: data[key].uniqueid
				};
				
				if (light.stateOn) lights_on.push(light);
				else lights_off.push(light);
				lights.push(light);
			}
			
			const lightsResult = {
				lightsCount: lights.length,
				lightsOnCount: lights_on.length,
				lightsOffCount: lights_off.length,
				lights: lights,
				lightsOn: lights_on,
				lightsOff: lights_off
			}
			
			resolve(lightsResult);
			
		})
		.catch((err) => {
			console.error('[Hue]:\tgetLights() - Error: ' + err);
			reject(err);
		});
	});
}

module.exports = router;
module.exports.getLights = getLights;
