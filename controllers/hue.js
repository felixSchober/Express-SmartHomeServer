const express = require('express');
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const hueConfig = require('./../config/hue');

const pollLightStateEveryXSeconds = 10;

// scene cache
// there is no way to get the active scene from the hue api. So to be able to toggle scenes we have keep track of
// scenes we active.
const currentGroupStates = {};

const performGroupStateAction = function (newGroupState, group) {
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
	});
}

const getSensors = function () {
	return new Promise((resolve, reject) => {
		doHueGetRequest('sensors')
		.then((result) => {
			resolve(result.data);
		})
		.catch((err) => {
			console.error('[Hue]:\trouter.get(\'/sensors\', function(req, res, next) - Error: ' + err);
			reject(err);
		});
	});
}

const getSensorTemperature = function (motionSensorName) {
	return new Promise((resolve, reject) => {
		if (!motionSensorName
				|| !hueConfig.hueMotionSensorNameIdMapping[motionSensorName]
				|| !hueConfig.hueMotionSensorNameIdMapping[motionSensorName]) {
			console.error('[Hue]:\tgetSensorTemperature(' + motionSensorName + ') - Error: motionSensorName is not set correctly.' + motionSensorName);
			reject({error: 'Param motionSensorName is not set correctly.'});
		} else {
			const sensorId = hueConfig.hueMotionSensorNameIdMapping[motionSensorName];
			const path = 'sensors/' + sensorId
			
			doHueGetRequest(path)
			.then((result) => {
				const data = result.data;
				const temperature = data.state.temperature / 100;
				const response = {temperature: temperature, lastUpdated: data.state.lastupdated};
				
				resolve(response);
			})
			.catch((err) => {
				console.error('[Hue]:\tgetSensorTemperature(' + motionSensorName + ') - Error: ' + err);
				reject(err);
			});
		}
	});
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

const toggleScene = function (groupId, sceneId, restoreScene, transitionTime) {
	const functionNameFormatString = 'function ({0}, {1}, {2}, {3})'.format(groupId, sceneId, restoreScene, transitionTime);
	
	return new Promise((resolve, reject) => {
		if (!groupId) {
			console.error('[Hue]:\t ' + functionNameFormatString + ' - Error: group id is not set correctly.' + groupId);
			reject({status: 400, error: 'Param group id is not set correctly.'});
		} else if (!sceneId) {
			console.error('[Hue]:\t ' + functionNameFormatString + ' - Error: scene id is not set correctly.' + sceneId);
			reject({status: 400, error: 'Param scene id is not set correctly.'});
		} else {
			
			// get current state of group
			const groupRequestPath = 'groups/' + groupId
			doHueGetRequest(groupRequestPath)
			.then((result) => {
				const data = result.data;
				
				// try to find the group state from the cached group state
				if (!currentGroupStates[groupId]) {
					console.log('[Hue]:\t ' + functionNameFormatString + ' - Group ' + groupId + ' is new.');
					
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
					
					const response = {
						new_group_state: groupState,
						new_state_response: result
					}
					resolve(response);
				})
				.catch((err) => {
					console.error('[Hue]:\t ' + functionNameFormatString + ' - Error while sending the group change request: ' + err);
					reject({status: 500, error: err});
				});
			})
			.catch((err) => {
				console.error('[Hue]:\t ' + functionNameFormatString + ' - Error while trying to get the currents group state: ' + err);
				reject({status: 400, error: err});
			});
		}
	});
}

function doHuePutRequest(path, body) {
	const options = {
		uri: 'http://' + hueConfig.hueIp + ':80/api/' + hueConfig.hueUser + '/' + path,
		method: 'PUT',
		json: body
	}
	return misc.performRequest(options, '[HUE]', true, true);
}

function doHueGetRequest(path) {
	const options = {
		uri: 'http://' + hueConfig.hueIp + ':80/api/' + hueConfig.hueUser + '/' + path,
		method: 'GET'
	}
	return misc.performRequest(options, '[HUE]', true, true);
}

module.exports.currentGroupStates = currentGroupStates;
module.exports.performGroupStateAction = performGroupStateAction;
module.exports.getLights = getLights;
module.exports.getSensors = getSensors;
module.exports.getSensorTemperature = getSensorTemperature;
module.exports.toggleScene = toggleScene;
module.exports.pollLightStateEveryXSeconds = pollLightStateEveryXSeconds;