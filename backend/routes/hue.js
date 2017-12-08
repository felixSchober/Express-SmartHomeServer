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
router.get('/', function(req, res, next) {
	
	doGetRequest('sensors',
			function (data) {
				res.setHeader('Content-Type', 'application/json');
				res.send(data);
			},
			function (error) {
				console.error('[Hue]:\tError / ' + error);
			},
			'hue')
});

/* GET all lights
 * /api/hue/lights
 */
router.get('/lights', function(req, res, next) {
	
	doGetRequest('lights',
			function (data) {
				res.setHeader('Content-Type', 'application/json');
				
				const keys = Object.keys(data);
				const lights = [];
				const lights_on = [];
				const lights_off = [];
				
				for (var i = 0; i < keys.length; i++) {
					const key = keys[i];
					console.log('[Hue]:\tLight ID ' + key);
					
					const light = {
						id: key,
						stateOn: data[key].state.on,
						bri: data[key].state.bri,
						name: data[key].name
					};
					
					if (light.stateOn) lights_on.push(light);
					else lights_off.push(light);
					lights.push(light);
				}
				
				const result = {
					count: lights.length,
					lightsOn: lights_on.length,
					lightsOff: lights_off.length,
					lights: lights
				}
				res.send(result);
			},
			function (error) {
				console.error('[Hue]:\tError / ' + error);
			},
			'hue')
});

/* GET motionSensor Kitchen
 * /api/hue/motion/kitchen/
 */
router.get('/motion/kitchen/temperature/', function(req, res, next) {
	
	doGetRequest('sensors/' + hueConfig.motionSensorTempKitchenId,
			function (data) {
				data = JSON.parse(data);
				
				const temperature = data.state.temperature / 100;
				const response = {temperature: temperature, lastupdated: data.state.lastupdated};
				//res.setHeader('Content-Type', 'application/json');
				res.json(response);
			},
			function (error) {
				console.error('[Hue]:\tError / ' + error);
			},
			'hue')
});

/* GET motionSensor Entrance
 * /api/hue/motion/kitchen/temperature
 */
router.get('/motion/entrance/temperature/', function(req, res, next) {
	
	doGetRequest('sensors/' + hueConfig.motionSensorTempEntranceId,
			function (data) {
				data = JSON.parse(data);
				
				const temperature = data.state.temperature / 100;
				const response = {temperature: temperature, lastupdated: data.state.lastupdated};
				//res.setHeader('Content-Type', 'application/json');
				res.json(response);
			},
			function (error) {
				console.error('[Hue]:\tError / ' + error);
			},
			'hue')
});

/* GET motionSensor Kitchen
 * /api/hue/motion/kitchen/plain
 */
router.get('/motion/kitchen/temperature/plain/', function(req, res, next) {
	
	doGetRequest('sensors/' + hueConfig.motionSensorTempKitchenId,
			function (data) {
				data = JSON.parse(data);
				const temperature = '' + data.state.temperature / 100;
				res.send(temperature);
			},
			function (error) {
				console.error('[Hue]:\tError / ' + error);
			},
			'hue')
});

/* GET motionSensor Entrance
 * /api/hue/motion/entrance/temperature/plain
 */
router.get('/motion/entrance/temperature/plain/', function(req, res, next) {
	
	doGetRequest('sensors/' + hueConfig.motionSensorTempEntranceId,
			function (data) {
				data = JSON.parse(data);
				
				const temperature = '' + data.state.temperature / 100;
				res.send(temperature);
			},
			function (error) {
				console.error('[Hue]:\tError / ' + error);
			},
			'hue')
});


function doGetRequest(path, callback, error, name) {
	const options = {
		uri: 'http://' + hueConfig.hueIp + ':80/api/' + hueConfig.hueUser + '/' + path,
		method: 'GET'
	};
	misc.performRequest(options, 'Hue', true, true).then((result) => {
		callback(result.data);
	});
}

module.exports = router;
