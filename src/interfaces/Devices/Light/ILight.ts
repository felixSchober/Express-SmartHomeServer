import {ISwitchStateChangeCommand} from '../../ISwitchStateChangeCommand';

export interface ILight {
	id: string;
	uniqueId: string;
	stateOn: boolean;
	bri: number;
	name: string;
	type: string;
	power: number;

	changeState(newState: boolean): Promise<boolean>;
	update(): Promise<ILight>;
}