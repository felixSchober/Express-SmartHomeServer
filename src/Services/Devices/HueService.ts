import {Options} from 'request';
import {Helpers} from '../../Helpers';
import {AggregatedLightResult} from '../../Interfaces/Devices/Light/AggregatedLightResult';
import {ILight} from '../../Interfaces/Devices/Light/ILight';
import {ILightControllerService} from '../../Interfaces/Devices/Light/ILightControllerService';
import {ILightGroupState} from '../../Interfaces/Devices/Light/ILightGroupState';
import {hueConfig} from '../../config/hue';
import {ILightSceneState} from '../../Interfaces/Devices/Light/ILightSceneState';
import {IRequestResponse} from '../../Interfaces/IRequestResponse';
import {HueLight} from './HueLight';
import * as moment from 'moment';
import {ITuple} from "../../Interfaces/ITuple";
import {GraphStates} from "./GraphStates";


export class HueService implements ILightControllerService {

	static doHuePutRequest(path: string, body: any): Promise<IRequestResponse> {
		const options: Options = {
			uri: 'http://' + hueConfig.hueIp + ':80/api/' + hueConfig.hueUser + '/' + path,
			method: 'PUT',
			json: body
		};
		return Helpers.performRequest(options, '[HUE]', false, false);
	}

	static doHueGetRequest(path: string): Promise<IRequestResponse> {
		const options: Options = {
			uri: 'http://' + hueConfig.hueIp + ':80/api/' + hueConfig.hueUser + '/' + path,
			method: 'GET'
		};
		return Helpers.performRequest(options, '[HUE]', false, true);
	}

	// scene cache
	// there is no way to get the active scene from the hue api. So to be able to toggle scenes we have keep track of
	// scenes we active.
	public currentGroupStates: { [p: string]: ILightSceneState } = {};
	private lightStateCache: AggregatedLightResult;
	private lightNameMapping: {[name: string]: ILight} = {};
	private temperatureStates: GraphStates;

	constructor(temperatureSensorPollingIntervalInSeconds: number, keepTemperatureEntriesForLastXHours: number) {
		this.lightStateCache = new AggregatedLightResult();

		const numberOfEntriesToKeep = Math.round((
			(60 / temperatureSensorPollingIntervalInSeconds)  // number of entries per minute
				* 60) 										  // number of entries per hour
					* keepTemperatureEntriesForLastXHours);	  // total number of entries

		console.log(`[HUE] Keep ${numberOfEntriesToKeep} entries to fill the last ${keepTemperatureEntriesForLastXHours} hours`);

		this.temperatureStates = new GraphStates(
			hueConfig.hueMotionSensorNames,
			temperatureSensorPollingIntervalInSeconds,
			numberOfEntriesToKeep);
	}

	public getCachedLightStateIfPossible(): Promise<AggregatedLightResult> {
		const now = moment();
		const timeDiff = now.diff(this.lightStateCache.lastRefreshed, 'seconds');
		return new Promise((resolve, reject) => {
			if (timeDiff > 15) {
				// we need to get the lights from the bridge because the cache is too old
				this.getLights()
					.then((result) => resolve(result))
					.catch((err) => reject(err));
			} else {
				resolve(this.lightStateCache);
			}
		})
	}

	public getLights(): Promise<AggregatedLightResult> {
		return new Promise((resolve, reject) => {
			// get the lights from the HUE rest api
			HueService.doHueGetRequest('lights').then((result: IRequestResponse) => {
					const data = result.data;

					const keys = Object.keys(data);
					const lights = [];
					const lights_on = [];
					const lights_off = [];

					for (let i = 0; i < keys.length; i++) {
						const key = keys[i];

						const light = new HueLight(data[key].state.bri, key, data[key].name, data[key].state.on, data[key].type, data[key].uniqueid);

						if (light.stateOn) lights_on.push(light);
						else lights_off.push(light);
						lights.push(light);
						this.lightNameMapping[light.name] = light;
					}

					const lightsResult: AggregatedLightResult = {
						totalCount: lights.length,
						onCount: lights_on.length,
						offCount: lights_off.length,
						lights: lights,
						lightsOn: lights_on,
						lightsOff: lights_off,
						lastRefreshed: new Date()
					};

					this.refreshCache(lightsResult);

					resolve(lightsResult);

				})
				.catch((err: any) => {
					console.error('[Hue]:\tgetLights() - Error: ' + err);
					reject(err);
				});
		});
	}

	public getSensorTemperature(sensorName: string): Promise<ITuple<string, number>> {
		return new Promise((resolve, reject) => {
			if (!sensorName
				|| !hueConfig.hueMotionSensorNameIdMapping[sensorName]
				|| !hueConfig.hueMotionSensorNameIdMapping[sensorName]) {
				console.error('[Hue]:\tgetSensorTemperature(' + sensorName + ') - Error: motionSensorName is not set correctly.' + sensorName);
				reject({error: 'Param motionSensorName is not set correctly.'});
			} else {
				const sensorId = hueConfig.hueMotionSensorNameIdMapping[sensorName];
				const path = 'sensors/' + sensorId;

				HueService.doHueGetRequest(path)
					.then((result: IRequestResponse) => {
						const data = result.data;
						const temperature = data.state.temperature / 100;

						resolve({obj1: sensorName, obj2: temperature});
					})
					.catch((err) => {
						console.error('[Hue]:\tgetSensorTemperature(' + sensorName + ') - Error: ' + err);
						reject(err);
					});
			}
		});
	}

