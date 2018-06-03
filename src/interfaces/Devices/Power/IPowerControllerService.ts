import {Double} from 'bson';
import {IDeviceController} from '../../IDeviceController';
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
	getAggregatedPowerLevelForLightsThatContributeToTotalPower(): Promise<Double>;
	getAggregatedPowerLevelForLights: Promise<Double>;

	getLivePowerForPlug(plugName: string): Promise<Double>;
	getCachedPowerForPlug(plugName: string): Double;
	getRawPlugState(plugName: string): Promise<any>;
	isPlugRelayOn(plugName: string): Promise<boolean>;

	updatePlugState(plugName: string, stateOn: boolean): Promise<boolean>;
	togglePlugState(plugName: string): Promise<boolean>;
	registerPlugPowerEvent(plugName: string, callbackOn: ()=>void, callbackOff: ()=>void);

}