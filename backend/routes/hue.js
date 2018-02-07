const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const hueConfig = require('./../config/hue')


// scene cache
// there is no way to get the active scene from the hue api. So to be able to toggle scenes we have keep track of
// scenes we active.
const currentGroupStates = {};

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

router.post('/groups/:groupId/scenes/:sceneId/toggle', function(req, res, next) {
	const groupId = req.params.groupId;
	const sceneId = req.params.sceneId;
	
	// make a "callback" possible which means that the status is pushed here back to the dashboard
	const widgetIdsToPush = req.body.widgetIds || [];
	
	// restore a scene if restoreScene is set
	const restoreScene = req.body.restoreScene || '';
	
	// add a transition time if set
	const transitionTime = parseInt(req.body.transitionTime) || -1;
	
	if (groupId === null
			|| groupId === undefined
			|| groupId === '') {
		console.error('[Hue]:\trouter.post(\'/groups/:groupId/scenes/:sceneId/toggle\', function(req, res, next) - Error: group id is not set correctly.' + groupId);
		res.status(400).send({error: 'Param group id is not set correctly.'});
	} else if (sceneId === null
			|| sceneId === undefined
			|| sceneId === '') {
		console.error('[Hue]:\trouter.post(\'/groups/:groupId/scenes/:sceneId/toggle\', function(req, res, next) - Error: scene id is not set correctly.' + sceneId);
		res.status(400).send({error: 'Param scene id is not set correctly.'});
	} else {
		
		// get current state of group
		const groupRequestPath = 'groups/' + groupId
		doHueGetRequest(groupRequestPath)
		.then((result) => {
			const data = result.data;
			
			// try to find the group state from the cached group state
			if (currentGroupStates[groupId] === undefined) {
				console.log('[Hue]:\trouter.post(\'/groups/:groupId/scenes/:sceneId/toggle\', function(req, res, next) - Group ' + groupId + ' is new.');
				
				// group state was not found -> create it and set initial state
				const currentStateAllOn = data.state.all_on;
				currentGroupStates[groupId] = {
					sceneActive: currentStateAllOn,
					lastSceneId: ''
				};
			}
			
			// current state
			let groupState = currentGroupStates[groupId];
			
			const action = {};
			if (groupState.sceneActive) { // turn scene off
				// should we restore a scene or just turn off?
				if (restoreScene !== '') {
					action.scene = restoreScene;
				} else {
					action.on = false;
				}
				
				// update group state cache
				groupState.lastSceneId = restoreScene;
			} else {				// turn scene on
				action.scene = sceneId;
				// update group state cache
				groupState.lastSceneId = sceneId;
			}
			
			groupState.sceneActive = !groupState.sceneActive;
			
			if (transitionTime > 0) {
				action.transitiontime = transitionTime;
			}
			
			// perform request
			performGroupStateAction(action, groupId)
			.then((result) => {
				currentGroupStates[groupId] = groupState;
				// push new status to dashboard
				const newStatusText = groupState.sceneActive ? 'OFF' : 'ON';
				for (var i = 0; i < widgetIdsToPush.length; i++) {
					console.log('[Hue]:\trouter.post(\'/groups/:groupId/scenes/:sceneId/toggle\', function(req, res, next) - Pushing new hue state (' + newStatusText + ') to widget id : ' + widgetIdsToPush[i]);
					misc.pushDataToDashboardWidget('Hue', widgetIdsToPush[i], newStatusText, 'Text');
				}
				
				const response = {
					new_group_state: groupState,
					new_state_response: result
				}
				res.send(response);
			})
			.catch((err) => {
				console.error('[Hue]:\trouter.post(\'/groups/:groupId/scenes/:sceneId/toggle\', function(req, res, next) - Error while sending the group change request: ' + err);
				res.status(500).send(err);
			});
		})
		.catch((err) => {
			console.error('[Hue]:\trouter.post(\'/groups/:groupId/scenes/:sceneId/toggle\', function(req, res, next) - Error while trying to get the currents group state: ' + err);
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

function performGroupStateAction(newGroupState, group) {
	return new Promise(function (resolve, reject) {
		const path = 'groups/' + group + '/action';
		doHuePutRequest(path, newGroupState)
		.then((result) => {
			console.log('[Hue]:\tperformGroupStateAction(' + newGroupState + ', ' + group + ') - Performed request to hue API');
			resolve(result.data);
		})
		.catch((err) => {
			console.error('[Hue]:\tperformGroupStateAction(' + newGroupState + ', ' + group + ') - Could not complete hue action change request: ' + err);
			reject(err);
		});
	})
}

function doHuePutRequest(path, body) {
	const options = {
		uri: 'http://' + hueConfig.hueIp + ':80/api/' + hueConfig.hueUser + '/' + path,
		method: 'PUT',
		json: body
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
