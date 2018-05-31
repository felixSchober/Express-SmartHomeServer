const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const controller = require('../controllers/hue');

/* GET all sensors
 * /api/hue/
 */
router.get('/sensors', function(req, res, next) {
	controller.getSensors()
	.then((result) => {
		res.status(200).send(result);
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
	controller.getLights()
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
	controller.getSensorTemperature(motionSensorName)
	.then((result) => {
		res.send(result);
	})
	.catch((err) => {
		console.error('[Hue]:\trouter.get(\'/sensors/:motionSensorName/temperature/\', function(req, res, next) - Error: ' + err);
		res.status(500).send(err);
	});
});

router.post('/groups/:groupId/scenes/:sceneId/toggle', function(req, res, next) {
	const groupId = req.params.groupId;
	const sceneId = req.params.sceneId;
	
	// restore a scene if restoreScene is set
	const restoreScene = req.body.restoreScene || '';
	
	// add a transition time if set
	const transitionTime = parseInt(req.body.transitionTime) || -1;
	
	controller.toggleScene(groupId, sceneId, restoreScene, transitionTime)
	.then((response) => {
		res.send(response);
	})
	.catch((err) => {
		console.error('[Hue]:\trouter.post(\'/groups/:groupId/scenes/:sceneId/toggle\', function(req, res, next) - Could not toggle scene. ' + err.error);
		res.status(err.status).send(err.error);
	});
});

module.exports = router;
module.exports.routePath = 'hue';