	public getSensors(): Promise<any> {
		return new Promise((resolve, reject) => {
			HueService.doHueGetRequest('sensors')
				.then((result: IRequestResponse) => {
					resolve(result.data);
				})
				.catch((err) => {
					console.error('[Hue]:\trouter.get(\'/sensors\', function(req, res, next) - Error: ' + err);
					reject(err);
				});
		});
	}

	public getSingleLight(lightName: string): Promise<ILight> {
		if (!this.lightNameMapping[lightName]) throw Error('Could not find light with name ' + lightName);

		return this.lightNameMapping[lightName].update();
	}

	public performGroupStateAction(newGroupState: ILightGroupState, groupId: string): Promise<any> {
		return new Promise((resolve, reject) => {
			const path = 'groups/' + groupId + '/action';
			HueService.doHuePutRequest(path, newGroupState)
				.then((result: IRequestResponse) => {
					console.log('[Hue]:\tperformGroupStateAction(' + newGroupState + ', ' + groupId + ') - Performed request to hue API');
					resolve(result.data);
				})
				.catch((err) => {
					console.error('[Hue]:\tperformGroupStateAction(' + newGroupState + ', ' + groupId + ') - Could not complete hue action change request: ' + err);
					reject(err);
				});
		});
	}

	public setLightState(lightName: string, state: boolean): Promise<boolean> {
		if (!this.lightNameMapping[lightName]) throw Error('Could not find light with name ' + lightName);
		return this.lightNameMapping[lightName].changeState(state);
	}

	public toggleLightState(lightName: string): Promise<boolean> {

		return new Promise((resolve, reject) => {
			this.getSingleLight(lightName).then((light) => {
				console.log(`[Hue] Toggle Light ${lightName}. Is On: ${light.stateOn}`);
				light.changeState(!light.stateOn).then((result) => resolve(result)).catch((err) => reject(err));
			}).catch((err) => reject(err));
		});
	}

	public toggleScene(groupId: string, sceneId: string, restoreSceneId: string, transitionTime: number): Promise<ILightSceneState> {
		const functionNameFormatString = `function (${groupId}, ${sceneId}, ${restoreSceneId}, ${transitionTime})`;

		return new Promise((resolve, reject) => {
			if (!groupId) {
				console.error('[Hue]:\t ' + functionNameFormatString + ' - Error: group id is not set correctly.' + groupId);
				reject({status: 400, error: 'Param group id is not set correctly.'});
			} else if (!sceneId) {
				console.error('[Hue]:\t ' + functionNameFormatString + ' - Error: scene id is not set correctly.' + sceneId);
				reject({status: 400, error: 'Param scene id is not set correctly.'});
			} else {

				// get current state of group
				const groupRequestPath = 'groups/' + groupId;
				HueService.doHueGetRequest(groupRequestPath)
					.then((result: IRequestResponse) => {
						const data = result.data;

						// try to find the group state from the cached group state
						if (!this.currentGroupStates[groupId]) {
							console.log(`[Hue]:\t${functionNameFormatString} - Group ${groupId} is new.`);

							// group state was not found -> create it and set initial state
							const currentStateAllOn = data.state.all_on;
							this.currentGroupStates[groupId] = {
								sceneActive: currentStateAllOn,
								lastSceneId: ''
							};
						}

						// current state
						let groupState = this.currentGroupStates[groupId];

						const action: ILightGroupState = {scene: '', on: false, transitiontime: 0};
						if (groupState.sceneActive) { // turn scene off
							// should we restore a scene or just turn off?
							if (restoreSceneId) {
								action.scene = restoreSceneId;
							} else {
								action.on = false;
							}

							// update group state cache
							groupState.lastSceneId = restoreSceneId;
						} else {
							// turn scene on
							action.on = true;
							action.scene = sceneId;
							// update group state cache
							groupState.lastSceneId = sceneId;
						}

						groupState.sceneActive = !groupState.sceneActive;

						if (transitionTime > 0) {
							action.transitiontime = transitionTime;
						}

						// perform request
						this.performGroupStateAction(action, groupId)
							.then(() => {
								this.currentGroupStates[groupId] = groupState;
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

	private refreshCache(newData: AggregatedLightResult) {
		this.lightStateCache = newData;
		this.lightStateCache.lastRefreshed = new Date();
	}

	updateSensorTemperatures(): Promise<GraphStates> {
		const sensorNames = hueConfig.hueMotionSensorNames;
		const promises: Promise<ITuple<string, number>>[] = [];
		for (const sensorName of sensorNames) {
			promises.push(this.getSensorTemperature(sensorName));
		}

		return new Promise<GraphStates>((resolve, reject) => {
			Promise.all(promises)
				.then((results: ITuple<string, number>[]) => {
					for (const temperatureTuple of results) {
						this.temperatureStates.updateValue(temperatureTuple.obj1, temperatureTuple.obj2);
					}
					this.temperatureStates.timeStep();
					resolve(this.temperatureStates);
				})
				.catch(function (err) {
					console.error('[HUE]:\tupdateSensorTemperatures() - For at least one temperature sensor request there was an error while getting the data. Error: ' + err);
					reject('[HUE]:\tupdateSensorTemperatures() - For at least one temperature sensor request there was an error while getting the data. Error: ' + err);
				});
		});
	}

}