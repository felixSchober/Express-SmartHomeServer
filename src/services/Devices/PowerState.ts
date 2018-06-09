import {IPowerState} from '../../interfaces/Devices/Power/IPowerState';
import {Moment} from 'moment';
import * as moment from 'moment';


export class PowerState implements IPowerState {
	public powerHistories: { [p: string]: number[] };
	public powerHistoryKeys: string[];
	public powerStates: number[];
	public timestamps: Moment[];

	private readonly energyHistoryUpdateEveryXSeconds: number;
	private readonly energyHistoryEntriesPerHour: number;

	constructor(powerHistoryKeys: string[], energyHistoryUpdateEveryXSeconds: number) {
		this.powerHistoryKeys = powerHistoryKeys;

		this.energyHistoryUpdateEveryXSeconds = energyHistoryUpdateEveryXSeconds;
		this.energyHistoryEntriesPerHour =  60 * 60 / energyHistoryUpdateEveryXSeconds;

		this.timestamps = this.generateInitialTimestamps();

		// create something like this: [0, 0, 0, 0, 0]
		this.powerStates = PowerState.generateArrayWithNTimesX(this.powerHistoryKeys.length, 0);

		for(const name of this.powerHistoryKeys){
			this.powerHistories[name] = PowerState.generateArrayWithNTimesX(this.energyHistoryEntriesPerHour, 0);
		}
	}

	private generateInitialTimestamps(): Moment[] {
		const result: Moment[] = [];

		// generate the oldest entry first
		for(let i = this.energyHistoryEntriesPerHour; i > 0; i--) {
			const secondsToSubtract = (i) * this.energyHistoryUpdateEveryXSeconds;
			const ts = moment().subtract(secondsToSubtract, 'seconds');
			result.push(ts);
		}
		return result;
	}

	private static generateArrayWithNTimesX(n: number, value: number): number[] {
		return Array
			.apply(null, Array(n))
			.map(Number.prototype.valueOf, value);
	}

	/// Do a time step by pushing a new value to the array and removing one from the front
	public timeStep(): void {
		this.timestamps.push(moment());
		this.timestamps.shift();
	}

	// update one value for a device
	public updateValue(deviceName: string, value: number): void {
		// get index of device
		const i = this.powerHistoryKeys.indexOf(deviceName);

		if (i === -1) throw Error('Could not find device with name ' + deviceName);

		this.powerStates[i] = value;
		this.powerHistories[deviceName].push(value);
		this.powerHistories[deviceName].shift();
	}
}