import {Moment} from 'moment';
import * as moment from 'moment';
import {IGraphValues} from "../../Interfaces/Dashboard/IGraphValues";


export class GraphStates {
	public historyStatesDictionary: { [p: string]: number[] };
	public historyStatesKeys: string[];
	public currentStates: number[];
	public timestamps: Moment[];

	private readonly historyUpdateEveryXSeconds: number;
	private readonly numberOfHistoryEntries: number;

	constructor(historyStatesKeys: string[], historyUpdateEveryXSeconds: number, numberOfHistoryEntries?: number) {
		this.historyStatesKeys = historyStatesKeys;
		this.numberOfHistoryEntries = numberOfHistoryEntries || 60 * 60 / historyUpdateEveryXSeconds;

		this.historyUpdateEveryXSeconds = historyUpdateEveryXSeconds;

		this.timestamps = this.generateInitialTimestamps();

		// create something like this: [0, 0, 0, 0, 0]
		this.currentStates = GraphStates.generateArrayWithNTimesX(this.historyStatesKeys.length, 0);

		this.historyStatesDictionary = {};
		for(const name of this.historyStatesKeys){
			this.historyStatesDictionary[name] = GraphStates.generateArrayWithNTimesX(this.numberOfHistoryEntries, 0);
		}
	}

	private generateInitialTimestamps(): Moment[] {
		const result: Moment[] = [];

		// generate the oldest entry first
		for(let i = this.numberOfHistoryEntries; i > 0; i--) {
			const secondsToSubtract = (i) * this.historyUpdateEveryXSeconds;
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
		const i = this.historyStatesKeys.indexOf(deviceName);

		if (i === -1) throw Error('Could not find device with name ' + deviceName);

		this.currentStates[i] = value;
		this.historyStatesDictionary[deviceName].push(value);
		this.historyStatesDictionary[deviceName].shift();
	}

	public formatForDashboard(deviceIndexName: string): IGraphValues {
		const powerHistoryValues = this.historyStatesDictionary[deviceIndexName];
		let timeStamps = this.timestamps;

		// convert timestamps to full iso strings
		const serializedTimestamps = [];
		for(const ts of timeStamps) {
			serializedTimestamps.push(ts.toISOString(true));
		}

		return {
			name: deviceIndexName,
			labels: serializedTimestamps,
			values: powerHistoryValues
		};
	}
}