import {RecurrenceRule, Range} from "node-schedule";

export class PollingIntervalRule {
	public hour: number | undefined;
	public minute: number | undefined;
	public second: number | undefined; // '*/' + second


	constructor(secondInterval?: number, minuteInterval?: number, hourInterval?: number) {
		this.hour = hourInterval;
		this.minute = minuteInterval;
		this.second = secondInterval;
	}

	public createScheduleRecurrenceRule(): RecurrenceRule {
		const rule = new RecurrenceRule();

		if (this.hour) {
			rule.hour = new Range(0,23, this.hour);
		}

		if (this.minute) {
			rule.minute = new Range(0,59, this.minute);
		}

		if (this.second) {
			rule.second = new Range(0, 59, this.second);
		}

		return rule;
	}

	public getSeconds(): number {
		if (this.second) {
			return this.second as number;
		}

		if (this.minute) {
			return (this.minute as number) * 60;
		}

		if (this.hour) {
			return (this.hour as number) * 60 * 60;
		}

		return Number.MAX_SAFE_INTEGER;
	}
}