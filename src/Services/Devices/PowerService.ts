import {AggregatedLightResult} from '../../Interfaces/Devices/Light/AggregatedLightResult';
import {ILightControllerService} from '../../Interfaces/Devices/Light/ILightControllerService';
import {IPlug} from '../../Interfaces/Devices/Power/IPlug';
import {IPowerControllerService} from '../../Interfaces/Devices/Power/IPowerControllerService';
import {IPowerLight} from '../../Interfaces/Devices/Power/IPowerLight';
import {ITuple} from '../../Interfaces/ITuple';
import {PowerHS110Plug} from './PowerHS110Plug';
import {hueConfig} from '../../config/hue';
import {GraphStates} from './GraphStates';

const { Client } = require('tplink-smarthome-api');


export class PowerService implements IPowerControllerService {

	private hueController: ILightControllerService;
	private readonly plugController: any;
	private powerHistory: GraphStates;

	public deviceIpMapping: { [p: string]: string };
	public devices: string[];
	public energyHistoryEntriesPerHour: number;
	public lightsThatCountTowardsTotalPower: string[];
	public plugs: IPlug[];

	public constructor(hueController: ILightControllerService, pollingInterval: number) {
		this.hueController = hueController;
		this.plugController = new Client();

		this.deviceIpMapping =  {
			'Espresso': '192.168.178.62',
			'Media': '192.168.178.66',
			'Kitchen': '192.168.178.65',
			'Computer': '192.168.178.64',
			'Kochplatte': '192.168.178.72'};

		this.energyHistoryEntriesPerHour = 60 * 60 / pollingInterval;
		this.devices = ['Espresso', 'Media', 'Kitchen', 'Computer', 'Kochplatte'];
		this.lightsThatCountTowardsTotalPower =  [
			'00:17:88:01:10:5c:37:d0-0b', // Eingang
			'00:17:88:01:10:5c:3c:f5-0b', // Kueche
			'00:17:88:01:10:51:b7:f6-0b', // Stehlampe Oben
			'00:17:88:01:10:31:10:71-0b', // Stehlampe Farbe
			'00:17:88:01:10:50:15:9d-0b', // Stehlampe Unten
			'00:17:88:01:00:cb:7d:95-0b', // Fenster
			'00:17:88:01:02:7b:29:94-0b', // Decke
			'7c:b0:3e:aa:00:a3:ca:f5-03', // Schrank
			'84:18:26:00:00:0c:6f:43-03', // Arbeitsplatte
			'84:18:26:00:00:0b:3d:9d-03', // Schreibtisch
			'00:17:88:01:03:ae:ca:89-0b', // Küche Spot links
			'00:17:88:01:03:ae:bb:19-0b', // Küche Spot rechts
			'00:17:88:01:03:e1:65:b8-0b'  // Bad leiste
		];

		// create plug array
		this.plugs = [];
		for (const name of this.devices) {
			const ip = this.deviceIpMapping[name];
			this.plugs.push(new PowerHS110Plug(ip, name, this.plugController));
		}

		// create the power history
		this.powerHistory = new GraphStates(['Espresso', 'Media', 'Kitchen', 'Computer', 'Lights', 'Kochplatte'], pollingInterval);

	}

	public getCachedPowerForPlug(plugName: string): number {
		const plugIndex = this.devices.indexOf(plugName);
		return this.plugs[plugIndex].getCachedPowerForPlug();
	}

	public getLivePowerForPlug(plugName: string): Promise<ITuple<string, number>> {
		const plugIndex = this.devices.indexOf(plugName);
		return this.plugs[plugIndex].getLivePowerForPlug();
	}

	public getPowerForLights(): Promise<IPowerLight[]> {
		return new Promise((resolve, reject) => {
			// get 'on' lights
			this.hueController.getLights()
				.then((result: AggregatedLightResult) => {
					const lightsOn = result.lightsOn;

					if (lightsOn === undefined || lightsOn.length < 1) {
						resolve([]);
					} else {
						// create power mapping
						const lightPowerLevels = lightsOn.map((light: IPowerLight) => {
							// search for light type first
							let powerLevel = hueConfig.lightTypePowerMapping[light.type];

							if (powerLevel > -1) light.power = powerLevel;
							else {
								// get individual power level per device id
								light.power = hueConfig.lightIdPowerMapping[light.uniqueId];
							}

							// -1 is the initial state the constructor initializes
							if (light.power === -1) {
								const err = {
									message: 'power for light is undefined',
									light: light
								};
								console.error('[POWER]:\tgetPowerForLights() - Could not get power level for light ' + light.name);
								reject(err);
								return light;
							}

							// scale power output linearly according to brightness level
							// plug units are not scalable
							if (hueConfig.lightsPowerLevelNotScalable.indexOf(light.type) === -1) {
								light.power *= light.bri / hueConfig.maxBrightnessLevel;
							}

							return light as IPowerLight;
						});
						resolve(lightPowerLevels);
					}
				})
				.catch(function (err: any) {
					console.error(`[POWER]:\\tgetPowerForLights() - Could not get lights from hue module ${err.light}. Error: ` + err.message);
					reject(`Could not get lights from hue module ${err.light}. Error: ` + err.message);
				});
		});
	}

