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
	misc.doOpenHabRequest('items/HarmonyHub_CurrentActivity')
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
	if (req !== null && req.body !== null && req.body.device !== null) {
		res.status(400).send('The request was not formatted correctly.');
		return;
	}
	
	const device = req.body.device;
});

/* POST end current activity (from OpenHab)
 * /api/harmony/activity/start/
 */
router.post('/activity/stop/', function (req, res) {

});

module.exports = router;