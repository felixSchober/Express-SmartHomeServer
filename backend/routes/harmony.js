const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const openHabConfig = require('../config/openhab');

/* GET welcome message
 * /api/harmony/
 */
router.get('/', function(req, res, next) {
	
	res.send('Harmony REST Api');
});

/* GET current activity (from OpenHab)
 * /api/harmony/activity/current/
 */
router.get('/activity/current/', function(req, res, next) {
	console.log('GET current activity');
	misc.doOpenHabGetRequest('items/HarmonyHub_CurrentActivity')
	.then(function (result) {
		
		const isActivityRunning = (result.data.state !== 'PowerOff');
		
		const response = {
			'activityRunning': isActivityRunning,
			'activity': result.data.state
		}
		res.send(response);
	})
	.catch(function (err) {
		res.status(500).send('Error while performing request.' + err);
	});
});

/* POST start activity (from OpenHab)
 * /api/harmony/activity/start/
 */
router.post('/activity/start/', function (req, res) {
	console.log(req.body.device);
	if (req !== null && req.body !== null && req.body.device === null) {
		res.status(400).send('The request was not formatted correctly.');
		return;
	}
	
	const device = req.body.device;
	misc.doOpenHabPostRequest('items/HarmonyHub_CurrentActivity', device)
	.then(function (result) {
		res.status(200).send({success: true, result: result, device: device});
	})
	.catch(function (err) {
		res.status(500).send({success: false, error: err, device: device});
	});
});

/* POST end current activity (from OpenHab)
 * /api/harmony/activity/start/
 */
router.post('/activity/stop/', function (req, res) {
	misc.doOpenHabPostRequest('items/HarmonyHub_CurrentActivity', 'PowerOff')
	.then(function (result) {
		res.status(200).send({success: true, result: result});
	})
			.catch(function (err) {
		res.status(500).send({success: false, error: err});
	});
});

module.exports = router;