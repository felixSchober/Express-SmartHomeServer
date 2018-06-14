const misc = require('../../misc');
const hueConfig = require('../../config/hue');
const moment = require('moment');
const pollLightStateEveryXSeconds = 10;

// scene cache
// there is no way to get the active scene from the hue api. So to be able to toggle scenes we have keep track of
// scenes we active.
const currentGroupStates = {};

const lightStateCache = {
	lastRefreshed: new Date(0),
	lightsCount: -1,
	lightsOnCount:-1,
	lightsOffCount: -1,
	lights: [],
	lightsOn: [],
	lightsOff: []
};

let lightNameIdMapping = {

};

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
			
				resolve(temperature);
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
			
			lightNameIdMapping = {};
			
			const keys = Object.keys(data);
			const lights = [];
			const lights_on = [];
			const lights_off = [];
			
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				
				lightNameIdMapping[data[key].name] = key;
				const light = {
					id: key,
					stateOn: data[key].state.on,
					bri: data[key].state.bri,
					name: data[key].name,
					type: data[key].type,
					uniqueId: data[key].uniqueid
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
			
			refreshCache(lightsResult);
			
			resolve(lightsResult);
			
		})
		.catch((err) => {
			console.error('[Hue]:\tgetLights() - Error: ' + err);
			reject(err);
		});
	});
}

function refreshCache(newData) {
	lightStateCache.lastRefreshed = moment();
	lightStateCache.lights = newData.lights;
	lightStateCache.lightsOff = newData.lightsOff;
	lightStateCache.lightsOn = newData.lightsOn;
	lightStateCache.lightsCount = newData.lightsCount;
	lightStateCache.lightsOnCount = newData.lightsOnCount;
	lightStateCache.lightsOffCount = newData.lightsOffCount;
}

const getSingleLight = function (lightName) {
	return new Promise((resolve, reject) => {
		const lightId = lightNameIdMapping[lightName];
		if (!lightId) {
			reject('Could not find light id for name ' + lightName);
			return;
		}
		const path = 'lights/' + lightId
		doHueGetRequest(path)
		.then((result) => {
			const light = {
				id: lightId,
				stateOn: result.data.state.on,
				bri: result.data.state.bri,
				name: result.data.name,
				type: result.data.type,
				uniqueId:result.data.uniqueid
			};
			resolve(light);
		})
		.catch((err) => {
			console.error('[Hue]:\tgetSingleLight(' + lightName + ') - Could not complete request Error: ' + err);
			reject(err);
		});
	});
}

const getCachedLightStateIfPossible = function () {
	const now = moment();
	const timeDiff = now.diff(lightStateCache.lastRefreshed, 'seconds');
	return new Promise((resolve, reject) => {
		if (timeDiff > 15) {
			// we need to get the lights from the bridge because the cache is too old
			getLights()
			.then((result) => resolve(result))
			.catch((err) => reject(err));
		} else {
			resolve(lightStateCache);
		}
	})
	
}

const setLightState = function (lightName, state) {
	return new Promise((resolve, reject) => {
		const lightId = lightNameIdMapping[lightName];
		if (!lightId) {
			reject('Could not find light id for name ' + lightName);
			return;
		}
		
		const path = 'lights/' + lightId + '/state';
		const reqBody = {
			on: state,
			//bri: 254
		}
		doHuePutRequest(path, reqBody)
		.then((result) => {
			console.log('[Hue]:\tsetLightState(' + lightId + ', ' + state + ') - Performed request to hue API');
			resolve(state);
		})
		.catch((err) => {
			console.error('[Hue]:\tsetLightState(' + lightId + ', ' + state + ') - Could not complete hue action change request: ' + err);
			reject(err);
		});
	});
}

const toggleLightState = function (lightName) {
	// get current state
	return new Promise((resolve, reject) => {
		getSingleLight(lightName).then((light) => {
			console.log('[Hue] Toggle Light {0}. Is On: {1}'.format(lightName, light.stateOn));
			setLightState(lightName, !light.stateOn).then((result) => resolve(result)).catch((err) => reject(err));
		}).catch((err) => reject(err));
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
					resolve(groupState);
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
	return misc.performRequest(options, '[HUE]', false, true);
}

function doHueGetRequest(path) {
	const options = {
		uri: 'http://' + hueConfig.hueIp + ':80/api/' + hueConfig.hueUser + '/' + path,
		method: 'GET'
	}
	return misc.performRequest(options, '[HUE]', false, true);
}

module.exports.currentGroupStates = currentGroupStates;
module.exports.performGroupStateAction = performGroupStateAction;
module.exports.getLights = getLights;
module.exports.getSensors = getSensors;
module.exports.getSensorTemperature = getSensorTemperature;
module.exports.toggleScene = toggleScene;
module.exports.pollLightStateEveryXSeconds = pollLightStateEveryXSeconds;
module.exports.getCachedLightStateIfPossible = getCachedLightStateIfPossible;
module.exports.setLightState = setLightState;
module.exports.toggleLightState = toggleLightState;