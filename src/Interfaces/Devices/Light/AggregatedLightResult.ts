import {ILight} from './ILight';

export class AggregatedLightResult {
	totalCount: number;
	onCount: number;
	offCount: number;
	lights: ILight[];
	lightsOn: ILight[];
	lightsOff: ILight[];
	lastRefreshed: Date;


	constructor(totalCount?: number, onCount?: number, offCount?: number, lights?: ILight[], lightsOn?: ILight[], lightsOff?: ILight[], lastRefreshed?: Date) {
		this.totalCount = totalCount || 0;
		this.onCount = onCount || 0;
		this.offCount = offCount || 0;
		this.lights = lights || [];
		this.lightsOn = lightsOn || [];
		this.lightsOff = lightsOff || [];
		this.lastRefreshed = lastRefreshed || new Date();
	}
}