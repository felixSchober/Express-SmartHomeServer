export interface ICalendarEvent {
	start: Date,
	end: Date,
	summary: string,
	description: string,
	location: string,
	status:string,
	uid: string,
	sequence: string,
	calendarName: string
}