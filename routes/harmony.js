const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const controller = require('../controllers/harmony');


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
	controller.getCurrentActivity()
	.then(function (result) {
		res.send(result);
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
	controller.startActivity(device)
	.then((result) => {
		misc.pushDataToDashboardWidget('Harmony', 'tvStatus', device, 'Text');
		res.status(200).send(result);
	})
	.catch((err) => {
		console.error('[HARMONY]:\trouter.get(\'/activity/start/\', function(req, res, next) - Error while performing request. Error: ' + err);
		res.status(500).send(err);
	});
});

/* POST end current activity (from OpenHab)
 * /api/harmony/activity/start/
 */
router.post('/activity/stop/', function (req, res) {
	controller.stopActivity()
	.then((result) => {
		misc.pushDataToDashboardWidget('Harmony', 'tvStatus', 'Off', 'Text');
		res.status(200).send(result);
	})
	.catch((err) => {
		console.error('[HARMONY]:\trouter.get(\'/activity/stop/\', function(req, res, next) - Error while performing request. Error: ' + err);
		res.status(500).send(err);
	});
});

/* POST end current activity (from OpenHab)
 * /api/harmony/activity/start/
 */
router.post('/tv/channel/:channelName', function (req, res) {
	// This currently supports a maximum of 99 channels. Add another layer of button press requests to support more
	
	const channelName = req.params.channelName;
	controller.changeChannel(channelName)
	.then((result) => {
		res.send(result);
	})
	.catch((err) => {
		console.error('[HARMONY]:\trouter.post(\'/tv/channel/:channelName/\', function(req, res, next) - Could not send first channel command. Error: ' + err);
		res.status(500).send({success: false, error: err, message: 'Could not send first channel command'});
	});
});

module.exports = router;
module.exports.routePath = 'harmony';
