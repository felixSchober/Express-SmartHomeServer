import {Moment} from 'moment';

export interface IPowerState {
	powerStates: number[];
	powerHistories: { [id: string]: number[]};
	powerHistoryKeys: string[];
	timestamps: Moment[];

	timeStep(): void;
	updateValue(deviceName: string, value: number): void;
}