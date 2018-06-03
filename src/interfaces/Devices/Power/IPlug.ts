import {Double} from 'bson';

export interface IPlug {
	name: string;
	currentPowerState: number;
	ip: string;
	powerHistory: number[];

	getLivePowerForPlug(): Promise<Double>;
	getCachedPowerForPlug(): Double;
	getRawPlugState(): Promise<any>;
	isPlugRelayOn(): Promise<boolean>;

	updatePlugState(stateOn: boolean): Promise<boolean>;
	togglePlugState(): Promise<boolean>;
	registerPlugPowerEvent(callbackOn: ()=>void, callbackOff: ()=>void);
}