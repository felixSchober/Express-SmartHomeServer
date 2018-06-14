import {IDeviceController} from '../../IDeviceController';
import {ITuple} from '../../ITuple';
import {IPlug} from './IPlug';
import {IPowerLight} from './IPowerLight';
import {IPowerState} from './IPowerState';

export interface IPowerControllerService extends IDeviceController {
	energyHistoryEntriesPerHour: number;
	devices: string[];
	plugs: IPlug[];
	deviceIpMapping: { [id: string] : string };
	lightsThatCountTowardsTotalPower: string[];

	updatePowerState(): Promise<IPowerState>;
	getPowerForLights(): Promise<IPowerLight[]>;
	getAggregatedPowerLevelForLightsThatContributeToTotalPower(): Promise<number>;
	getAggregatedPowerLevelForLights(): Promise<ITuple<string, number>>;

	getLivePowerForPlug(plugName: string): Promise<ITuple<string, number>>;
	getCachedPowerForPlug(plugName: string): number;
	getRawPlugState(plugName: string): Promise<any>;
	isPlugRelayOn(plugName: string): Promise<boolean>;

	updatePlugState(plugName: string, stateOn: boolean): Promise<boolean>;
	togglePlugState(plugName: string): Promise<boolean>;
	registerPlugPowerEvent(plugName: string, callbackOn: ()=>void, callbackOff: ()=>void): void;

}