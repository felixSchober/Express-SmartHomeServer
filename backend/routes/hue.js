const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
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
		host: hueConfig.hueIp,
		port: 80,
		path: '/api/' + hueConfig.hueUser + '/' + path,
		method: 'GET'
	};
	
	request('http://' + options.host + options.path, function (err, response, body) {
		if (err) error(err);
		if (response.statusCode !== 200) error(body);
		
		// from within the callback, write data to response, essentially returning it.
		callback(body);
		
	});
}

module.exports = router;
