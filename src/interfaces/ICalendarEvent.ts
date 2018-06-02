export interface ICalendarEvent {
	start: Date;
	end: Date;
	summary: string;
	description: string;
	location: string;
	status:string;
	uid: string;
	sequence: string;
	calendarName: string;
	organizerName: string;
	organizerMail: string;
	repeating: ICalendarRepeatingFrequency;
}

export interface ICalendarRepeatingFrequency {
	freq: string;
	count: number;
	until: any;
	interval: string;
	wkst: string[];
	bymonth: any;
	bymonthday: any;
}