	public getAggregatedPowerLevelForLightsThatContributeToTotalPower(): Promise<number> {
		return new Promise((resolve, reject) => {
			this.getPowerForLights()
				.then((lights: IPowerLight[]) => {
					// get lights that contribute to the total power level that are not already counted by the plugs
					let totalPower = 0.0;
					for (let i = 0; i < lights.length; i++) {
						if (this.lightsThatCountTowardsTotalPower.indexOf(lights[i].id) !== -1) {
							totalPower += lights[i].power;
						}
					}
					resolve(totalPower);
				})
				.catch(function (err: any) {
					console.error('[POWER]:\tgetAggregatedPowerLevelForLightsThatContributeToTotalPower() - Could not get power levels for lights. Error: ' + err);
					reject(err);
				});
		});
	}

	public getAggregatedPowerLevelForLights(): Promise<ITuple<string, number>> {
		return new Promise((resolve, reject) => {
			this.getPowerForLights()
				.then((lights: ReadonlyArray<IPowerLight>) => {
					// get lights that contribute to the total power level that are not already counted by the plugs
					let totalPower = 0.0;
					for (let i = 0; i < lights.length; i++) {
						totalPower += lights[i].power;
					}
					const t: ITuple<string, number> = {obj1: 'Lights', obj2: totalPower};
					resolve(t);
				})
				.catch(function (err: any) {
					console.error('[POWER]:\tgetAggregatedPowerLevelForLights() - Could not get power levels for lights. Error: ' + err);
					reject(err);
				});
		});
	}

	public getRawPlugState(plugName: string): Promise<any> {
		const plugIndex = this.devices.indexOf(plugName);
		return this.plugs[plugIndex].getRawPlugState();
	}

	public isPlugRelayOn(plugName: string): Promise<boolean> {
		const plugIndex = this.devices.indexOf(plugName);
		return this.plugs[plugIndex].isPlugRelayOn();
	}

	public registerPlugPowerEvent(plugName: string, callbackOn: () => void, callbackOff: () => void): void {
		const plugIndex = this.devices.indexOf(plugName);
		this.plugs[plugIndex].registerPlugPowerEvent(callbackOn, callbackOff);
	}

	public togglePlugState(plugName: string): Promise<boolean> {
		const plugIndex = this.devices.indexOf(plugName);
		return this.plugs[plugIndex].togglePlugState();
	}

	public updatePlugState(plugName: string, stateOn: boolean): Promise<boolean> {
		const plugIndex = this.devices.indexOf(plugName);
		return this.plugs[plugIndex].updatePlugState(stateOn);
	}

	public updatePowerState(): Promise<GraphStates> {
		const promises: Promise<ITuple<string, number>>[] = [];

		for (const deviceName of this.devices) {
			promises.push(this.getLivePowerForPlug(deviceName)); // Promise<ITuple<string, number>>
		}

		// also push lights promise
		promises.push(this.getAggregatedPowerLevelForLights()); // Promise<ITuple<string, number>>

		return new Promise((resolve, reject) => {
			Promise.all(promises)
				.then((results: ITuple<string, number>[]) => {

					for (const currentPowerElement of results) {

						const elementName = currentPowerElement.obj1;
						const powerValue = currentPowerElement.obj2;

						this.powerHistory.updateValue(elementName, powerValue);

					}

					this.powerHistory.timeStep();

					console.log('[POWER]:\tPower State update complete');
					resolve(this.powerHistory);
				})
				.catch(function (err) {
					console.error('[POWER]:\tupdatePowerStateAndSaveToDb() - For at least one plug there was an error while getting the data. Error: ' + err);
					reject('[POWER]:\tupdatePowerStateAndSaveToDb() - For at least one plug there was an error while getting the data. Error: ' + err);
				});
		});
	}


}