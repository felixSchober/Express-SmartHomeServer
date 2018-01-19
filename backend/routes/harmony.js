const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const openHabConfig = require('../config/openhab');

const channelNumberMapping = {
	'ARD': [1],
	'ZDF': [2],
	'SAT1': [3],
	'RTL': [4],
	'RTL2': [5],
	'VOX': [6],
	'PRO7': [7],
	'KABEL': [8],
	'NTV': [9],
	'N24': [1, 0],
	'ZDFINFO': [1, 1],
	'ZDFNEO': [1, 8],
	'KABEL1DOKU': [1, 3],
	'RTLNITRO': [3, 4],
	'TELE5': [1, 2],
	'SIXX': [1, 1],
	'ARTE': [1, 6],
	'CNN': [1, 7],
	'EUROSPORT': [1, 4],
	'SAT1GOLD': [2, 2],
	'3SAT': [5, 6],
	'BR': [4, 6],
	'SPORT1': [2, 0],
	'EINSPLUS': [1, 1],
	'SWR': [6, 7],
	'TAGESSCHAU24': [1, 5],
	'PRO7MAX': [2, 3],
	'WDW': [3, 7]
}

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
		console.error('[HARMONY]:\trouter.get(\'/activity/current/\', function(req, res, next) - Error while performing request. Error: ' + err);
		res.status(500).send('Error while performing request.' + err);
	});
});

/* POST start activity (from OpenHab)
 * /api/harmony/activity/start/
 */
router.post('/activity/start/', function (req, res) {
	console.log(req.body.device);
	if (req !== null && req.body !== null && req.body.device === null) {
		console.error('[HARMONY]:\trouter.get(\'/activity/current/\', function(req, res, next) - The request was not formatted correctly.');
		res.status(400).send({error: 'The request was not formatted correctly.'});
		return;
	}
	
	const device = req.body.device;
	misc.doOpenHabPostRequest('items/HarmonyHub_CurrentActivity', device)
	.then(function (result) {
		misc.pushDataToDashboardWidget('Harmony', 'tvStatus', device, 'Text');
		res.status(200).send({success: true, result: result, device: device});
	})
	.catch(function (err) {
		console.error('[HARMONY]:\trouter.get(\'/activity/start/\', function(req, res, next) - Error while performing request. Error: ' + err);
		res.status(500).send({success: false, error: err, device: device});
	});
});

/* POST end current activity (from OpenHab)
 * /api/harmony/activity/start/
 */
router.post('/activity/stop/', function (req, res) {
	misc.doOpenHabPostRequest('items/HarmonyHub_CurrentActivity', 'PowerOff')
	.then(function (result) {
		misc.pushDataToDashboardWidget('Harmony', 'tvStatus', 'Off', 'Text');
		res.status(200).send({success: true, result: result});
	})
	.catch(function (err) {
		console.error('[HARMONY]:\trouter.get(\'/activity/stop/\', function(req, res, next) - Error while performing request. Error: ' + err);
		res.status(500).send({success: false, error: err});
	});
});

/* POST end current activity (from OpenHab)
 * /api/harmony/activity/start/
 */
router.post('/tv/channel/:channelName', function (req, res) {
	// This currently supports a maximum of 99 channels. Add another layer of button press requests to support more
	
	const channelName = req.params.channelName;
	const channelNumberList = channelNumberMapping[channelName];
	console.log('[Harmony]:\tSwitching to ' + channelName + ' (' + channelNumberList + ')');
	
	let currentNumber = channelNumberList[0];
	misc.doOpenHabPostRequest('items/' + openHabConfig.harmonyDeviceButtonPressItems['tv'], '' + currentNumber)
	.then(function (result) {
		
		// channel number is > 9
		if (channelNumberList.length > 1) {
			let currentNumber = channelNumberList[1];
			misc.doOpenHabPostRequest('items/' + openHabConfig.harmonyDeviceButtonPressItems['tv'], '' + currentNumber)
			.then(function (result2) {
				res.status(200).send({success: true, result: result2});
			})
			.catch(function (err) {
				console.error('[HARMONY]:\trouter.post(\'/tv/channel/:channelName/\', function(req, res, next) - Could not send second channel command. Error: ' + err);
				res.status(500).send({success: false, error: err, message: 'Could not send second channel command'});
			});
		} else {
			res.status(200).send({success: true, result: result});
		}
	})
	.catch(function (err) {
		console.error('[HARMONY]:\trouter.post(\'/tv/channel/:channelName/\', function(req, res, next) - Could not send first channel command. Error: ' + err);
		res.status(500).send({success: false, error: err, message: 'Could not send first channel command'});
	});
});

module.exports = router;