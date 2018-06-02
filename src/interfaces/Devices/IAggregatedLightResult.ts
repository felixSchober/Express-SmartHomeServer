import {ILight} from './ILight';

export interface IAggregatedLightResult {
	totalCount: number;
	onCount: number;
	offCount: number;
	lights: ILight[];
	lightsOn: ILight[];
	lightsOff: ILight[];
}