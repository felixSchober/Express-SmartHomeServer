import {ITuple} from '../../ITuple';

export interface IPlug {
	name: string;
	currentPowerState: number;
	ip: string;
	powerHistory: number[];
	isOn: boolean;

	getLivePowerForPlug(): Promise<ITuple<string, number>>;
	getCachedPowerForPlug(): number;
	getRawPlugState(): Promise<any>;
	isPlugRelayOn(): Promise<boolean>;

	updatePlugState(stateOn: boolean): Promise<boolean>;
	togglePlugState(): Promise<boolean>;
	registerPlugPowerEvent(callbackOn: ()=>void, callbackOff: ()=>void): void;
}